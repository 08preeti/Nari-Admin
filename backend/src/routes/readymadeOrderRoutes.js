const express = require('express');
const controller = require('../controllers/readymadeOrderController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateReadymadeOrderCreate,
  validateReadymadeStatus,
} = require('../validators/order.validator');

const router = express.Router();

router.post('/', validate(validateReadymadeOrderCreate), controller.create);

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getOne);
router.patch('/:id/status', authenticate, validate(validateReadymadeStatus), controller.updateStatus);

module.exports = router;
