import test from 'node:test';
import assert from 'node:assert/strict';
import {
  blankProductForm, buildVariantSku, comboKey, formToPayload, generateVariants, missingCombinations,
  productToForm, stockedVariants, validateForm, variantStats, variantsUsing,
} from '../src/utils/variants.js';
import { discountPercent, sellingPrice } from '../src/utils/pricing.js';
import { toQuery } from '../src/utils/query.js';

const sizes = ['S', 'M', 'L', 'XL'];
const colors = [{ name: 'Red', hex: '#FF0000' }, { name: 'Black', hex: '#000000' }, { name: 'Blue', hex: '#0000FF' }];

test('4 sizes x 3 colors generates 12 unique variants with sensible SKUs', () => {
  const { variants, addedCount } = generateVariants({ productSku: 'nk-001', sizes, colors, variants: [], price: 1299, salePrice: 999 });
  assert.equal(addedCount, 12);
  assert.equal(new Set(variants.map((v) => v.sku)).size, 12);
  assert.ok(variants.some((v) => v.sku === 'NK-001-RED-S'));
  assert.ok(variants.every((v) => v.stock === 0 && v.price === 1299 && v.salePrice === 999));
  assert.equal(buildVariantSku('NK-001', 'M', 'Black'), 'NK-001-BLACK-M');
});

test('generating again never duplicates or overwrites edited variants', () => {
  let { variants } = generateVariants({ productSku: 'NK-001', sizes: ['S', 'M'], colors: colors.slice(0, 2), variants: [], price: 10, salePrice: '' });
  variants[0] = { ...variants[0], sku: 'CUSTOM-SKU', price: 777, stock: 42 };
  const again = generateVariants({ productSku: 'NK-001', sizes: ['S', 'M', 'L'], colors: colors.slice(0, 2), variants, price: 10, salePrice: '' });
  assert.equal(again.addedCount, 2); // only the two new L combinations
  assert.equal(again.variants.length, 6);
  assert.equal(again.variants[0].sku, 'CUSTOM-SKU');
  assert.equal(again.variants[0].stock, 42);
  assert.equal(generateVariants({ productSku: 'NK-001', sizes: ['S', 'M', 'L'], colors: colors.slice(0, 2), variants: again.variants, price: 10, salePrice: '' }).addedCount, 0);
});

test('SKU collisions get a numeric suffix', () => {
  const existing = [{ key: 'x', sku: 'NK-001-RED-S', size: 'XS', color: { name: 'Zed' }, stock: 0 }];
  const { variants } = generateVariants({ productSku: 'NK-001', sizes: ['S'], colors: [colors[0]], variants: existing, price: 1, salePrice: '' });
  assert.equal(variants[1].sku, 'NK-001-RED-S-2');
});

test('removal helpers find dependent variants and those holding stock', () => {
  const { variants } = generateVariants({ productSku: 'A', sizes: ['S', 'M'], colors: colors.slice(0, 2), variants: [], price: 1, salePrice: '' });
  variants.find((v) => v.size === 'S' && v.color.name === 'Red').stock = 3;
  const usingS = variantsUsing(variants, { size: 'S' });
  assert.equal(usingS.length, 2);
  assert.equal(stockedVariants(usingS).length, 1);
  assert.equal(variantsUsing(variants, { colorName: 'black' }).length, 2);
});

test('stats count only active variants', () => {
  const stats = variantStats([{ isActive: true, stock: 5 }, { isActive: true, stock: 0 }, { isActive: false, stock: 100 }]);
  assert.deepEqual(stats, { total: 3, active: 2, stock: 5, outOfStock: 1 });
});

test('combo keys are case-insensitive', () => {
  assert.equal(comboKey('S', 'Red'), comboKey(' s ', 'RED'));
  assert.equal(missingCombinations({ sizes: ['S'], colors: [], variants: [] }).length, 1);
  assert.equal(missingCombinations({ sizes: [], colors: [], variants: [] }).length, 0);
});

const validForm = () => ({
  ...blankProductForm(), mainCategory: 'a', category: 'b', subCategory: 'c', name: 'Kurti', sku: 'NK-001', price: 1299,
});

