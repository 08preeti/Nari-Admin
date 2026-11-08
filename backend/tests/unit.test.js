// Dependency-free unit tests (pure logic). Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const pricing = require('../src/utils/pricing');
const {
  normalizeProductBody,
  missingCombinations,
  reconcileVariants,
  checkVariantOptions,
  buildVariantSku,
  canonicalSize,
  hasStockEdits,
} = require('../src/services/variantService');
const { validateProduct, validateStockAdjustment } = require('../src/validators/product.validator');
const { validatePaymentUpdate } = require('../src/validators/payment.validator');
const { validateReadymadeOrderCreate } = require('../src/validators/order.validator');
const { buildOrderFilter } = require('../src/utils/orderFilters');
const { escapeRegex, normalizeMobile, parseDateRange } = require('../src/utils/helpers');

const ID = 'a'.repeat(24);
const baseProduct = () => ({ mainCategory: ID, category: ID, subCategory: ID, name: 'Kurti', sku: 'nk-001', price: 1299 });

test('pricing: selling price, discount, validation', () => {
  assert.equal(pricing.sellingPrice(1299, 999), 999);
  assert.equal(pricing.sellingPrice(1299, undefined), 1299);
  assert.equal(pricing.sellingPrice(1299, 0), 1299);
  assert.equal(pricing.sellingPrice(1000, 1000), 1000);
  assert.equal(pricing.discountPercent(1000, 750), 25);
  assert.equal(pricing.discountAmount(1299, 999), 300);
  assert.deepEqual(pricing.checkPricePair(100, 50), []);
  assert.equal(pricing.checkPricePair(-1)[0], 'price must be a number, 0 or more');
  assert.match(pricing.checkPricePair(100, 150)[0], /cannot exceed/);
});

test('sizes: canonical casing and dedupe', () => {
  assert.equal(canonicalSize('xl'), 'XL');
  assert.equal(canonicalSize('free   size'), 'Free Size');
  assert.equal(canonicalSize('Petite 6'), 'Petite 6');
  const b = normalizeProductBody({ sizes: ['s', 'S', ' M ', '', 'Petite'] });
  assert.deepEqual(b.sizes, ['S', 'M', 'Petite']);
});

test('images: blank rows dropped, urls trimmed, invalid urls rejected', () => {
  const b = { ...baseProduct(), images: [{ url: ' https://x.com/a.jpg ', alt: ' Front ' }, { url: '' }, { url: '   ' }] };
  assert.deepEqual(validateProduct(b), []);
  assert.deepEqual(b.images, [{ url: 'https://x.com/a.jpg', alt: 'Front' }]);
  const bad = { ...baseProduct(), images: [{ url: 'javascript:alert(1)' }, { url: 'not a url' }] };
  assert.equal(validateProduct(bad).length, 2);
});

test('legacy colors strings become colorOptions; hex normalised and validated', () => {
  const b = normalizeProductBody({ colors: ['Red', 'red', 'Blue'] });
  assert.deepEqual(b.colorOptions.map((c) => c.name), ['Red', 'Blue']);
  assert.equal(b.colors, undefined);
  const ok = { ...baseProduct(), colorOptions: [{ name: 'Red', hex: '#ff0000' }] };
  assert.deepEqual(validateProduct(ok), []);
  assert.equal(ok.colorOptions[0].hex, '#FF0000');
  assert.equal(validateProduct({ ...baseProduct(), colorOptions: [{ name: 'Red', hex: 'red' }] }).length, 1);
});

test('product validation: sale price, negatives, required sku on create', () => {
  assert.equal(validateProduct({ ...baseProduct(), price: -5 })[0].field, 'price');
  assert.match(validateProduct({ ...baseProduct(), salePrice: 5000 })[0].message, /cannot exceed/);
  assert.deepEqual(validateProduct({ ...baseProduct(), salePrice: 999 }), []);
  const noSku = baseProduct();
  delete noSku.sku;
  assert.equal(validateProduct(noSku)[0].field, 'sku');
  assert.deepEqual(validateProduct({ name: 'x' }, { isUpdate: true }), []);
});

