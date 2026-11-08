# The Nari Admin

Admin dashboard for The Nari boutique (readymade clothing with size/colour variants + custom stitching). It is two fully independent applications:

| Folder      | What it is                                   | Default URL                      |
| ----------- | -------------------------------------------- | -------------------------------- |
| `backend/`  | Node.js + Express + MongoDB (Mongoose) + JWT | `http://localhost:5000/api`      |
| `frontend/` | React 18 + Vite admin UI                     | `http://localhost:5173`          |

The frontend talks to the backend only over HTTP. It has no access to backend code or secrets.

## Project structure

```
The-Nari-Admin/
├── backend/
│   ├── server.js              # Entry point: loads env, connects MongoDB, starts HTTP server
│   ├── src/
│   │   ├── app.js             # Express app (CORS, JSON, routes, error handling)
│   │   ├── config/            # env.js (env parsing/validation), db.js (MongoDB connection)
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # auth (JWT), validate, notFound, errorHandler
│   │   ├── models/            # Mongoose models
│   │   ├── routes/            # Route definitions (mounted under /api)
│   │   ├── services/          # Business logic (auth, payments, orders, catalog)
│   │   ├── utils/             # Helpers, constants, ApiError, seedAdmin.js
│   │   └── validators/        # Request-body validators used by routes
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx           # Entry point (mounts <AuthProvider><App/></AuthProvider>)
│   │   ├── App.jsx            # Login gate + layout + page routing
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/        # PageHead, Toast, CatalogManager, OrdersManager, OrderDetailsModal
│   │   │   ├── layout/        # AppLayout, Sidebar, Topbar, Footer
│   │   │   └── forms/         # LoginForm, CatalogEditor, PaymentForm
│   │   ├── pages/             # One folder per module
│   │   │   ├── auth/  dashboard/  categories/  products/  designs/
│   │   │   └── stitching-orders/  readymade-orders/  payments/
│   │   ├── services/          # ALL backend API calls live here
│   │   ├── hooks/             # useAuth, useToast
│   │   ├── context/           # AuthContext (token, admin, login/logout)
│   │   ├── routes/            # navigation.js (sidebar) and AppRoutes.jsx (page switch)
│   │   ├── utils/             # formatters, constants, catalog form config
│   │   └── styles/            # styles.css
│   ├── .env.example
│   └── package.json
├── README.md
└── .gitignore
```

## Prerequisites

- Node.js **18.11 or newer** (and npm)
- A running MongoDB instance (local, or a MongoDB Atlas connection string)

## Installation

```bash
# Backend
cd backend
npm install

# Frontend (in a second terminal)
cd frontend
npm install
```

## Environment setup

### Backend: `backend/.env`

```bash
cd backend
cp .env.example .env
```

| Variable             | Required | Description                                                         |
| -------------------- | :------: | ------------------------------------------------------------------- |
| `MONGODB_URI`        |   yes    | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/the-nari` |
| `JWT_SECRET`         |   yes    | Long random string used to sign admin JWTs                          |
| `JWT_EXPIRES_IN`     |    no    | Token lifetime (default `1d`)                                       |
| `BCRYPT_SALT_ROUNDS` |    no    | Password hashing cost (default `10`)                                |
| `PORT`               |    no    | API port (default `5000`)                                           |
| `NODE_ENV`           |    no    | `development` or `production`                                       |
| `CORS_ORIGINS`       |    no    | Comma-separated allowed origins. Keep `http://localhost:5173` for local dev |
| `ADMIN_NAME`         |    no    | Name for the seeded admin                                           |
| `ADMIN_EMAIL`        |   seed   | Email for the seeded admin                                          |
| `ADMIN_PASSWORD`     |   seed   | Password for the seeded admin (minimum 8 characters)                |

The server exits at startup with a clear message if `MONGODB_URI` or `JWT_SECRET` is missing.

### Frontend: `frontend/.env`

```bash
cd frontend
cp .env.example .env
```

| Variable            | Description                                                      |
| ------------------- | ---------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Base URL of the backend API (default `http://localhost:5000/api`) |

> **Security:** every `VITE_*` variable is embedded in the public JavaScript bundle. Only put non-secret
> values (like the API URL) in `frontend/.env`. Secrets such as `JWT_SECRET`, `MONGODB_URI` and
> `ADMIN_PASSWORD` belong only in `backend/.env`. Neither `.env` file is committed (see `.gitignore`).

## Running the apps

Each app runs on its own. Start MongoDB first, then:

### Backend

```bash
cd backend
npm run seed:admin   # one time: creates the first admin from ADMIN_* values in .env
npm run dev          # development, auto-restarts on change (node --watch)
# or
npm start            # production-style start
```

