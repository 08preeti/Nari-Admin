const express = require('express');
const controller = require('../controllers/stitchingOrderController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  validateStitchingOrderCreate,
  validateStitchingOrderUpdate,
  validateStitchingStatus,
  validateBasicOrder,
} = require('../validators/order.validator');

const router = express.Router();

router.post('/', validate(validateStitchingOrderCreate), controller.create);

router.post('/basic', authenticate, validate(validateBasicOrder), controller.createBasic);
router.put('/:id/basic', authenticate, validate(validateBasicOrder), controller.updateBasic);

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getOne);
router.put('/:id', authenticate, validate(validateStitchingOrderUpdate), controller.update);
router.patch('/:id/status', authenticate, validate(validateStitchingStatus), controller.updateStatus);

module.exports = router;
