const express = require('express');
const controller = require('../controllers/subCategoryController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateSubCategory, validateBulkSubCategory, validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/bulk', authenticate, validate(validateBulkSubCategory), controller.bulkCreate);
router.post('/', authenticate, validate(validateSubCategory), controller.create);
router.put('/:id', authenticate, validate(validateSubCategory, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);

module.exports = router;