test('form validation: required fields, bad image URL, sale price, duplicate SKU, negative stock', () => {
  assert.equal(validateForm(validForm()).valid, true);
  assert.equal(validateForm({ ...validForm(), name: '' }).errors.name !== undefined, true);
  const badImg = validateForm({ ...validForm(), images: [{ key: '1', url: 'nope', alt: '' }] });
  assert.ok(badImg.errors['image-0']);
  const blank = validateForm({ ...validForm(), images: [{ key: '1', url: '', alt: '' }] }); // empty row is simply ignored
  assert.equal(blank.valid, true);
  assert.ok(validateForm({ ...validForm(), salePrice: 5000 }).errors.salePrice);
  const dup = validateForm({ ...validForm(), variants: [
    { key: 'a', sku: 'X', price: 1, salePrice: '', stock: 1 }, { key: 'b', sku: 'x', price: 1, salePrice: '', stock: -2 }] });
  assert.ok(dup.errors['v-b-sku']);
  assert.ok(dup.errors['v-b-stock']);
  assert.equal(dup.section.variants, 2);
});

test('legacy stock must be split exactly across variants (or explicitly reset)', () => {
  const f = { ...validForm(), legacyStock: 10, variants: [{ key: 'a', sku: 'A', price: 1, salePrice: '', stock: 4, isActive: true }] };
  assert.ok(validateForm(f).errors.legacyStock);
  f.variants[0].stock = 10;
  assert.equal(validateForm(f).valid, true);
  f.variants[0].stock = 1;
  assert.equal(validateForm({ ...f, acknowledgeLegacyStockReset: true }).valid, true);
});

test('payload: blank images dropped, unchanged stock omitted for existing variants, version sent on edit', () => {
  const product = {
    _id: 'p1', __v: 7, name: 'K', sku: 'NK', price: 100, mainCategory: { _id: 'm' }, category: { _id: 'c' }, subCategory: { _id: 's' },
    images: [{ url: 'https://x.com/1.jpg', alt: 'Front' }], sizes: ['S'], colorOptions: [{ name: 'Red', hex: '#FF0000' }],
    variants: [{ _id: 'v1', sku: 'NK-RED-S', size: 'S', color: { name: 'Red', hex: '#FF0000' }, price: 100, stock: 8, isActive: true }],
  };
  const form = productToForm(product);
  assert.equal(form.images.length, 1);
  assert.equal(form.mainCategory, 'm');
  form.images.push({ key: 'z', url: '  ', alt: '' });
  let payload = formToPayload(form);
  assert.equal(payload.images.length, 1);
  assert.equal(payload.version, 7);
  assert.equal('stock' in payload.variants[0], false); // untouched stock is never re-sent
  assert.equal(payload.variants[0]._id, 'v1');
  form.variants[0].stock = 12;
  payload = formToPayload(form);
  assert.equal(payload.variants[0].stock, 12);
  const newForm = { ...validForm(), variants: [{ key: 'n', sku: 'n-1', size: 'S', color: null, price: 5, salePrice: '', stock: 0, isActive: true, images: [] }] };
  const np = formToPayload(newForm);
  assert.equal(np.variants[0].stock, 0);
  assert.equal('version' in np, false);
  assert.equal(np.salePrice, null);
});

test('legacy product (no variants) round-trips with simple stock', () => {
  const form = productToForm({ _id: 'p', __v: 0, name: 'Old', price: 10, stock: 6, colors: ['Red', 'Blue'], sizes: ['M'], images: [], mainCategory: 'm', category: 'c', subCategory: 's' });
  assert.equal(form.simpleStock, 6);
  assert.equal(form.colors.length, 2);
  assert.equal(form.images.length, 1); // one blank input is always available
  assert.equal('stock' in formToPayload(form), false); // unchanged legacy stock is not re-sent
  form.simpleStock = 9;
  assert.equal(formToPayload(form).stock, 9);
});

test('display pricing helpers and query builder', () => {
  assert.equal(sellingPrice(1299, 999), 999);
  assert.equal(discountPercent(1000, 800), 20);
  assert.equal(toQuery({ a: 1, b: '', c: undefined, d: 'x y' }), '?a=1&d=x+y');
});
