const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'The Nari API is running', data: null });
});

router.use('/auth', require('./authRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/payments', require('./paymentRoutes'));
router.use('/main-categories', require('./mainCategoryRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/sub-categories', require('./subCategoryRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/designs', require('./designRoutes'));
router.use('/stitching-orders', require('./stitchingOrderRoutes'));
router.use('/readymade-orders', require('./readymadeOrderRoutes'));

module.exports = router;
