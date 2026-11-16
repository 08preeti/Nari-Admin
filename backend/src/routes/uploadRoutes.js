const fs = require('fs');
const express = require('express');
const { authenticate } = require('../middleware/auth');
const { singleImage, hasImageSignature } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sendSuccess } = require('../utils/response');

const router = express.Router();

// POST /api/uploads/images  (multipart/form-data, field name "image")
// Returns { url } which is then saved as the record's image.url like before.
router.post(
  '/images',
  authenticate,
  singleImage,
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Choose an image file to upload');

    const valid = await hasImageSignature(req.file.path, req.file.mimetype);
    if (!valid) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      throw new ApiError(400, 'That file is not a valid image');
    }

    // Set PUBLIC_BASE_URL in .env when the API sits behind a proxy or domain, e.g. https://api.example.com
    const base = (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Image uploaded',
      data: { url: `${base}/uploads/${req.file.filename}` },
    });
  })
);

module.exports = router;