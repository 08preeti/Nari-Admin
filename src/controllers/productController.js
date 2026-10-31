const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { checkHierarchy } = require('../services/catalogService');
const {
  getPagination,
  paginationMeta,
  pick,
  listFilter,
  visibilityFilter,
} = require('../utils/helpers');

const FIELDS = [
  'mainCategory',
  'category',
  'subCategory',
  'name',
  'sku',
  'description',
  'images',
  'price',
  'sizes',
  'colors',
  'stock',
  'isActive',
];

const populateParents = (query) =>
  query
    .populate('mainCategory', 'name moduleType')
    .populate('category', 'name')
    .populate('subCategory', 'name');

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = listFilter(req);
  ['mainCategory', 'category', 'subCategory'].forEach((key) => {
    if (typeof req.query[key] === 'string') filter[key] = req.query[key];
  });

  const [items, total] = await Promise.all([
    populateParents(Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Product.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await populateParents(Product.findOne({ _id: req.params.id, ...visibilityFilter(req) }));
  if (!item) throw new ApiError(404, 'Product not found');
  sendSuccess(res, { data: item });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  await checkHierarchy(data, 'readymade');

  const item = await Product.create(data);
  sendSuccess(res, { statusCode: 201, message: 'Product created', data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Product not found');

  item.set(pick(req.body, FIELDS));
  await checkHierarchy(item, 'readymade');
  await item.save();
  sendSuccess(res, { message: 'Product updated', data: item });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await Product.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Product not found');

  item.isActive = req.body.isActive;
  await item.save();
  sendSuccess(res, { message: `Product ${item.isActive ? 'activated' : 'archived'}`, data: item });
});
