-- WordCrew orders and licences.
--
-- Apply locally:  npm run d1:local
-- Apply remotely: npm run d1:remote
--
-- NOTE: money lives here (D1); identity + progress live in Firestore. An order only
-- stores the buyer's uid/email as a denormalised record of who paid — the user itself
-- is owned by Firestore.

CREATE TABLE IF NOT EXISTS orders (
  code             TEXT PRIMARY KEY,
  product_id       TEXT    NOT NULL,
  amount           INTEGER NOT NULL,
  -- pending -> paid | expired
  status           TEXT    NOT NULL DEFAULT 'pending',
  license_key      TEXT,
  sepay_tx_id      TEXT,
  paid_at          INTEGER,
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL,
  -- Only used to throttle QR spam; never shown or joined against anything.
  client_ip        TEXT,
  -- Firebase account that checked out (from the verified ID token).
  user_id          TEXT,
  user_email       TEXT,
  webhook_received INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_client_ip ON orders (client_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at);

-- Databases created before checkout required sign-in need these two columns added
-- once by hand (SQLite has no "ADD COLUMN IF NOT EXISTS"):
--   npx wrangler d1 execute wordcrew-db --remote \
--     --command "ALTER TABLE orders ADD COLUMN user_id TEXT; ALTER TABLE orders ADD COLUMN user_email TEXT;"

CREATE TABLE IF NOT EXISTS licenses (
  key        TEXT PRIMARY KEY,
  product_id TEXT    NOT NULL,
  order_code TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order ON licenses (order_code);
