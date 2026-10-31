module.exports = {
  MODULE_TYPES: ['stitching', 'readymade'],
  ADMIN_ROLES: ['owner', 'staff'],
  PAYMENT_STATUSES: ['Pending', 'Partially Paid', 'Paid'],
  STITCHING_ORDER_STATUSES: [
    'New',
    'Confirmed',
    'In Progress',
    'Ready for Trial',
    'Ready for Delivery',
    'Delivered',
    'Cancelled',
  ],
  READYMADE_ORDER_STATUSES: [
    'New',
    'Confirmed',
    'Processing',
    'Packed',
    'Shipped/Ready for Pickup',
    'Delivered',
    'Cancelled',
  ],
};
