const mongoose = require('mongoose');
const { imageSchema } = require('./common');
const { MODULE_TYPES } = require('../utils/constants');

const mainCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], unique: true, trim: true, maxlength: 100 },
    moduleType: { type: String, enum: MODULE_TYPES, required: [true, 'Module type is required'], immutable: true, index: true },
    image: { type: imageSchema },
    description: { type: String, trim: true, maxlength: 1000 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MainCategory', mainCategorySchema);
