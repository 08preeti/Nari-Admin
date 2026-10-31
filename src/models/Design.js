const mongoose = require('mongoose');
const { imageSchema } = require('./common');

const { Schema } = mongoose;

const designSchema = new Schema(
  {
    mainCategory: { type: Schema.Types.ObjectId, ref: 'MainCategory', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
    referenceCode: {
      type: String,
      required: [true, 'Reference code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, trim: true, maxlength: 3000 },
    images: { type: [imageSchema], default: [] },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Design', designSchema);
