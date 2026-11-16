const MainCategory = require("../models/MainCategory");
const Category = require("../models/Category");
const { assertCanDelete } = require("../services/catalogService");
const ApiError = require("../utils/ApiError");
const { MODULE_TYPES } = require("../utils/constants");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const {
  publicPath,
  removeUploadedFile,
  removeStoredImage,
} = require("../middleware/upload");
const {
  getPagination,
  paginationMeta,
  pick,
  listFilter,
  visibilityFilter,
  escapeRegex,
} = require("../utils/helpers");

const FIELDS = ["name", "image", "description", "displayOrder", "isActive"];
const CREATE_FIELDS = [...FIELDS, "moduleType"];

exports.getAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const filter = listFilter(req);
  if (MODULE_TYPES.includes(req.query.moduleType))
    filter.moduleType = req.query.moduleType;

  if (typeof req.query.q === "string" && req.query.q.trim()) {
    filter.name = new RegExp(
      escapeRegex(req.query.q.trim().slice(0, 100)),
      "i",
    );
  }

  const [items, total] = await Promise.all([
    MainCategory.find(filter)
      .sort({ displayOrder: 1, name: 1 })
      .skip(skip)
      .limit(limit),
    MainCategory.countDocuments(filter),
  ]);

  sendSuccess(res, { data: items, meta: paginationMeta(total, page, limit) });
});

exports.getOne = asyncHandler(async (req, res) => {
  const item = await MainCategory.findOne({
    _id: req.params.id,
    ...visibilityFilter(req),
  });
  if (!item) throw new ApiError(404, "Main category not found");
  sendSuccess(res, { data: item });
});

// The admin form uploads the image as a file (multipart field "image"); JSON bodies with image.url still work.
const withUploadedImage = (req, data) => {
  if (req.file)
    data.image = { url: publicPath("main-categories", req.file.filename) };
  return data;
};

exports.create = asyncHandler(async (req, res) => {
  let item;
  try {
    item = await MainCategory.create(
      withUploadedImage(req, pick(req.body, CREATE_FIELDS)),
    );
  } catch (err) {
    if (req.file) removeUploadedFile(req.file.path);
    throw err;
  }
  sendSuccess(res, {
    statusCode: 201,
    message: "Main category created",
    data: item,
  });
});

exports.update = asyncHandler(async (req, res) => {
  const item = await MainCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, "Main category not found");

  const previousImage = item.image?.url;
  item.set(withUploadedImage(req, pick(req.body, FIELDS)));
  try {
    await item.save();
  } catch (err) {
    if (req.file) removeUploadedFile(req.file.path);
    throw err;
  }
  if (req.file && previousImage && previousImage !== item.image?.url)
    removeStoredImage(previousImage);
  sendSuccess(res, { message: "Main category updated", data: item });
});

exports.setStatus = asyncHandler(async (req, res) => {
  const item = await MainCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, "Main category not found");

  item.isActive = req.body.isActive;
  await item.save();
  sendSuccess(res, {
    message: `Main category ${item.isActive ? "activated" : "archived"}`,
    data: item,
  });
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await MainCategory.findById(req.params.id);
  if (!item) throw new ApiError(404, "Main category not found");
  await assertCanDelete(
    "mainCategory",
    item._id,
    "main category",
    Category,
    "mainCategory",
  );
  await item.deleteOne();
  removeStoredImage(item.image?.url);
  sendSuccess(res, {
    message: "Main category deleted",
    data: { _id: item._id },
  });
});