test('variant validation: duplicates, stock, price', () => {
  const v = (o) => ({ sku: 'A-1', size: 'S', color: { name: 'Red' }, price: 100, stock: 1, ...o });
  const errs = (variants) => validateProduct({ ...baseProduct(), variants });
  assert.deepEqual(errs([v({})]), []);
  assert.ok(errs([v({}), v({ size: 'M' })]).some((e) => /duplicate SKU/.test(e.message)));
  assert.ok(errs([v({}), v({ sku: 'A-2' })]).some((e) => /duplicate size\/color/.test(e.message)));
  assert.ok(errs([v({ stock: -1 })]).some((e) => e.field.endsWith('stock')));
  assert.ok(errs([v({ stock: 1.5 })]).some((e) => e.field.endsWith('stock')));
  assert.ok(errs([v({ price: 100, salePrice: 200 })]).some((e) => /cannot exceed/.test(e.message)));
  assert.ok(errs([v({ price: -1 })]).length > 0);
  // stock not allowed at product level when variants are sent
  assert.ok(validateProduct({ ...baseProduct(), stock: 5, variants: [v({})] }).some((e) => e.field === 'stock'));
});

test('generate combinations: 4 sizes x 3 colors = 12, no duplicates, never overwrites', () => {
  const sizes = ['S', 'M', 'L', 'XL'];
  const colorOptions = [{ name: 'Red' }, { name: 'Black' }, { name: 'Blue' }];
  const all = missingCombinations({ sizes, colorOptions, variants: [] });
  assert.equal(all.length, 12);
  const existing = [{ size: 'S', color: { name: 'red' }, sku: 'X', stock: 9 }];
  const more = missingCombinations({ sizes, colorOptions, variants: existing });
  assert.equal(more.length, 11);
  assert.ok(!more.some((c) => c.size === 'S' && c.color.name === 'Red'));
  assert.equal(missingCombinations({ sizes: ['S'], colorOptions: [], variants: [] }).length, 1);
  assert.equal(missingCombinations({ sizes: [], colorOptions: [], variants: [] }).length, 0);
  assert.equal(buildVariantSku('NK-001', 'M', 'Red'), 'NK-001-RED-M');
});

test('reconcile: keeps ids and stock, blocks silent removal of stocked variants', () => {
  const existing = [
    { _id: 'id1', sku: 'A-RED-S', stock: 10 },
    { _id: 'id2', sku: 'A-RED-M', stock: 0 },
    { _id: 'id3', sku: 'A-BLK-S', stock: 4 },
  ];
  // matching by id keeps _id; omitted stock keeps stored stock
  let r = reconcileVariants(existing, [{ _id: 'id1', sku: 'A-RED-S', price: 1 }, { sku: 'A-BLK-S', price: 1 }]);
  assert.equal(r.errors.length, 0); // id2 has 0 stock -> may be dropped
  assert.equal(r.variants[0]._id, 'id1');
  assert.equal(r.variants[0].stock, 10);
  assert.equal(r.variants[1]._id, 'id3');
  assert.equal(r.variants[1].stock, 4);
  // dropping a variant that still has stock is refused
  r = reconcileVariants(existing, [{ _id: 'id1', sku: 'A-RED-S' }, { _id: 'id2', sku: 'A-RED-M' }]);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0].message, /A-BLK-S still has 4/);
  // new variant never trusts a supplied _id and defaults stock to 0 (never invented)
  r = reconcileVariants([], [{ _id: 'zzz', sku: 'N-1' }]);
  assert.equal(r.variants[0]._id, undefined);
  assert.equal(r.variants[0].stock, 0);
  // SKU edit of an existing variant (matched by id) is allowed
  r = reconcileVariants(existing.slice(0, 1), [{ _id: 'id1', sku: 'A-RED-S-NEW', stock: 7 }]);
  assert.equal(r.variants[0]._id, 'id1');
  assert.equal(r.variants[0].stock, 7);
  assert.equal(r.errors.length, 0);
});

