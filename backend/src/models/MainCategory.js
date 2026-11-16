const mongoose = require("mongoose");
const { imageSchema } = require("./common");

const mainCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      unique: true,
      trim: true,
      maxlength: 100,
    },
    image: { type: imageSchema },
    description: { type: String, trim: true, maxlength: 1000 },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("MainCategory", mainCategorySchema);
