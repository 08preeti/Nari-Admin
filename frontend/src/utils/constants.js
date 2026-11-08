export const statusOptions = {
  'stitching-orders': ['New', 'Confirmed', 'In Progress', 'Ready for Trial', 'Ready for Delivery', 'Delivered', 'Cancelled'],
  'readymade-orders': ['New', 'Confirmed', 'Processing', 'Packed', 'Shipped/Ready for Pickup', 'Delivered', 'Cancelled'],
};

export const paymentStatuses = ['Pending', 'Partially Paid', 'Paid'];
export const paymentMethods = ['Cash', 'UPI', 'Card', 'Bank transfer', 'Other'];

export const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'];

export const COLOR_PRESETS = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Black', hex: '#000000' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Green', hex: '#008000' },
  { name: 'Pink', hex: '#FFC0CB' },
  { name: 'Yellow', hex: '#FFD700' },
  { name: 'Maroon', hex: '#800000' },
];

export const STOCK_STATUS_LABELS = { in_stock: 'In stock', low_stock: 'Low stock', out_of_stock: 'Out of stock' };
export const STOCK_STATUS_TONES = { in_stock: 'active', low_stock: 'pending', out_of_stock: 'danger' };

// Map any status text to a badge colour class
export const statusTone = (status) => {
  switch (status) {
    case 'Delivered':
    case 'Paid':
    case 'Active':
    case 'in_stock':
      return 'active';
    case 'Cancelled':
    case 'out_of_stock':
    case 'Out of stock':
      return 'danger';
    case 'New':
    case 'Pending':
    case 'low_stock':
    case 'Partially Paid':
      return 'pending';
    case 'Inactive':
      return 'inactive';
    default:
      return 'info';
  }
};
