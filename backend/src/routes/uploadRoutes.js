const fs = require("fs");
const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  singleImage,
  hasImageSignature,
  publicPath,
} = require("../middleware/upload");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/response");

const router = express.Router();

router.post(
  "/images",
  authenticate,
  singleImage,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Choose an image file to upload");

    const valid = await hasImageSignature(req.file.path, req.file.mimetype);
    if (!valid) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw new ApiError(400, "That file is not a valid image");
    }

    return sendSuccess(res, {
      statusCode: 201,
      message: "Image uploaded",
      data: { url: publicPath("images", req.file.filename) },
    });
  }),
);

module.exports = router;