Health check: <http://localhost:5000/api/health>

### Frontend

```bash
cd frontend
npm run dev          # development server on http://localhost:5173
npm run build        # production build into frontend/dist
npm run preview      # serve the production build locally
```

Open <http://localhost:5173> and sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you set in `backend/.env`.

## Command reference

| Where       | Command              | Purpose                                  |
| ----------- | -------------------- | ---------------------------------------- |
| `backend/`  | `npm install`        | Install dependencies                     |
| `backend/`  | `npm run seed:admin` | Create the first admin user              |
| `backend/`  | `npm run dev`        | Start API with auto-reload               |
| `backend/`  | `npm start`          | Start API                                |
| `frontend/` | `npm install`        | Install dependencies                     |
| `frontend/` | `npm run dev`        | Start dev server                         |
| `frontend/` | `npm run build`      | Production build                         |
| `frontend/` | `npm run preview`    | Preview the production build             |

## Authentication

- `POST /api/auth/login` returns `{ token, admin }`. The token is a JWT signed with `JWT_SECRET`.
- The frontend keeps the token in `localStorage` (key `nari_admin_token`) and sends it as
  `Authorization: Bearer <token>` on every request (see `frontend/src/services/api.js`).
- On load, the frontend calls `GET /api/auth/me`. If the token is invalid or expired, it is cleared
  and the login screen is shown.

## API overview

All routes are mounted under `/api`.

| Area              | Routes                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Health            | `GET /health`                                                                                            |
| Auth              | `POST /auth/login`, `GET /auth/me`                                                                       |
| Dashboard         | `GET /dashboard?from=&to=`                                                                               |
| Customers         | `GET /customers?q=`, `GET /customers/:mobile` (derived from orders)                                       |
| Main categories   | `GET /main-categories`, `GET/PUT /main-categories/:id`, `POST /main-categories`, `PATCH .../:id/status`   |
| Categories        | `GET/POST /categories`, `POST /categories/bulk`, `GET/PUT /categories/:id`, `PATCH .../:id/status`        |
| Sub-categories    | `GET/POST /sub-categories`, `POST /sub-categories/bulk`, `GET/PUT /sub-categories/:id`, `PATCH .../:id/status` |
| Products          | `GET/POST /products`, `GET/PUT/DELETE /products/:id`, `PATCH .../:id/status`, `POST .../:id/stock-adjustments`, `GET .../:id/inventory-history` |
| Designs           | `GET/POST /designs`, `GET/PUT /designs/:id`, `PATCH /designs/:id/status`                                  |
| Stitching orders  | `GET/POST /stitching-orders`, `GET/PUT /stitching-orders/:id`, `PATCH .../:id/status`                     |
| Readymade orders  | `GET/POST /readymade-orders`, `GET /readymade-orders/:id`, `PATCH .../:id/status`                         |
| Payments          | `GET /payments/:orderType`, `GET/PATCH /payments/:orderType/:id` (`orderType` = `stitching` or `readymade`) |

`DELETE` also exists on main categories, categories, sub-categories and designs (blocked with 409 while children/orders reference them).

Catalogue reads are public (inactive records are hidden); write routes, orders, payments and the dashboard require a valid admin JWT.

## Notes

- Product, color, variant and design images are entered as image URLs. File upload/storage is not included.

## Troubleshooting

- **Login works in curl but the browser shows a network/CORS error:** make sure your frontend origin
  (for example `http://localhost:5173`) is listed in `CORS_ORIGINS` in `backend/.env`, then restart the backend.
- **`Missing required environment variables`:** create `backend/.env` from `backend/.env.example`.
- **Frontend points at the wrong API:** change `VITE_API_BASE_URL` in `frontend/.env` and restart `npm run dev`
  (Vite reads env files at startup).
- **`Invalid email or password`:** run `npm run seed:admin` in `backend/`, and use the `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` from your `.env`.

---

# What changed in v2 (product variants, inventory, analytics)

