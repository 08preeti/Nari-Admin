const Category = require('../models/Category');
const MainCategory = require('../models/MainCategory');
const SubCategory = require('../models/SubCategory');
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

const FIELDS = ['mainCategory', 'name', 'image', 'description', 'displayOrder', 'isActive'];

const ensureMainCategoryExists = async (id) => {
  const parent = await MainCategory.findById(id);
  if (!parent) throw new ApiError(400, 'mainCategory does not exist');
};

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = listFilter(req);
  if (typeof req.query.mainCategory === 'string') filter.mainCategory = req.query.mainCategory;

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    filter.name = new RegExp(escapeRegex(req.query.q.trim().slice(0, 100)), 'i');
  }

  const [items, total] = await Promise.all([
    Category.find(filter)
      .populate('mainCategory', 'name')
      .sort({ displayOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    Category.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await Category.findOne({ _id: req.params.id, ...visibilityFilter(req) }).populate(
    'mainCategory',
    'name'
  );
  if (!item) throw new ApiError(404, 'Category not found');
  sendSuccess(res, { data: item });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  await ensureMainCategoryExists(data.mainCategory);

  const item = await Category.create(data);
  sendSuccess(res, { statusCode: 201, message: 'Category created', data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await Category.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Category not found');

  const data = pick(req.body, FIELDS);
  if (data.mainCategory) {
    await ensureMainCategoryExists(data.mainCategory);
    if (String(data.mainCategory) !== String(item.mainCategory)) await assertCanMove('category', item._id, 'category');
  }

  item.set(data);
  await item.save();
  sendSuccess(res, { message: 'Category updated', data: item });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await Category.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Category not found');

  item.isActive = req.body.isActive;
  await item.save();
  sendSuccess(res, { message: `Category ${item.isActive ? 'activated' : 'archived'}`, data: item });
});

exports.bulkCreate = asyncHandler(async (req, res) => {
  const { mainCategory, items } = req.body;
  await ensureMainCategoryExists(mainCategory);

  const docs = items.map((item) => ({
    ...pick(item, ['name', 'image', 'description', 'displayOrder', 'isActive']),
    mainCategory,
  }));

  const existing = await Category.find({ mainCategory, name: { $in: docs.map((d) => d.name.trim()) } }).select('name');
  if (existing.length > 0) {
    throw new ApiError(
      409,
      'Some categories already exist here',
      existing.map((e) => ({ field: 'name', message: `"${e.name}" already exists` }))
    );
  }

  const created = await Category.insertMany(docs);
  sendSuccess(res, { statusCode: 201, message: `${created.length} categories created`, data: created });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await Category.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Category not found');
  await assertCanDelete('category', item._id, 'category', SubCategory, 'category');
  await item.deleteOne();
  sendSuccess(res, { message: 'Category deleted', data: { _id: item._id } });
});
