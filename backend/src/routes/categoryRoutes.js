const express = require('express');
const controller = require('../controllers/categoryController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { validateCategory, validateBulkCategory, validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();
const upload = imageUpload('categories'); // the admin form sends the image as a file (field "image")

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/bulk', authenticate, validate(validateBulkCategory), controller.bulkCreate);
router.post('/', authenticate, upload, validate(validateCategory), controller.create);
router.put('/:id', authenticate, upload, validate(validateCategory, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;