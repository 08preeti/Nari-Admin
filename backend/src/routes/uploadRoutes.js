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

// POST /api/uploads/images  (multipart/form-data, field name "image")
// Returns { url } (a path like /uploads/images/<file>) which is then saved as the record's image.url.
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

    // Stored as a relative path so images keep working if the API domain changes.
    return sendSuccess(res, {
      statusCode: 201,
      message: "Image uploaded",
      data: { url: publicPath("images", req.file.filename) },
    });
  }),
);

module.exports = router;
