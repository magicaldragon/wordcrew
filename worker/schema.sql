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
  -- pending -> paid | expired | revoked
  status           TEXT    NOT NULL DEFAULT 'pending',
  license_key      TEXT,
  sepay_tx_id      TEXT,
  paid_at          INTEGER,
  created_at       INTEGER NOT NULL,
  -- When the *pending order* stops being payable. Unrelated to `access_until`.
  expires_at       INTEGER NOT NULL,
  -- Billing term: pro (legacy one-off) | month | year | lifetime | school10 | school30.
  plan             TEXT    NOT NULL DEFAULT 'pro',
  -- Teacher seats on a school plan; 1 for a single licence.
  seats            INTEGER NOT NULL DEFAULT 1,
  -- When the purchase stops unlocking. NULL means "never" (lifetime / legacy key).
  access_until     INTEGER,
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
--
-- Databases created before the subscription plans need the three billing columns.
-- The defaults keep every existing row working: an old 199.000đ key becomes a
-- lifetime purchase, which is exactly the grandfathering promise.
--   npx wrangler d1 execute wordcrew-db --remote --command \
--     "ALTER TABLE orders ADD COLUMN plan TEXT NOT NULL DEFAULT 'pro'; ALTER TABLE orders ADD COLUMN seats INTEGER NOT NULL DEFAULT 1; ALTER TABLE orders ADD COLUMN access_until INTEGER;"

CREATE TABLE IF NOT EXISTS licenses (
  key        TEXT PRIMARY KEY,
  product_id TEXT    NOT NULL,
  order_code TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_order ON licenses (order_code);

-- Speech fallback quota. One row per accepted /api/asr call; the route counts rows for
-- the last minute and the current UTC day, so a device cannot use the account as a free
-- Whisper proxy. Rows older than two days are pruned as calls arrive.
CREATE TABLE IF NOT EXISTS asr_calls (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  client_ip  TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_asr_calls_ip_created ON asr_calls (client_ip, created_at);
CREATE INDEX IF NOT EXISTS idx_asr_calls_created ON asr_calls (created_at);

-- Words a teacher pasted that had no Vietnamese gloss. One row per word, and `hits` is
-- how many reports it drew — that ranking is what decides which words are worth adding
-- to the offline map next (scripts/generate-glosses.mjs). Nothing here is ever read back
-- by the app: it is a build-time hint for us, not a feature.
CREATE TABLE IF NOT EXISTS missing_glosses (
  word       TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL DEFAULT 0,
  first_seen INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_missing_glosses_hits ON missing_glosses (hits DESC);
