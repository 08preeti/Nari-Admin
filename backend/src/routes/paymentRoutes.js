const express = require('express');
const controller = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validatePaymentUpdate } = require('../validators/payment.validator');

const router = express.Router();

router.use(authenticate);

router.get('/:orderType', controller.getAll);
router.get('/:orderType/:id', controller.getOne);
router.patch('/:orderType/:id', validate(validatePaymentUpdate), controller.update);

module.exports = router;
