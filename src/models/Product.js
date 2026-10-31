const mongoose = require('mongoose');
const { imageSchema } = require('./common');

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    mainCategory: { type: Schema.Types.ObjectId, ref: 'MainCategory', required: true, index: true },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategory: { type: Schema.Types.ObjectId, ref: 'SubCategory', required: true, index: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 150 },
    sku: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    description: { type: String, trim: true, maxlength: 3000 },
    images: { type: [imageSchema], default: [] },
    price: { type: Number, required: [true, 'Price is required'], min: [0, 'Price cannot be negative'] },
    sizes: { type: [{ type: String, trim: true }], default: [] },
    colors: { type: [{ type: String, trim: true }], default: [] },
    stock: { type: Number, min: [0, 'Stock cannot be negative'] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
