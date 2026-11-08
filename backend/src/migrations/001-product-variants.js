/*
 * Migration 001 - prepare existing products for the variant system.
 *
 *   node src/migrations/001-product-variants.js                 -> DRY RUN (default, changes nothing)
 *   node src/migrations/001-product-variants.js --apply         -> writes a JSON backup, then migrates
 *   node src/migrations/001-product-variants.js --apply --generate-variants
 *
 * What it does (all additive, safe to re-run):
 *   1. Legacy `colors: ["Red"]` -> `colorOptions: [{ name: "Red", images: [] }]` (hex stays empty: it is
 *      never invented; add it in the admin UI). `colors` itself is left untouched.
 *   2. lowStockThreshold gets the default when missing. isFeatured/tags are left to schema defaults.
 *   3. With --generate-variants only: creates one variant per size x colour combination for products
 *      that have NO variants yet, using the product price. Stock is NEVER invented:
 *        - legacy stock is undefined or 0  -> variants are created with stock 0 (matches what was there)
 *        - legacy stock > 0                -> the product is SKIPPED and listed in the report, because the
 *                                             quantity must be split across variants by a person
 *                                             (do it in the admin UI: it enforces the exact total).
 *
 * It never deletes anything, never changes product ids, categories, prices, images or order data.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const Product = require('../models/Product');
const { DEFAULT_LOW_STOCK_THRESHOLD } = require('../utils/constants');
const { buildVariantSku, missingCombinations } = require('../services/variantService');

const apply = process.argv.includes('--apply');
const generate = process.argv.includes('--generate-variants');

const run = async () => {
  await connectDB();
  // Read raw documents so legacy shapes are seen exactly as stored.
  const raw = await Product.collection.find({}).toArray();
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} on ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')} - ${raw.length} product(s)`);

  if (apply) {
    const dir = path.join(__dirname, '..', '..', 'backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `products-before-001-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(raw, null, 2));
    console.log(`Backup written: ${file}`);
  }

  const report = { colorOptions: 0, threshold: 0, variantsGenerated: 0, skippedNeedsStockSplit: [], skippedNoSku: [], untouched: 0 };

  for (const p of raw) {
    const $set = {};
    const legacyColors = Array.isArray(p.colors) ? p.colors.filter((c) => typeof c === 'string' && c.trim()) : [];
    const hasOptions = Array.isArray(p.colorOptions) && p.colorOptions.length > 0;

    if (!hasOptions && legacyColors.length > 0) {
      $set.colorOptions = legacyColors.map((name) => ({ name: name.trim(), images: [] }));
      report.colorOptions += 1;
    }
    if (p.lowStockThreshold === undefined) {
      $set.lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD;
      report.threshold += 1;
    }

    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    if (generate && !hasVariants) {
      const sizes = Array.isArray(p.sizes) ? p.sizes : [];
      const colorOptions = $set.colorOptions || p.colorOptions || [];
      const combos = missingCombinations({ sizes, colorOptions, variants: [] });
      if (combos.length > 0) {
        if (!p.sku) {
          report.skippedNoSku.push(String(p._id));
        } else if (typeof p.stock === 'number' && p.stock > 0) {
          report.skippedNeedsStockSplit.push({ id: String(p._id), name: p.name, legacyStock: p.stock });
        } else {
          $set.variants = combos.map(({ size, color }) => ({
            _id: new mongoose.Types.ObjectId(),
            sku: buildVariantSku(p.sku, size, color && color.name),
            size: size || undefined,
            color: color ? { name: color.name, hex: color.hex } : undefined,
            price: p.price,
            stock: 0,
            isActive: true,
            images: [],
          }));
          report.variantsGenerated += $set.variants.length;
        }
      }
    }

    if (Object.keys($set).length === 0) {
      report.untouched += 1;
      continue;
    }
    if (apply) await Product.collection.updateOne({ _id: p._id }, { $set }); // legacy `stock` is kept as is
  }

  console.log(JSON.stringify(report, null, 2));
  if (!apply) console.log('\nNothing was changed. Re-run with --apply to migrate.');
  if (report.skippedNeedsStockSplit.length > 0) {
    console.log('\nProducts with legacy stock stay in legacy mode until you add variants and split the stock in the admin UI.');
  }
};

run()
  .catch((err) => {
    console.error(`Migration failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
