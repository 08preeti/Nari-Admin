// DISPLAY-ONLY price helpers. The server recalculates and validates every price; never trust these for money.
export const hasSale = (price, salePrice) => Number(salePrice) > 0 && Number(salePrice) < Number(price);
export const sellingPrice = (price, salePrice) => (hasSale(price, salePrice) ? Number(salePrice) : Number(price));
export const discountPercent = (price, salePrice) =>
  hasSale(price, salePrice) ? Math.round(((Number(price) - Number(salePrice)) / Number(price)) * 100) : 0;
