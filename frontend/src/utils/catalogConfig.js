// Generic catalogue screens (products and designs have their own dedicated pages).
// Field kind 'file' = image chosen from the device (the field key is the upload field name, so keep it "image").
// `simple: true` = no Active toggle in the form.
export const catalogConfigs = {
  'main-categories': { title: 'Main categories', endpoint: '/main-categories', simple: true, fields: [['name', 'Name'], ['image', 'Image', 'file']] },
  'categories': { title: 'Categories', endpoint: '/categories', parentKey: 'mainCategory', fields: [['mainCategory', 'Main category', 'parent', '/main-categories'], ['name', 'Category name'], ['image', 'Category image', 'file']] },
  'sub-categories': { title: 'Subcategories', endpoint: '/sub-categories', parentKey: 'category', fields: [['category', 'Category', 'parent', '/categories'], ['name', 'Name'], ['image', 'Image', 'file'], ['price', 'Price (optional)', 'number']] },
  // titles used by the top bar
  'products': { title: 'Products' },
  'designs': { title: 'Designs' },
};