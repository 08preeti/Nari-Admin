const MainCategory = require('../models/MainCategory');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const ApiError = require('../utils/ApiError');
const { normalizeMobile, round2 } = require('../utils/helpers');

// Looks up the three picked catalogue records, checks they belong together and returns name snapshots.
const resolveCatalog = async ({ mainCategory, category, subCategory }) => {
  const [main, cat, sub] = await Promise.all([
    MainCategory.findById(mainCategory),
    Category.findById(category),
    SubCategory.findById(subCategory),
  ]);
  if (!main) throw new ApiError(400, 'Selected main category does not exist');
  if (!cat) throw new ApiError(400, 'Selected category does not exist');
  if (!sub) throw new ApiError(400, 'Selected subcategory does not exist');
  if (String(cat.mainCategory) !== String(main._id)) throw new ApiError(400, 'Category does not belong to the selected main category');
  if (String(sub.category) !== String(cat._id)) throw new ApiError(400, 'Subcategory does not belong to the selected category');
  return {
    mainCategory: { id: main._id, name: main.name },
    category: { id: cat._id, name: cat.name },
    subCategory: { id: sub._id, name: sub.name },
  };
};

// Turns the (already validated) request body of the basic order form into order fields.
const toBasicFields = async (body) => ({
  customer: { name: body.customerName.trim(), mobile: normalizeMobile(body.phone) },
  address: { line1: body.address.trim() },
  catalog: await resolveCatalog(body),
  receivedDate: new Date(body.receivedDate),
  deliveredDate: body.deliveredDate ? new Date(body.deliveredDate) : null,
  totalAmount: round2(body.totalAmount),
  paidAmount: round2(body.paidAmount),
});

// Writes the basic fields onto a (new or existing) stitching / readymade order document.
// Pending amount is never stored from the form: the model derives it as total - paid.
const applyBasicFields = (order, f, adminId) => {
  order.set('customer', f.customer);
  order.set('address.line1', f.address.line1);
  order.catalog = f.catalog;
  order.receivedDate = f.receivedDate;
  order.deliveredDate = f.deliveredDate;

  const prevPaid = order.payment.paidAmount || 0;
  order.payment.totalAmount = f.totalAmount;
  order.payment.paidAmount = f.paidAmount;
  if (f.paidAmount !== prevPaid) {
    order.payment.history.push({
      amount: round2(f.paidAmount - prevPaid),
      paidAmountAfter: f.paidAmount,
      note: 'Entered from the order form',
      by: adminId,
      at: new Date(),
    });
    order.payment.lastUpdatedAt = new Date();
    order.payment.lastUpdatedBy = adminId;
  }
  if (order.schema.path('orderTotal')) order.orderTotal = f.totalAmount; // readymade orders

  // A delivered date means the order has been delivered.
  if (f.deliveredDate && order.status !== 'Delivered') {
    order.status = 'Delivered';
    order.statusHistory.push({ status: 'Delivered', note: 'Delivered date recorded', changedBy: adminId });
  }
};

module.exports = { toBasicFields, applyBasicFields };
