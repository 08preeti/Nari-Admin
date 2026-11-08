const Design = require('../models/Design');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { checkHierarchy, designInUse } = require('../services/catalogService');
const {
  getPagination,
  paginationMeta,
  pick,
  listFilter,
  visibilityFilter,
  escapeRegex,
} = require('../utils/helpers');

const FIELDS = [
  'mainCategory',
  'category',
  'subCategory',
  'name',
  'referenceCode',
  'description',
  'images',
  'displayOrder',
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

  if (typeof req.query.q === 'string' && req.query.q.trim()) {
    const rx = new RegExp(escapeRegex(req.query.q.trim().slice(0, 100)), 'i');
    filter.$or = [{ name: rx }, { referenceCode: rx }];
  }

  const [items, total] = await Promise.all([
    populateParents(Design.find(filter).sort({ displayOrder: 1, name: 1 }).skip(skip).limit(limit)),
    Design.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await populateParents(Design.findOne({ _id: req.params.id, ...visibilityFilter(req) }));
  if (!item) throw new ApiError(404, 'Design not found');
  sendSuccess(res, { data: item });
});

exports.create = asyncHandler(async (req, res) => {
  const data = pick(req.body, FIELDS);
  await checkHierarchy(data, 'stitching');

  const item = await Design.create(data);
  sendSuccess(res, { statusCode: 201, message: 'Design created', data: item });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await Design.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Design not found');

  item.set(pick(req.body, FIELDS));
  await checkHierarchy(item, 'stitching');
  await item.save();
  sendSuccess(res, { message: 'Design updated', data: item });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await Design.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Design not found');

  item.isActive = req.body.isActive;
  await item.save();
  sendSuccess(res, { message: `Design ${item.isActive ? 'activated' : 'archived'}`, data: item });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await Design.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Design not found');
  if (await designInUse(item._id)) {
    throw new ApiError(409, 'This design appears in stitching orders and cannot be deleted. Archive it instead.');
  }
  await item.deleteOne();
  sendSuccess(res, { message: 'Design deleted', data: { _id: item._id } });
});
