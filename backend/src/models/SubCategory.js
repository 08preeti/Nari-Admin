const mongoose = require('mongoose');
const { imageSchema } = require('./common');

const subCategorySchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    image: { type: imageSchema },
    price: { type: Number, min: [0, 'Price cannot be negative'] },
    description: { type: String, trim: true, maxlength: 1000 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

subCategorySchema.index({ category: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);
