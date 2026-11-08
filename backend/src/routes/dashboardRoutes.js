const express = require('express');
const controller = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, controller.getSummary);

module.exports = router;
