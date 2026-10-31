const StitchingOrder = require('../models/StitchingOrder');
const ReadymadeOrder = require('../models/ReadymadeOrder');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const { round2 } = require('../utils/helpers');

const pendingFilter = { status: { $nin: ['Delivered', 'Cancelled'] } };

const sumPaidAmount = async (Model) => {
  const result = await Model.aggregate([
    { $group: { _id: null, total: { $sum: '$payment.paidAmount' } } },
  ]);
  return result.length > 0 ? result[0].total : 0;
};

exports.getSummary = asyncHandler(async (req, res) => {
  const [
    completedStitchingOrders,
    pendingStitchingOrders,
    pendingReadymadeOrders,
    stitchingRevenue,
    readymadeRevenue,
  ] = await Promise.all([
    StitchingOrder.countDocuments({ status: 'Delivered' }),
    StitchingOrder.countDocuments(pendingFilter),
    ReadymadeOrder.countDocuments(pendingFilter),
    sumPaidAmount(StitchingOrder),
    sumPaidAmount(ReadymadeOrder),
  ]);

  sendSuccess(res, {
    data: {
      completedStitchingOrders,
      pendingOrders: {
        stitching: pendingStitchingOrders,
        readymade: pendingReadymadeOrders,
        total: pendingStitchingOrders + pendingReadymadeOrders,
      },
      totalRevenue: {
        stitching: round2(stitchingRevenue),
        readymade: round2(readymadeRevenue),
        total: round2(stitchingRevenue + readymadeRevenue),
      },
    },
  });
});
