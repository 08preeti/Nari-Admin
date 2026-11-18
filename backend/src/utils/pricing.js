const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const hasSale = (price, salePrice) =>
  typeof salePrice === "number" &&
  salePrice > 0 &&
  typeof price === "number" &&
  salePrice < price;

const sellingPrice = (price, salePrice) =>
  hasSale(price, salePrice) ? salePrice : price;

const discountAmount = (price, salePrice) =>
  hasSale(price, salePrice) ? round2(price - salePrice) : 0;

const discountPercent = (price, salePrice) =>
  hasSale(price, salePrice) && price > 0
    ? Math.round(((price - salePrice) / price) * 100)
    : 0;

const checkPricePair = (price, salePrice, label = "price") => {
  const errors = [];
  if (
    price !== undefined &&
    (typeof price !== "number" || !Number.isFinite(price) || price < 0)
  ) {
    errors.push(`${label} must be a number, 0 or more`);
  }
  if (salePrice !== undefined && salePrice !== null) {
    if (
      typeof salePrice !== "number" ||
      !Number.isFinite(salePrice) ||
      salePrice < 0
    ) {
      errors.push(`${label} sale price must be a number, 0 or more`);
    } else if (typeof price === "number" && salePrice > price) {
      errors.push(`${label} sale price cannot exceed the regular price`);
    }
  }
  return errors;
};

module.exports = {
  round2,
  hasSale,
  sellingPrice,
  discountAmount,
  discountPercent,
  checkPricePair,
};
