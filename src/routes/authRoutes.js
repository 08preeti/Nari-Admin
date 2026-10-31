const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { validateLogin } = require('../validators/auth.validator');

const router = express.Router();

router.post('/login', validate(validateLogin), controller.login);
router.get('/me', authenticate, controller.getMe);

module.exports = router;
