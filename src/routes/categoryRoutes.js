const express = require('express');
const controller = require('../controllers/categoryController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateCategory, validateBulkCategory, validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/bulk', authenticate, validate(validateBulkCategory), controller.bulkCreate);
router.post('/', authenticate, validate(validateCategory), controller.create);
router.put('/:id', authenticate, validate(validateCategory, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);

module.exports = router;
