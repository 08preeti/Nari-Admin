const MainCategory = require('../models/MainCategory');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const ApiError = require('../utils/ApiError');

const checkHierarchy = async ({ mainCategory, category, subCategory }, moduleType) => {
  const mainCategoryDoc = await MainCategory.findById(mainCategory);
  if (!mainCategoryDoc) throw new ApiError(400, 'mainCategory does not exist');
  if (mainCategoryDoc.moduleType !== moduleType) {
    throw new ApiError(400, `mainCategory must belong to the ${moduleType} module`);
  }

  const categoryDoc = await Category.findById(category);
  if (!categoryDoc) throw new ApiError(400, 'category does not exist');
  if (String(categoryDoc.mainCategory) !== String(mainCategory)) {
    throw new ApiError(400, 'category does not belong to the selected mainCategory');
  }

  const subCategoryDoc = await SubCategory.findById(subCategory);
  if (!subCategoryDoc) throw new ApiError(400, 'subCategory does not exist');
  if (String(subCategoryDoc.category) !== String(category)) {
    throw new ApiError(400, 'subCategory does not belong to the selected category');
  }
};

module.exports = { checkHierarchy };

// ---- Referential protection for the Main Category -> Category -> Subcategory tree ----
const Product = require('../models/Product');
const Design = require('../models/Design');
const StitchingOrder = require('../models/StitchingOrder');

const countUsage = async (field, id) => {
  const [products, designs] = await Promise.all([
    Product.countDocuments({ [field]: id }),
    Design.countDocuments({ [field]: id }),
  ]);
  return { products, designs, total: products + designs };
};

const usageMessage = (usage) => `${usage.products} product(s) and ${usage.designs} design(s)`;

// Moving a node under a different parent would put its products/designs under a mismatched hierarchy.
const assertCanMove = async (field, id, label) => {
  const usage = await countUsage(field, id);
  if (usage.total > 0) {
    throw new ApiError(409, `This ${label} is used by ${usageMessage(usage)}, so it cannot be moved to a different parent.`);
  }
};

const assertCanDelete = async (field, id, label, childModel, childField) => {
  if (childModel) {
    const children = await childModel.countDocuments({ [childField]: id });
    if (children > 0) throw new ApiError(409, `This ${label} still has ${children} child record(s). Remove or move them first.`);
  }
  const usage = await countUsage(field, id);
  if (usage.total > 0) {
    throw new ApiError(409, `This ${label} is used by ${usageMessage(usage)}. Archive it instead of deleting.`);
  }
};

const designInUse = (id) => StitchingOrder.exists({ design: id });

module.exports.assertCanMove = assertCanMove;
module.exports.assertCanDelete = assertCanDelete;
module.exports.designInUse = designInUse;
