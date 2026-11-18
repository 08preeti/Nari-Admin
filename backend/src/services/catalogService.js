const MainCategory = require("../models/MainCategory");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const ApiError = require("../utils/ApiError");

const checkHierarchy = async ({ mainCategory, category, subCategory }) => {
  const mainCategoryDoc = await MainCategory.findById(mainCategory);
  if (!mainCategoryDoc) throw new ApiError(400, "mainCategory does not exist");

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) throw new ApiError(400, "category does not exist");
  if (String(categoryDoc.mainCategory) !== String(mainCategory)) {
    throw new ApiError(
      400,
      "category does not belong to the selected mainCategory",
    );
  }

  const subCategoryDoc = await SubCategory.findById(subCategory);
  if (!subCategoryDoc) throw new ApiError(400, "subCategory does not exist");
  if (String(subCategoryDoc.category) !== String(category)) {
    throw new ApiError(
      400,
      "subCategory does not belong to the selected category",
    );
  }
};

module.exports = { checkHierarchy };

const Product = require("../models/Product");
const Design = require("../models/Design");
const StitchingOrder = require("../models/StitchingOrder");

const countUsage = async (field, id) => {
  const [products, designs] = await Promise.all([
    Product.countDocuments({ [field]: id }),
    Design.countDocuments({ [field]: id }),
  ]);
  return { products, designs, total: products + designs };
};

const usageMessage = (usage) =>
  `${usage.products} product(s) and ${usage.designs} design(s)`;

const assertCanMove = async (field, id, label) => {
  const usage = await countUsage(field, id);
  if (usage.total > 0) {
    throw new ApiError(
      409,
      `This ${label} is used by ${usageMessage(usage)}, so it cannot be moved to a different parent.`,
    );
  }
};

const assertCanDelete = async (field, id, label, childModel, childField) => {
  if (childModel) {
    const children = await childModel.countDocuments({ [childField]: id });
    if (children > 0)
      throw new ApiError(
        409,
        `This ${label} still has ${children} child record(s). Remove or move them first.`,
      );
  }
  const usage = await countUsage(field, id);
  if (usage.total > 0) {
    throw new ApiError(
      409,
      `This ${label} is used by ${usageMessage(usage)}. Delete or move those products/designs first.`,
    );
  }
};

const designInUse = (id) => StitchingOrder.exists({ design: id });

const { removeStoredImage } = require("../middleware/upload");

const deleteSubCategoriesOf = async (categoryIds) => {
  const subs = await SubCategory.find({
    category: { $in: categoryIds },
  }).select("image");
  await SubCategory.deleteMany({ category: { $in: categoryIds } });
  subs.forEach((s) => removeStoredImage(s.image?.url));
  return subs.length;
};

const deleteCategoryWithChildren = async (category) => {
  const subCategories = await deleteSubCategoriesOf([category._id]);
  await category.deleteOne();
  removeStoredImage(category.image?.url);
  return { categories: 1, subCategories };
};

const deleteMainCategoryWithChildren = async (main) => {
  const cats = await Category.find({ mainCategory: main._id }).select("image");
  const subCategories = await deleteSubCategoriesOf(cats.map((c) => c._id));
  await Category.deleteMany({ mainCategory: main._id });
  cats.forEach((c) => removeStoredImage(c.image?.url));
  await main.deleteOne();
  removeStoredImage(main.image?.url);
  return { categories: cats.length, subCategories };
};

module.exports.assertCanMove = assertCanMove;
module.exports.deleteCategoryWithChildren = deleteCategoryWithChildren;
module.exports.deleteMainCategoryWithChildren = deleteMainCategoryWithChildren;
module.exports.assertCanDelete = assertCanDelete;
module.exports.designInUse = designInUse;
