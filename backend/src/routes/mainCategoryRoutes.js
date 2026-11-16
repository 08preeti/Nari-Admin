const express = require('express');
const controller = require('../controllers/mainCategoryController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { imageUpload } = require('../middleware/upload');
const { validateMainCategory, validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();
const upload = imageUpload('main-categories');

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/', authenticate, upload, validate(validateMainCategory), controller.create);
router.put('/:id', authenticate, upload, validate(validateMainCategory, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;