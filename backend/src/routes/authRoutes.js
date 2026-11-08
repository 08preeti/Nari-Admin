const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimit');
const { validateLogin } = require('../validators/auth.validator');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyFn: (req) => `${req.ip}:${String((req.body && req.body.email) || '').toLowerCase()}`,
});

router.post('/login', loginLimiter, validate(validateLogin), controller.login);
router.get('/me', authenticate, controller.getMe);

module.exports = router;
