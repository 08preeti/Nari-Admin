const express = require('express');
const controller = require('../controllers/productController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateProduct } = require('../validators/product.validator');
const { validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/', authenticate, validate(validateProduct), controller.create);
router.put('/:id', authenticate, validate(validateProduct, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);

module.exports = router;
