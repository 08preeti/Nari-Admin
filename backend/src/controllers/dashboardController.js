const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { buildSummary } = require('../services/dashboardService');

exports.getSummary = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await buildSummary(req.query) });
});
