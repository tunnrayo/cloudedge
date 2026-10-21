-- Cloud Edge website: inquiries table (PostgreSQL).
-- The website creates this automatically on first use. You can also run it by hand or with: npm run db:setup
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
