const Counter = require('../models/Counter');

const PREFIXES = { stitching: 'STI', readymade: 'RDY' };

const generateOrderId = async (orderType) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: orderType },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${PREFIXES[orderType]}-${String(counter.seq).padStart(6, '0')}`;
};

module.exports = { generateOrderId };
