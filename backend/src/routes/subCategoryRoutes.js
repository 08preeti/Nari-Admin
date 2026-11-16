const express = require('express');
const controller = require('../controllers/subCategoryController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { validateSubCategory, validateBulkSubCategory, validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();
const upload = imageUpload('sub-categories'); // the admin form sends the image as a file (field "image")

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/bulk', authenticate, validate(validateBulkSubCategory), controller.bulkCreate);
router.post('/', authenticate, upload, validate(validateSubCategory), controller.create);
router.put('/:id', authenticate, upload, validate(validateSubCategory, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;