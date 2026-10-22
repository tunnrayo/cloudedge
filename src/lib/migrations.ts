/**
 * DATABASE MIGRATIONS — applied in order, each exactly once (tracked in schema_migrations).
 * Never edit a migration that has been deployed; add a new one with the next id.
 * A copy of the full schema is kept in docs/database/schema.sql for reference.
 */
export const MIGRATIONS: { id: number; name: string; sql: string }[] = [
  {
    id: 1,
    name: "shop_core",
    sql: `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY,
  sku                   TEXT NOT NULL UNIQUE,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  brand                 TEXT NOT NULL,
  category              TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  coverage              TEXT NOT NULL DEFAULT '',
  platforms             TEXT NOT NULL DEFAULT '',
  billing_period        TEXT NOT NULL CHECK (billing_period IN ('month','year','one_time','term')),
  billing_note          TEXT NOT NULL DEFAULT '',
  price_unit            TEXT NOT NULL,
  reference_amount      NUMERIC(14,2) NOT NULL,
  reference_currency    TEXT NOT NULL CHECK (reference_currency IN ('USD','NGN')),
  reference_label       TEXT NOT NULL DEFAULT '',
  reference_type        TEXT NOT NULL DEFAULT 'standard',
  reference_source_name TEXT NOT NULL DEFAULT '',
  reference_source_url  TEXT NOT NULL DEFAULT '',
  fx_rate               NUMERIC(12,4),
  markup_ngn            INTEGER NOT NULL DEFAULT 10000,
  price_ngn             INTEGER NOT NULL CHECK (price_ngn > 0),
  listed_price_ngn      INTEGER,
  price_verification    TEXT NOT NULL DEFAULT 'catalogue' CHECK (price_verification IN ('verified','catalogue','needs_verification')),
  price_verified_at     DATE,
  verification_note     TEXT NOT NULL DEFAULT '',
  supplier_name         TEXT NOT NULL DEFAULT '',
  supplier_url          TEXT NOT NULL DEFAULT '',
  supplier_notes        TEXT NOT NULL DEFAULT '',
  fulfilment_type       TEXT NOT NULL DEFAULT 'manual_sourcing' CHECK (fulfilment_type IN ('manual_sourcing','manual_activation','supplier_api','digital_file','unavailable')),
  fulfilment_note       TEXT NOT NULL DEFAULT '',
  delivery_estimate     TEXT NOT NULL DEFAULT '',
  resale_status         TEXT NOT NULL DEFAULT 'unconfirmed' CHECK (resale_status IN ('unconfirmed','authorised','affiliate','not_permitted')),
  sale_mode             TEXT NOT NULL DEFAULT 'enquiry' CHECK (sale_mode IN ('purchase','enquiry')),
  status                TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  max_quantity          INTEGER NOT NULL DEFAULT 1 CHECK (max_quantity >= 1),
  quantity_label        TEXT NOT NULL DEFAULT 'Quantity',
  option_label          TEXT NOT NULL DEFAULT '',
  option_required       BOOLEAN NOT NULL DEFAULT FALSE,
  chips                 JSONB NOT NULL DEFAULT '[]',
  image_path            TEXT NOT NULL DEFAULT '',
  image_id              UUID,
  image_alt             TEXT NOT NULL DEFAULT '',
  featured              BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  source_document       TEXT NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);

CREATE TABLE IF NOT EXISTS product_images (
  id           UUID PRIMARY KEY,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL,
  bytes        BYTEA NOT NULL,
  filename     TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash  TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY,
  number            TEXT NOT NULL UNIQUE,
  access_token_hash TEXT NOT NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  email             TEXT NOT NULL,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL DEFAULT '',
  company           TEXT NOT NULL DEFAULT '',
  country           TEXT NOT NULL DEFAULT '',
  state             TEXT NOT NULL DEFAULT '',
  city              TEXT NOT NULL DEFAULT '',
  address           TEXT NOT NULL DEFAULT '',
  notes             TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'pending_payment',
  payment_status    TEXT NOT NULL DEFAULT 'unpaid',
  currency          TEXT NOT NULL DEFAULT 'NGN',
  subtotal_kobo     BIGINT NOT NULL,
  total_kobo        BIGINT NOT NULL,
  refunded_kobo     BIGINT NOT NULL DEFAULT 0,
  payment_reference TEXT,
  payment_mode      TEXT NOT NULL DEFAULT 'test',
  paid_at           TIMESTAMPTZ,
  terms_accepted_at TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders (customer_id);

CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY,
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  sku                   TEXT NOT NULL,
  product_slug          TEXT NOT NULL,
  product_name          TEXT NOT NULL,
  image_url             TEXT NOT NULL DEFAULT '',
  billing_label         TEXT NOT NULL DEFAULT '',
  unit_price_kobo       BIGINT NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity >= 1),
  line_total_kobo       BIGINT NOT NULL,
  option_label          TEXT NOT NULL DEFAULT '',
  option_value          TEXT NOT NULL DEFAULT '',
  fulfilment_type       TEXT NOT NULL DEFAULT 'manual_sourcing',
  sourcing_status       TEXT NOT NULL DEFAULT 'sourcing_required',
  supplier_name         TEXT NOT NULL DEFAULT '',
  supplier_url          TEXT NOT NULL DEFAULT '',
  supplier_availability TEXT NOT NULL DEFAULT '',
  supplier_price_text   TEXT NOT NULL DEFAULT '',
  sourcing_cost_kobo    BIGINT,
  supplier_eta          TEXT NOT NULL DEFAULT '',
  tracking              TEXT NOT NULL DEFAULT '',
  expected_delivery     DATE,
  fulfilment_notes      TEXT NOT NULL DEFAULT '',
  delivery_details      TEXT NOT NULL DEFAULT '',
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL DEFAULT 'paystack',
  reference    TEXT NOT NULL,
  kind         TEXT NOT NULL,
  status       TEXT NOT NULL,
  amount_kobo  BIGINT,
  currency     TEXT,
  detail       TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_reference_idx ON payments (reference);
CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_init_idx ON payments (reference) WHERE kind = 'initialize';

CREATE TABLE IF NOT EXISTS webhook_events (
  id          TEXT PRIMARY KEY,
  provider    TEXT NOT NULL,
  event       TEXT NOT NULL,
  reference   TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_events (
  id               UUID PRIMARY KEY,
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  kind             TEXT NOT NULL,
  message          TEXT NOT NULL,
  customer_visible BOOLEAN NOT NULL DEFAULT FALSE,
  email_status     TEXT,
  actor            TEXT NOT NULL DEFAULT 'system',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS order_events_order_idx ON order_events (order_id, created_at);

CREATE TABLE IF NOT EXISTS refunds (
  id           UUID PRIMARY KEY,
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_kobo  BIGINT NOT NULL CHECK (amount_kobo > 0),
  reason       TEXT NOT NULL DEFAULT '',
  method       TEXT NOT NULL CHECK (method IN ('paystack','manual')),
  status       TEXT NOT NULL,
  provider_ref TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`,
  },
  {
    id: 2,
    name: "manual_sourcing_workflow",
    sql: `
-- Orders become sourcing requests: no payment is taken until a quotation is accepted.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_idx ON orders (client_request_id) WHERE client_request_id IS NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_quote_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS next_action TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS indicative_total_kobo BIGINT;
UPDATE orders SET indicative_total_kobo = subtotal_kobo WHERE indicative_total_kobo IS NULL;

-- Map the previous checkout statuses onto the sourcing workflow (existing history is kept).
UPDATE orders SET status = CASE status
  WHEN 'pending_payment' THEN 'reviewing'
  WHEN 'payment_review' THEN 'awaiting_payment'
  WHEN 'failed' THEN 'reviewing'
  WHEN 'paid' THEN 'payment_confirmed'
  WHEN 'processing' THEN 'supplier_order'
  WHEN 'awaiting_activation' THEN 'licence_ready'
  WHEN 'on_hold' THEN 'awaiting_approval'
  WHEN 'partially_refunded' THEN 'refund_pending'
  ELSE status END
WHERE status IN ('pending_payment','payment_review','failed','paid','processing','awaiting_activation','on_hold','partially_refunded');

-- Product wording: replace the old default delivery texts (admin-customised texts are left alone).
UPDATE products SET fulfilment_note = 'Sourced manually through external suppliers after you request it. We confirm availability, licence eligibility for your country, the final price and the delivery estimate in a quotation before you pay.'
  WHERE fulfilment_note LIKE 'Manual fulfilment: after your payment is confirmed%';
UPDATE products SET delivery_estimate = 'Confirmed in your quotation.'
  WHERE delivery_estimate = 'We confirm the expected activation date by email after your order is paid.';

-- Fulfilment evidence per item (internal unless stated).
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS supply_evidence TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS licence_type TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS region_eligibility TEXT NOT NULL DEFAULT 'not_confirmed';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS region_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS actual_fulfilment_date DATE;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS delivery_method TEXT NOT NULL DEFAULT '';

-- Quotations (versioned; an accepted quotation is never edited).
CREATE TABLE IF NOT EXISTS quotes (
  id                UUID PRIMARY KEY,
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  version           INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','declined','expired','superseded')),
  currency          TEXT NOT NULL DEFAULT 'NGN',
  total_kobo        BIGINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMPTZ,
  price_checked     BOOLEAN NOT NULL DEFAULT FALSE,
  country_suitable  BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_estimate TEXT NOT NULL DEFAULT '',
  licence_terms     TEXT NOT NULL DEFAULT '',
  customer_note     TEXT NOT NULL DEFAULT '',
  internal_note     TEXT NOT NULL DEFAULT '',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at           TIMESTAMPTZ,
  decided_at        TIMESTAMPTZ,
  decided_by        TEXT,
  decision_note     TEXT NOT NULL DEFAULT '',
  UNIQUE (order_id, version)
);
CREATE TABLE IF NOT EXISTS quote_lines (
  id                 UUID PRIMARY KEY,
  quote_id           UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  order_item_id      UUID REFERENCES order_items(id) ON DELETE SET NULL,
  product_name       TEXT NOT NULL,
  quantity           INTEGER NOT NULL CHECK (quantity >= 1),
  supplier_name      TEXT NOT NULL DEFAULT '',
  supplier_currency  TEXT NOT NULL DEFAULT 'NGN',
  supplier_unit_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  fx_rate            NUMERIC(14,4) NOT NULL DEFAULT 1,
  fees_kobo          BIGINT NOT NULL DEFAULT 0,
  taxes_kobo         BIGINT NOT NULL DEFAULT 0,
  delivery_kobo      BIGINT NOT NULL DEFAULT 0,
  margin_type        TEXT NOT NULL DEFAULT 'percent' CHECK (margin_type IN ('percent','fixed')),
  margin_value       NUMERIC(14,2) NOT NULL DEFAULT 0,
  cost_kobo          BIGINT NOT NULL DEFAULT 0,
  price_kobo         BIGINT NOT NULL DEFAULT 0,
  internal_note      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS quotes_order_idx ON quotes (order_id, version DESC);

-- Payments received outside Paystack (e.g. bank transfer), recorded by an admin with evidence.
CREATE TABLE IF NOT EXISTS manual_payments (
  id          UUID PRIMARY KEY,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_id    UUID REFERENCES quotes(id) ON DELETE SET NULL,
  method      TEXT NOT NULL,
  reference   TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL CHECK (amount_kobo > 0),
  paid_on     DATE NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`,
  },
  {
    id: 3,
    name: "admin_security_and_audit",
    sql: `
-- Admin sessions live in the database so they can be revoked (logout) and work across several app instances.
-- Only a keyed hash of the random session token is stored, never the token itself.
CREATE TABLE IF NOT EXISTS admin_sessions (
  id           UUID PRIMARY KEY,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  revoked_at   TIMESTAMPTZ,
  revoked_reason TEXT NOT NULL DEFAULT '',
  ip_hash      TEXT NOT NULL DEFAULT '',
  user_agent   TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS admin_sessions_expiry_idx ON admin_sessions (expires_at);

-- Failed/successful admin sign-in attempts (keyed hash of the visitor address) for a limit that survives restarts.
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id         BIGSERIAL PRIMARY KEY,
  ip_hash    TEXT NOT NULL,
  succeeded  BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_login_attempts_idx ON admin_login_attempts (ip_hash, created_at DESC);

-- Append-only record of important administrator actions.
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_type  TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK (outcome IN ('success','failure','denied')),
  actor       TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT '',
  target_id   TEXT NOT NULL DEFAULT '',
  summary     TEXT NOT NULL DEFAULT '',
  details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS audit_log_time_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_type_idx ON audit_log (event_type, created_at DESC);

CREATE OR REPLACE FUNCTION audit_log_protect() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log records cannot be changed or deleted';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS audit_log_no_change ON audit_log;
CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_protect();
`,
  },
  {
    id: 4,
    name: "managed_services",
    sql: `
-- Services shown on the public website, edited in the admin. The built-in descriptions are copied in ONCE
-- (see seedServicesIfNeeded); later deployments never overwrite administrator edits.
CREATE TABLE IF NOT EXISTS services (
  id           UUID PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT 'code',
  category     TEXT NOT NULL DEFAULT 'Technology services',
  summary      TEXT NOT NULL DEFAULT '',
  problem      TEXT NOT NULL DEFAULT '',
  what         TEXT NOT NULL DEFAULT '',
  items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  good_for     JSONB NOT NULL DEFAULT '[]'::jsonb,
  inquiry_type TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','inactive')),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  price_text   TEXT NOT NULL DEFAULT '',
  image_id     UUID REFERENCES product_images(id) ON DELETE SET NULL,
  image_alt    TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS services_status_idx ON services (status, sort_order);
`,
  },
];
