const express = require('express');
const controller = require('../controllers/productController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateProduct, validateStockAdjustment } = require('../validators/product.validator');
const { validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/', authenticate, validate(validateProduct), controller.create);
router.put('/:id', authenticate, validate(validateProduct, { isUpdate: true }), controller.update);
router.get('/:id/inventory-history', authenticate, controller.getInventoryHistory);
router.post('/:id/stock-adjustments', authenticate, validate(validateStockAdjustment), controller.adjustStock);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
