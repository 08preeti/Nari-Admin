const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const { assertCanMove, assertCanDelete } = require('../services/catalogService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const {
  getPagination,
  paginationMeta,
  pick,
  listFilter,
  visibilityFilter,
  escapeRegex,
} = require('../utils/helpers');

const FIELDS = ['category', 'name', 'image', 'price', 'description', 'displayOrder', 'isActive'];

const ensureCategoryExists = async (id) => {
  const parent = await Category.findById(id);
  if (!parent) throw new ApiError(400, 'category does not exist');
};

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = listFilter(req);
  if (typeof req.query.category === 'string') {
    filter.category = req.query.category;
  } else if (typeof req.query.mainCategory === 'string') {
    const categoryIds = await Category.find({ mainCategory: req.query.mainCategory }).distinct('_id');
    filter.category = { $in: categoryIds };
  }

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    filter.name = new RegExp(escapeRegex(req.query.q.trim().slice(0, 100)), 'i');
  }

  const [items, total] = await Promise.all([
    SubCategory.find(filter)
      .populate('category', 'name')
      .sort({ displayOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    SubCategory.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await SubCategory.findOne({ _id: req.params.id, ...visibilityFilter(req) }).populate(
    'category',
    'name'
  );
  if (!item) throw new ApiError(404, 'Sub-category not found');
  sendSuccess(res, { data: item });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  await ensureCategoryExists(data.category);

  const item = await SubCategory.create(data);
  sendSuccess(res, { statusCode: 201, message: 'Sub-category created', data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await SubCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Sub-category not found');

  const data = pick(req.body, FIELDS);
  if (data.category) {
    await ensureCategoryExists(data.category);
    if (String(data.category) !== String(item.category)) await assertCanMove('subCategory', item._id, 'sub-category');
  }

  item.set(data);
  await item.save();
  sendSuccess(res, { message: 'Sub-category updated', data: item });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await SubCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Sub-category not found');

  item.isActive = req.body.isActive;
  await item.save();
  sendSuccess(res, { message: `Sub-category ${item.isActive ? 'activated' : 'archived'}`, data: item });
});

exports.bulkCreate = asyncHandler(async (req, res) => {
  const { category, items } = req.body;
  await ensureCategoryExists(category);

  const docs = items.map((item) => ({
    ...pick(item, ['name', 'image', 'price', 'description', 'displayOrder', 'isActive']),
    category,
  }));

  const existing = await SubCategory.find({ category, name: { $in: docs.map((d) => d.name.trim()) } }).select('name');
  if (existing.length > 0) {
    throw new ApiError(
      409,
      'Some sub-categories already exist here',
      existing.map((e) => ({ field: 'name', message: `"${e.name}" already exists` }))
    );
  }

  const created = await SubCategory.insertMany(docs);
  sendSuccess(res, { statusCode: 201, message: `${created.length} sub-categories created`, data: created });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await SubCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Sub-category not found');
  await assertCanDelete('subCategory', item._id, 'sub-category');
  await item.deleteOne();
  sendSuccess(res, { message: 'Sub-category deleted', data: { _id: item._id } });
});
