const mongoose = require('mongoose');
const { imageSchema } = require('./common');

const categorySchema = new mongoose.Schema(
  {
    mainCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'MainCategory', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    image: { type: imageSchema },
    description: { type: String, trim: true, maxlength: 1000 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ mainCategory: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
