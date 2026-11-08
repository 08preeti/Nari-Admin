// Generic catalogue screens (products and designs have their own dedicated pages).
export const catalogConfigs = {
  'main-categories': { title: 'Main categories', endpoint: '/main-categories', fields: [['name', 'Name'], ['moduleType', 'Module type', 'select', ['stitching', 'readymade']], ['imageUrl', 'Image URL', 'image'], ['description', 'Description', 'textarea'], ['displayOrder', 'Display order', 'number']] },
  'categories': { title: 'Categories', endpoint: '/categories', parentKey: 'mainCategory', fields: [['mainCategory', 'Main category', 'parent', '/main-categories'], ['name', 'Name'], ['imageUrl', 'Image URL', 'image'], ['description', 'Description', 'textarea'], ['displayOrder', 'Display order', 'number']] },
  'sub-categories': { title: 'Subcategories', endpoint: '/sub-categories', parentKey: 'category', fields: [['category', 'Category', 'parent', '/categories'], ['name', 'Name'], ['imageUrl', 'Image URL', 'image'], ['price', 'Price (optional)', 'number'], ['description', 'Description', 'textarea'], ['displayOrder', 'Display order', 'number']] },
  // titles used by the top bar
  'products': { title: 'Products' },
  'designs': { title: 'Designs' },
};
