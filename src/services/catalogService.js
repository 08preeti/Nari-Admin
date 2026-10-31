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
