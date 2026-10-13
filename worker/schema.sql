-- WordCrew orders and licences.
--
-- Apply locally:  npm run d1:local
-- Apply remotely: npm run d1:remote

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
  webhook_received INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_client_ip ON orders (client_ip, created_at);

CREATE TABLE IF NOT EXISTS licenses (
  key        TEXT PRIMARY KEY,
  product_id TEXT    NOT NULL,
  order_code TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order ON licenses (order_code);