test('variants must use the product sizes/colors', () => {
  const sizes = ['S', 'M'];
  const colors = [{ name: 'Red' }];
  assert.deepEqual(checkVariantOptions(sizes, colors, [{ size: 'S', color: { name: 'red' } }]), []);
  assert.equal(checkVariantOptions(sizes, colors, [{ size: 'XL', color: { name: 'Red' } }]).length, 1);
  assert.equal(checkVariantOptions(sizes, colors, [{ size: 'S', color: { name: 'Green' } }]).length, 1);
  assert.equal(checkVariantOptions(sizes, colors, [{ size: 'S' }]).length, 1);
  assert.equal(checkVariantOptions([], [], [{}]).length, 1);
});

test('stock adjustment validation', () => {
  assert.deepEqual(validateStockAdjustment({ sku: 'A', delta: -2 }), []);
  assert.deepEqual(validateStockAdjustment({ sku: 'A', newStock: 0 }), []);
  assert.ok(validateStockAdjustment({ sku: 'A' }).length > 0);
  assert.ok(validateStockAdjustment({ sku: 'A', delta: 1, newStock: 1 }).length > 0);
  assert.ok(validateStockAdjustment({ sku: 'A', newStock: -1 }).length > 0);
  assert.ok(validateStockAdjustment({ sku: 'A', delta: 0 }).length > 0);
});

test('payment validation', () => {
  assert.ok(validatePaymentUpdate({}).length > 0);
  assert.ok(validatePaymentUpdate({ paidAmount: -1 }).length > 0);
  assert.deepEqual(validatePaymentUpdate({ paidAmount: 100, method: 'UPI' }), []);
});

test('readymade order validation accepts variantSku, size, color', () => {
  const body = {
    customer: { name: 'A', mobile: '9876543210' },
    address: { line1: 'x', city: 'Pune', state: 'MH', pincode: '411001' },
    items: [{ productId: ID, variantSku: 'NK-001-RED-M', size: 'M', color: 'Red', quantity: 2 }],
  };
  assert.deepEqual(validateReadymadeOrderCreate(body), []);
  body.items[0].quantity = 0;
  assert.ok(validateReadymadeOrderCreate(body).length > 0);
});

test('order filters: search escaping, status, date range', () => {
  const f = buildOrderFilter({ q: 'a.b(', status: 'New', paymentStatus: 'Paid', from: '2026-01-01', to: '2026-01-31' }, { statuses: ['New'], paymentStatuses: ['Paid'] });
  assert.equal(f.status, 'New');
  assert.equal(f['payment.status'], 'Paid');
  assert.ok(f.$or[0].orderId.test('xxA.B(')); // literal match, regex metacharacters escaped
  assert.ok(!f.$or[0].orderId.test('axb('));
  assert.ok(f.createdAt.$lte.getUTCHours() === 23); // `to` is inclusive of the whole day
  assert.deepEqual(buildOrderFilter({ status: 'Bogus' }, { statuses: ['New'] }), {});
  assert.equal(escapeRegex('a+b'), 'a\\+b');
  assert.equal(normalizeMobile('+91 98765-43210'), '9876543210');
  assert.deepEqual(parseDateRange({ from: 'garbage' }), {});
});

test('hasStockEdits only flags stock values that differ from stored stock', () => {
  const existing = [{ _id: 'i1', sku: 'A', stock: 10 }, { _id: 'i2', sku: 'B', stock: 3 }];
  assert.equal(hasStockEdits(existing, [{ _id: 'i1', sku: 'A' }, { sku: 'B' }]), false); // stock omitted
  assert.equal(hasStockEdits(existing, [{ _id: 'i1', sku: 'A', stock: 10 }]), false); // unchanged
  assert.equal(hasStockEdits(existing, [{ _id: 'i1', sku: 'A', stock: 9 }]), true);
  assert.equal(hasStockEdits(existing, [{ sku: 'NEW', stock: 4 }]), false); // brand-new variant
  assert.equal(hasStockEdits([], undefined, 5, 7), true); // legacy stock edit
  assert.equal(hasStockEdits([], undefined, 5, undefined), false);
});
