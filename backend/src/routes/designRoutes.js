const express = require('express');
const controller = require('../controllers/designController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateDesign } = require('../validators/product.validator');
const { validateStatusToggle } = require('../validators/category.validator');

const router = express.Router();

router.get('/', optionalAuth, controller.getAll);
router.get('/:id', optionalAuth, controller.getOne);

router.post('/', authenticate, validate(validateDesign), controller.create);
router.put('/:id', authenticate, validate(validateDesign, { isUpdate: true }), controller.update);
router.patch('/:id/status', authenticate, validate(validateStatusToggle), controller.setStatus);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
