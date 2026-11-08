const express = require('express');
const controller = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/', controller.getAll);
router.get('/:mobile', controller.getOne);

module.exports = router;
