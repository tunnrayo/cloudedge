-- Cloud Edge website — full database schema (PostgreSQL).
-- Generated from src/lib/migrations.ts and src/lib/inquiries.ts by: npm run catalogue:report
-- The website applies these automatically on first start; running this file by hand (npm run db:setup) is optional.

-- Migration 1: shop_core
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

-- Contact / quote inquiries (managed by src/lib/inquiries.ts)
CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID PRIMARY KEY,
  reference     VARCHAR(16)  NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  status        VARCHAR(20)  NOT NULL DEFAULT 'new',
  notes         TEXT         NOT NULL DEFAULT '',
  email_status  VARCHAR(20)  NOT NULL DEFAULT 'not_configured',
  mode          VARCHAR(10)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(200) NOT NULL,
  phone         VARCHAR(30)  NOT NULL DEFAULT '',
  organization  VARCHAR(150) NOT NULL DEFAULT '',
  type          VARCHAR(80)  NOT NULL,
  budget        VARCHAR(60)  NOT NULL DEFAULT '',
  timeline      VARCHAR(60)  NOT NULL DEFAULT '',
  scope         TEXT         NOT NULL DEFAULT '',
  message       TEXT         NOT NULL DEFAULT '',
  product       VARCHAR(80)  NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS inquiries_created_at_idx ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS inquiries_status_idx ON inquiries (status);
