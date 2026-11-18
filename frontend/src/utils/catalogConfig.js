export const catalogConfigs = {
  "main-categories": {
    title: "Main categories",
    endpoint: "/main-categories",
    fields: [
      ["name", "Main category name"],
      ["image", "Main category image", "file"],
    ],
  },
  categories: {
    title: "Categories",
    endpoint: "/categories",
    parentKey: "mainCategory",
    fields: [
      ["mainCategory", "Main category", "parent", "/main-categories"],
      ["name", "Category name"],
    ],
  },
  "sub-categories": {
    title: "Subcategories",
    endpoint: "/sub-categories",
    parentKey: "category",
    fields: [
      ["category", "Category", "parent", "/categories"],
      ["name", "Name"],
      ["image", "Image", "file"],
    ],
  },

  products: { title: "Products" },
  designs: { title: "Designs" },
};