## Products
- A product has `images[]` (URL + alt), `sizes[]` (XS…XXXL, Free Size, custom), `colorOptions[]` (`name`, `hex`, optional images), `variants[]`, `price`, `salePrice`, `tags`, `isFeatured`, `isActive`, `lowStockThreshold`.
- Each **variant** has a globally unique `sku`, `size`, `color {name,hex}`, `price`, `salePrice`, `stock`, `isActive`, optional `images`.
- The admin form is split into 9 sections (basic, categories, images, sizes, colors, variants, pricing, inventory, status). "Generate combinations" only adds *missing* size × color rows and never touches rows you already edited.
- `colors` (list of names) is still written for older readers and is derived from `colorOptions`.
- **Stock has one source of truth**: active variants if the product has variants, otherwise the legacy product-level `stock`. Products without `stock` are "not tracked" (as before). The server unsets product-level stock once variants exist.
- A product that still has legacy stock cannot silently gain variants: the server requires the variant stock to add up to the legacy figure (or an explicit "discard" confirmation).
- Variants holding stock cannot be removed (only deactivated). Removing a size/color that has stocked variants is blocked in the UI.
- Prices: `salePrice` ≤ `price`, no negatives, `salePrice` 0/empty = no sale. Validated on the server; frontend maths is display-only.
- Stale-form protection: a PUT that would overwrite stock numbers with a `version` older than the product is refused with 409 (orders change stock live). Edits that don't touch stock still go through.

## Readymade orders and inventory
- `POST /readymade-orders` accepts `items: [{ productId, variantSku?, size?, color?, quantity }]`. Price, SKU and stock are always read from the database.
- Each order item stores a snapshot: product name/SKU/image, variant SKU, size, color `{name,hex}`, quantity, `regularPrice`, `salePrice`, `unitPrice`, `lineTotal`. Later product edits never change old orders.
- **When stock is deducted:** when the order is *placed* (status `New`). This reserves the stock so two customers can't buy the last unit. Cancelling returns it. (Change point: `readymade-orders` controller `create` + `inventoryService`.)
- Deduction is one conditional MongoDB update per line (`stock >= qty` in the filter), all-or-nothing across lines, so it is atomic without transactions and works on a standalone MongoDB. `order.inventory.deducted` is flipped atomically before stock moves, so stock is deducted/restored **exactly once** however often a status is re-sent.
- Moving `Cancelled` → active re-reserves stock (409 if no longer available). Orders created before this release have no `inventory` flag and never touch stock.
- Every movement is recorded in `InventoryLog` (`GET /products/:id/inventory-history`).

## Payments
- Status always matches the amounts (`Pending` / `Partially Paid` / `Paid`); `paidAmount` is 0…total; readymade totals are fixed; stitching totals editable. A conflicting `status` in a request is rejected with 400; sending only `status: "Paid"` means "balance paid".
- `payment.history[]` records each change in paid amount.

## Dashboard definitions
Cancelled orders are never sales. **Revenue collected** = Σ `paidAmount`; **Booked** = Σ `totalAmount`; **Outstanding** = Σ `balance` (non-cancelled). Partially paid orders contribute their paid part to revenue and only the rest to outstanding. Completed = `Delivered`, Pending = not Delivered/Cancelled. Order figures follow `from`/`to` (order created date, bucketed in `BUSINESS_TIMEZONE`); product/stock cards are a live snapshot. Old keys (`totalRevenue`, `pendingOrders`, `completedStitchingOrders`) are still returned.

## Security notes
JWT (HS256, `JWT_EXPIRES_IN`), bcrypt hashes, login rate-limit (20/15 min per IP+email), CORS restricted to `CORS_ORIGINS` in production, production start-up refuses a weak `JWT_SECRET`, a 401 anywhere in the UI signs the admin out. `POST /readymade-orders` and `POST /stitching-orders` remain **public by design** (storefront); put rate limiting at your proxy.

## Database migration (existing data)
Nothing is converted automatically; the app keeps working with legacy products (no variants) as is.

1. **Back up first:** `mongodump --uri "$MONGODB_URI" --out backup-$(date +%F)`
2. Dry run (changes nothing): `cd backend && npm run migrate:products`
3. Apply: `npm run migrate:products -- --apply` (also writes `backend/backups/products-before-001-*.json`)
4. Optional: `npm run migrate:products -- --apply --generate-variants` creates size × color variants **with stock 0** only for products whose legacy stock is empty/0. Products with legacy stock > 0 are listed and skipped, because the quantity must be split by a person (do it in the admin UI, which enforces the exact total). Stock is never invented.

The migration only *adds* `colorOptions`, `lowStockThreshold` (and variants if asked). It is idempotent. **Rollback:** `mongorestore --uri "$MONGODB_URI" --nsInclude "<db>.products" --drop backup-<date>/<db>/products.bson` (or restore from the JSON backup). Variant SKUs get a unique index on startup; if you already hold duplicate SKUs the index build will report them.

## Tests
```bash
cd backend  && npm test     # 14 unit tests run anywhere; the API integration suite runs only if TEST_MONGODB_URI is set
cd frontend && npm test     # 11 tests for variant/pricing/form logic
# full API tests (use a THROWAWAY db whose name contains "test"; it is wiped):
cd backend && TEST_MONGODB_URI=mongodb://127.0.0.1:27017/the-nari-test npm test
```
