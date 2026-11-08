// End-to-end API tests against a REAL MongoDB. They are skipped unless TEST_MONGODB_URI is set.
//   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/the-nari-test npm test
// SAFETY: the database is wiped at the start, so its name must contain "test".
const test = require('node:test');
const assert = require('node:assert/strict');

const URI = process.env.TEST_MONGODB_URI;
const skip = !URI ? 'TEST_MONGODB_URI not set (needs a throwaway MongoDB database)' : false;

test('API integration', { skip }, async (t) => {
  if (!/test/i.test(URI.split('/').pop())) throw new Error('TEST_MONGODB_URI database name must contain "test"');
  process.env.MONGODB_URI = URI;
  process.env.JWT_SECRET = 'integration-test-secret-integration-test-secret';
  process.env.NODE_ENV = 'test';

  const mongoose = require('mongoose');
  const app = require('../src/app');
  const AdminUser = require('../src/models/AdminUser');
  const Product = require('../src/models/Product');
  const { hashPassword } = require('../src/services/authService');

  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  await AdminUser.create({ name: 'T', email: 'admin@test.local', passwordHash: await hashPassword('password123'), role: 'owner' });

  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let token;
  const call = async (method, path, body, auth = true) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: await res.json() };
  };

  t.after(async () => {
    server.close();
    await mongoose.disconnect();
  });

  await t.test('auth: login, bad password, protected routes', async () => {
    assert.equal((await call('POST', '/auth/login', { email: 'admin@test.local', password: 'nope' }, false)).status, 401);
    const ok = await call('POST', '/auth/login', { email: 'admin@test.local', password: 'password123' }, false);
    assert.equal(ok.status, 200);
    token = ok.body.data.token;
    assert.equal((await call('GET', '/auth/me')).body.data.email, 'admin@test.local');
    assert.equal((await call('GET', '/dashboard', null, false)).status, 401);
    assert.equal((await call('GET', '/customers', null, false)).status, 401);
  });

  let ids = {};
  await t.test('catalog hierarchy', async () => {
    const mc = await call('POST', '/main-categories', { name: 'Women', moduleType: 'readymade' });
    const c = await call('POST', '/categories', { name: 'Kurtis', mainCategory: mc.body.data._id });
    const sc = await call('POST', '/sub-categories', { name: 'Designer', category: c.body.data._id });
    ids = { mc: mc.body.data._id, c: c.body.data._id, sc: sc.body.data._id };
    const wrong = await call('POST', '/products', { mainCategory: ids.mc, category: ids.c, subCategory: ids.mc, name: 'x', sku: 'X', price: 1 });
    assert.equal(wrong.status, 400);
    assert.equal((await call('DELETE', `/main-categories/${ids.mc}`)).status, 409); // has children
  });

  let product;
  const payload = () => ({
    mainCategory: ids.mc,
    category: ids.c,
    subCategory: ids.sc,
    name: "Women's Designer Kurti",
    sku: 'NK-001',
    price: 1299,
    salePrice: 999,
    images: ['a', 'b', 'c', 'd', 'e'].map((x) => ({ url: `https://example.com/${x}.jpg`, alt: x })),
    sizes: ['S', 'M'],
    colorOptions: [{ name: 'Red', hex: '#FF0000' }, { name: 'Black', hex: '#000000' }],
    variants: [
      { sku: 'NK-001-RED-S', size: 'S', color: { name: 'Red', hex: '#FF0000' }, price: 1299, salePrice: 999, stock: 10 },
      { sku: 'NK-001-RED-M', size: 'M', color: { name: 'Red', hex: '#FF0000' }, price: 1299, salePrice: 999, stock: 5 },
      { sku: 'NK-001-BLK-S', size: 'S', color: { name: 'Black', hex: '#000000' }, price: 1499, salePrice: 1199, stock: 8 },
      { sku: 'NK-001-BLK-M', size: 'M', color: { name: 'Black', hex: '#000000' }, price: 1499, salePrice: 1199, stock: 0 },
    ],
  });

  await t.test('product: create, persist, SKU uniqueness, validation', async () => {
    const res = await call('POST', '/products', payload());
    assert.equal(res.status, 201);
    product = res.body.data;
    assert.equal(product.images.length, 5);
    assert.equal(product.variants.length, 4);
    assert.equal(product.totalStock, 23);
    assert.equal(product.stock, undefined); // no conflicting product-level stock

    const dupProduct = await call('POST', '/products', { ...payload(), sku: 'NK-001' });
    assert.equal(dupProduct.status, 409);
    const dupVariant = await call('POST', '/products', { ...payload(), sku: 'NK-002' }); // reuses NK-001-* variant SKUs
    assert.equal(dupVariant.status, 409);
    const badSale = await call('POST', '/products', { ...payload(), sku: 'NK-003', salePrice: 5000 });
    assert.equal(badSale.status, 400);

    const reload = await call('GET', `/products/${product._id}`);
    assert.equal(reload.body.data.variants[2].price, 1499);
  });

  await t.test('product: edit keeps existing data; stale form rejected; stocked variant not removable', async () => {
    const p = (await call('GET', `/products/${product._id}`)).body.data;
    const edit = await call('PUT', `/products/${product._id}`, { name: 'Renamed', version: p.__v });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.data.images.length, 5);
    assert.equal(edit.body.data.variants.length, 4);

    // a stale form that only edits non-stock fields is still fine...
    assert.equal((await call('PUT', `/products/${product._id}`, { name: 'Renamed', version: p.__v })).status, 200);
    // ...but a stale form that overwrites stock numbers is refused
    const staleStock = p.variants.map((v) => (v.sku === 'NK-001-RED-S' ? { ...v, stock: 99 } : v));
    assert.equal((await call('PUT', `/products/${product._id}`, { variants: staleStock, version: p.__v })).status, 409);

    const fresh = (await call('GET', `/products/${product._id}`)).body.data;
    const without = fresh.variants.filter((v) => v.sku !== 'NK-001-RED-S');
    assert.equal((await call('PUT', `/products/${product._id}`, { variants: without, version: fresh.__v })).status, 409);

    const v2 = fresh.variants.map((v) => (v.sku === 'NK-001-RED-M' ? { ...v, sku: 'NK-001-RED-M2', price: 1111, salePrice: undefined } : v));
    const upd = await call('PUT', `/products/${product._id}`, { variants: v2, version: fresh.__v });
    assert.equal(upd.status, 200);
    const m = upd.body.data.variants.find((v) => v.sku === 'NK-001-RED-M2');
    assert.equal(m.price, 1111);
    assert.equal(m.stock, 5); // stock preserved through SKU/price edit
    product = upd.body.data;
  });

  const order = (qty, sku = 'NK-001-RED-S', extra = {}) => ({
    customer: { name: 'Asha', mobile: '9876543210' },
    address: { line1: '1 MG Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    items: [{ productId: product._id, variantSku: sku, quantity: qty }],
    ...extra,
  });
  const stockOf = async (sku) => (await Product.findById(product._id)).variants.find((v) => v.sku === sku).stock;

  let orderDoc;
  await t.test('inventory: deduct, reject oversell, snapshot, unavailable variants', async () => {
    const res = await call('POST', '/readymade-orders', order(2), false);
    assert.equal(res.status, 201);
    assert.equal(res.body.data.orderTotal, 1998);
    assert.equal(await stockOf('NK-001-RED-S'), 8);

    assert.equal((await call('POST', '/readymade-orders', order(9), false)).status, 409);
    assert.equal(await stockOf('NK-001-RED-S'), 8);
    assert.equal((await call('POST', '/readymade-orders', order(1, 'NK-001-BLK-M'), false)).status, 409); // 0 stock

    // size/color selection (no SKU) resolves to the right variant
    const bySel = await call('POST', '/readymade-orders', { ...order(1), items: [{ productId: product._id, size: 'S', color: 'Black', quantity: 1 }] }, false);
    assert.equal(bySel.status, 201);
    const full = (await call('GET', `/readymade-orders/${bySel.body.data._id}`)).body.data;
    assert.equal(full.items[0].variant.sku, 'NK-001-BLK-S');
    assert.equal(full.items[0].unitPrice, 1199);
    assert.equal(full.items[0].regularPrice, 1499);

    orderDoc = (await call('GET', `/readymade-orders/${res.body.data._id}`)).body.data;
    assert.equal(orderDoc.items[0].variant.color.name, 'Red');
    assert.equal(orderDoc.items[0].lineTotal, 1998);
  });

  await t.test('order snapshots survive product edits', async () => {
    const p = (await call('GET', `/products/${product._id}`)).body.data;
    const v = p.variants.map((x) => (x.sku === 'NK-001-RED-S' ? { ...x, price: 5000, salePrice: undefined } : x));
    assert.equal((await call('PUT', `/products/${product._id}`, { name: 'Changed Name', variants: v, version: p.__v })).status, 200);
    const again = (await call('GET', `/readymade-orders/${orderDoc._id}`)).body.data;
    assert.equal(again.items[0].unitPrice, 999);
    assert.equal(again.items[0].productSnapshot.name, 'Renamed'); // name at purchase time, not 'Changed Name'
  });

  await t.test('concurrency: 10 simultaneous orders for 8 units sell exactly 8', async () => {
    const before = await stockOf('NK-001-RED-S');
    const results = await Promise.all(Array.from({ length: before + 2 }, () => call('POST', '/readymade-orders', order(1), false)));
    assert.equal(results.filter((r) => r.status === 201).length, before);
    assert.equal(results.filter((r) => r.status === 409).length, 2);
    assert.equal(await stockOf('NK-001-RED-S'), 0);
  });

  await t.test('cancel restores stock exactly once; repeating a status does not re-deduct', async () => {
    await call('POST', `/products/${product._id}/stock-adjustments`, { sku: 'NK-001-BLK-S', newStock: 10, reason: 'test' });
    const o = await call('POST', '/readymade-orders', order(3, 'NK-001-BLK-S'), false);
    assert.equal(await stockOf('NK-001-BLK-S'), 7);
    for (let i = 0; i < 3; i++) await call('PATCH', `/readymade-orders/${o.body.data._id}/status`, { status: 'Confirmed' });
    assert.equal(await stockOf('NK-001-BLK-S'), 7);
    await call('PATCH', `/readymade-orders/${o.body.data._id}/status`, { status: 'Cancelled' });
    await call('PATCH', `/readymade-orders/${o.body.data._id}/status`, { status: 'Cancelled' });
    assert.equal(await stockOf('NK-001-BLK-S'), 10);
    const reopen = await call('PATCH', `/readymade-orders/${o.body.data._id}/status`, { status: 'Processing' });
    assert.equal(reopen.status, 200);
    assert.equal(await stockOf('NK-001-BLK-S'), 7);
  });

  await t.test('stock adjustments never go negative and are logged', async () => {
    assert.equal((await call('POST', `/products/${product._id}/stock-adjustments`, { sku: 'NK-001-RED-S', delta: -1 })).status, 409);
    assert.equal((await call('POST', `/products/${product._id}/stock-adjustments`, { sku: 'NK-001-RED-S', delta: 4, reason: 'restock' })).status, 200);
    const hist = await call('GET', `/products/${product._id}/inventory-history?sku=NK-001-RED-S`);
    assert.ok(hist.body.data.length >= 3);
  });

  await t.test('payments: derive status, reject overpay, history', async () => {
    const list = await call('GET', '/payments/readymade?q=Asha');
    const target = list.body.data.find((o) => o.payment.totalAmount === 1998);
    const id = target._id;
    assert.equal((await call('PATCH', `/payments/readymade/${id}`, { paidAmount: 5000 })).status, 400);
    assert.equal((await call('PATCH', `/payments/readymade/${id}`, { paidAmount: -1 })).status, 400);
    const part = await call('PATCH', `/payments/readymade/${id}`, { paidAmount: 500, method: 'UPI' });
    assert.equal(part.body.data.payment.status, 'Partially Paid');
    assert.equal(part.body.data.payment.balance, 1498);
    assert.equal((await call('PATCH', `/payments/readymade/${id}`, { paidAmount: 500, status: 'Paid' })).status, 400);
    const paid = await call('PATCH', `/payments/readymade/${id}`, { status: 'Paid' });
    assert.equal(paid.body.data.payment.paidAmount, 1998);
    assert.equal(paid.body.data.payment.balance, 0);
    assert.equal(paid.body.data.payment.history.length, 2);
    assert.equal((await call('PATCH', `/payments/readymade/${id}`, { totalAmount: 10 })).status, 400); // readymade totals are fixed
  });

  await t.test('stitching: design, order, payment', async () => {
    const mc = await call('POST', '/main-categories', { name: 'Stitch', moduleType: 'stitching' });
    const c = await call('POST', '/categories', { name: 'Blouse', mainCategory: mc.body.data._id });
    const sc = await call('POST', '/sub-categories', { name: 'Boat neck', category: c.body.data._id });
    const wrongModule = await call('POST', '/designs', { mainCategory: ids.mc, category: ids.c, subCategory: ids.sc, name: 'D', referenceCode: 'd1' });
    assert.equal(wrongModule.status, 400);
    const d = await call('POST', '/designs', {
      mainCategory: mc.body.data._id, category: c.body.data._id, subCategory: sc.body.data._id,
      name: 'Boat blouse', referenceCode: 'bl-01', images: [{ url: 'https://example.com/1.jpg' }, { url: 'https://example.com/2.jpg' }, { url: '' }],
    });
    assert.equal(d.status, 201);
    assert.equal(d.body.data.images.length, 2);
    const so = await call('POST', '/stitching-orders', {
      customer: { name: 'Asha', mobile: '9876543210' }, designId: d.body.data._id,
      measurements: { bust: 36, waist: 30 }, deliveryDate: '2030-01-01',
    }, false);
    assert.equal(so.status, 201);
    const pay = await call('PATCH', `/payments/stitching/${so.body.data._id}`, { totalAmount: 1500, paidAmount: 500 });
    assert.equal(pay.body.data.payment.status, 'Partially Paid');
    assert.equal((await call('DELETE', `/designs/${d.body.data._id}`)).status, 409); // used by an order
  });

  await t.test('dashboard + customers use real data', async () => {
    const dash = (await call('GET', '/dashboard')).body.data;
    assert.equal(dash.products.totalProducts, 1);
    assert.equal(dash.products.totalVariants, 4);
    assert.ok(dash.orders.total >= 10);
    assert.ok(dash.revenue.collected >= 2000);
    assert.equal(dash.revenue.outstanding >= 0, true);
    const future = (await call('GET', '/dashboard?from=2099-01-01')).body.data;
    assert.equal(future.orders.total, 0);
    assert.deepEqual(future.trends, []);

    const customers = (await call('GET', '/customers')).body.data;
    assert.equal(customers.length, 1); // one mobile number -> one customer across both order types
    assert.ok(customers[0].readymadeOrders > 0 && customers[0].stitchingOrders === 1);
    assert.equal((await call('GET', '/customers/9876543210')).status, 200);
  });
});
