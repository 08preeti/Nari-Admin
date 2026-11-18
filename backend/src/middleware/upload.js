const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ApiError = require("../utils/ApiError");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_KB = 250;
const MAX_BYTES = MAX_KB * 1024; // 250 KB
const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const publicPath = (folder, filename) => `/uploads/${folder}/${filename}`;

const removeUploadedFile = (filePath) => {
  if (filePath) fs.unlink(filePath, () => {});
};

const toRelativeUpload = (url) => {
  if (typeof url !== "string" || !url) return null;
  if (url.startsWith("/uploads/")) return url.slice("/uploads/".length);
  try {
    const u = new URL(url);
    const ours =
      ["localhost", "127.0.0.1"].includes(u.hostname) ||
      (process.env.PUBLIC_BASE_URL &&
        url.startsWith(process.env.PUBLIC_BASE_URL));
    return ours && u.pathname.startsWith("/uploads/")
      ? decodeURIComponent(u.pathname.slice("/uploads/".length))
      : null;
  } catch (e) {
    return null;
  }
};
const removeStoredImage = (url) => {
  const rel = toRelativeUpload(url);
  if (!rel) return;
  const target = path.resolve(UPLOAD_DIR, rel);
  if (target.startsWith(UPLOAD_DIR + path.sep)) fs.unlink(target, () => {});
};

const hasImageSignature = async (filePath, mimetype) => {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buf = Buffer.alloc(12);
    await handle.read(buf, 0, 12, 0);
    if (mimetype === "image/jpeg")
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    if (mimetype === "image/png")
      return buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === "image/gif")
      return buf.subarray(0, 3).toString("ascii") === "GIF";
    if (mimetype === "image/webp")
      return (
        buf.subarray(0, 4).toString("ascii") === "RIFF" &&
        buf.subarray(8, 12).toString("ascii") === "WEBP"
      );
    return false;
  } finally {
    await handle.close();
  }
};

const normalizeBody = (body) => {
  if (!body || typeof body !== "object") return;
  if (body.isActive === "true") body.isActive = true;
  if (body.isActive === "false") body.isActive = false;
  ["displayOrder", "price"].forEach((k) => {
    if (
      typeof body[k] === "string" &&
      body[k].trim() !== "" &&
      !Number.isNaN(Number(body[k]))
    )
      body[k] = Number(body[k]);
  });
};

const imageUpload = (folder) => {
  const dir = path.join(UPLOAD_DIR, folder);
  fs.mkdirSync(dir, { recursive: true });

  const uploader = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dir),
      filename: (req, file, cb) =>
        cb(
          null,
          `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXTENSIONS[file.mimetype]}`,
        ),
    }),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (req, file, cb) =>
      EXTENSIONS[file.mimetype]
        ? cb(null, true)
        : cb(
            new ApiError(400, "Only JPG, PNG, WebP or GIF images are allowed"),
          ),
  });

  const build = (field) => (req, res, next) =>
    uploader.single(field)(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(
            new ApiError(
              400,
              err.code === "LIMIT_FILE_SIZE"
                ? `Image size is too large. Maximum allowed size is ${MAX_KB} KB.`
                : `Upload failed: ${err.message}`,
            ),
          );
        }
        return next(err);
      }
      normalizeBody(req.body);
      if (!req.file) return next();
      return hasImageSignature(req.file.path, req.file.mimetype)
        .then((ok) => {
          if (ok) return next();
          removeUploadedFile(req.file.path);
          return next(new ApiError(400, "That file is not a valid image"));
        })
        .catch(next);
    });

  const middleware = build("image");
  middleware.single = (field = "image") => build(field);
  return middleware;
};

const singleImage = imageUpload("images");

module.exports = {
  imageUpload,
  publicPath,
  removeUploadedFile,
  removeStoredImage,
  singleImage,
  hasImageSignature,
  UPLOAD_DIR,
};
module.exports.default = imageUpload;
