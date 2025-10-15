-- Enable UUID generation (for gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUM TYPES
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'install_status') THEN
    CREATE TYPE install_status AS ENUM ('scheduled','in_progress','completed','failed','canceled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type') THEN
    CREATE TYPE media_type AS ENUM ('photo','signature');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notif_kind') THEN
    CREATE TYPE notif_kind AS ENUM ('email','sms','push','webhook');
  END IF;
END$$;

-- =========================
-- USERS & ROLES
-- =========================
CREATE TABLE IF NOT EXISTS roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         varchar(48)  NOT NULL UNIQUE,
  permissions  jsonb,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          varchar(120) NOT NULL,
  email         varchar(160) NOT NULL UNIQUE,
  phone         varchar(32),
  role_id       uuid         NOT NULL REFERENCES roles(id),
  status        varchar(24)  NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_role_id ON users(role_id);

-- =========================
-- STORES / LOCATIONS
-- =========================
CREATE TABLE IF NOT EXISTS addresses (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  line1        varchar(180)  NOT NULL,
  line2        varchar(180),
  city         varchar(120),
  region       varchar(120),
  postal_code  varchar(24),
  country      varchar(2),
  lat          decimal(10,7),
  lng          decimal(10,7),
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stores (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name               varchar(160)  NOT NULL,
  address_id         uuid          REFERENCES addresses(id) ON DELETE SET NULL,
  timezone           varchar(64),
  external_store_id  varchar(64),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_stores_address_id         ON stores(address_id);
CREATE INDEX IF NOT EXISTS ix_stores_external_store_id  ON stores(external_store_id);

-- =========================
-- INSTALLATION MANAGEMENT
-- =========================
CREATE TABLE IF NOT EXISTS installations (
  id                 uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  external_order_id  varchar(64)     NOT NULL,
  store_id           uuid            NOT NULL REFERENCES stores(id),
  scheduled_start    timestamptz,
  scheduled_end      timestamptz,
  status             install_status  NOT NULL DEFAULT 'scheduled',
  notes              text,
  created_by         uuid            REFERENCES users(id) ON DELETE SET NULL,
  updated_by         uuid            REFERENCES users(id) ON DELETE SET NULL,
  created_at         timestamptz     NOT NULL DEFAULT now(),
  updated_at         timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_installations_store_id         ON installations(store_id);
CREATE INDEX IF NOT EXISTS ix_installations_external_order   ON installations(external_order_id);
CREATE INDEX IF NOT EXISTS ix_installations_status           ON installations(status);

CREATE TABLE IF NOT EXISTS installation_items (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id       uuid          NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  external_product_id   varchar(64)   NOT NULL,
  quantity              int           NOT NULL DEFAULT 1,
  room_tag              varchar(80),
  special_instructions  text,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_iitems_installation_id   ON installation_items(installation_id);
CREATE INDEX IF NOT EXISTS ix_iitems_external_product  ON installation_items(external_product_id);

CREATE TABLE IF NOT EXISTS crew_assignments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid        NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  crew_user_id     uuid        NOT NULL REFERENCES users(id),
  role             varchar(48),
  accepted_at      timestamptz,
  declined_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_crew_installation_id ON crew_assignments(installation_id);
CREATE INDEX IF NOT EXISTS ix_crew_user_id         ON crew_assignments(crew_user_id);

-- =========================
-- CHECKLISTS
-- =========================
CREATE TABLE IF NOT EXISTS checklist_templates (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(160)  NOT NULL,
  version    int           NOT NULL DEFAULT 1,
  rules      jsonb,
  created_at timestamptz   NOT NULL DEFAULT now(),
  updated_at timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid          NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  label       varchar(200)  NOT NULL,
  type        varchar(48)   NOT NULL,
  required    boolean       NOT NULL DEFAULT false,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_citems_template_id ON checklist_items(template_id);

CREATE TABLE IF NOT EXISTS checklist_responses (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid         NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  item_id          uuid         NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  value            jsonb,
  completed_at     timestamptz,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_cresponses_installation_id ON checklist_responses(installation_id);
CREATE INDEX IF NOT EXISTS ix_cresponses_item_id         ON checklist_responses(item_id);

-- =========================
-- MEDIA / DOCUMENTATION
-- =========================
CREATE TABLE IF NOT EXISTS media_assets (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id  uuid         NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  url              varchar(500) NOT NULL,
  type             media_type   NOT NULL,
  tags             jsonb,
  sha256           varchar(64),
  created_by       uuid         REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_media_installation_id ON media_assets(installation_id);
CREATE INDEX IF NOT EXISTS ix_media_type            ON media_assets(type);
CREATE INDEX IF NOT EXISTS ix_media_created_by      ON media_assets(created_by);

-- =========================
-- COMMUNICATION & LOGGING
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             notif_kind   NOT NULL,
  payload          jsonb        NOT NULL,
  status           varchar(24)  NOT NULL DEFAULT 'queued',
  attempt_count    int          NOT NULL DEFAULT 0,
  last_attempt_at  timestamptz,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notifications_kind   ON notifications(kind);
CREATE INDEX IF NOT EXISTS ix_notifications_status ON notifications(status);

CREATE TABLE IF NOT EXISTS webhooks (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name       varchar(120)  NOT NULL,
  target_url varchar(500)  NOT NULL,
  secret     varchar(120),
  events     jsonb,
  created_at timestamptz   NOT NULL DEFAULT now(),
  updated_at timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  event      varchar(120)  NOT NULL,
  payload    jsonb         NOT NULL,
  delivered  boolean       NOT NULL DEFAULT false,
  signature  varchar(180),
  created_at timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_webevents_event      ON webhook_events(event);
CREATE INDEX IF NOT EXISTS ix_webevents_delivered  ON webhook_events(delivered);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         bigserial     PRIMARY KEY,
  actor_id   uuid,
  action     varchar(120)  NOT NULL,
  entity     varchar(120)  NOT NULL,
  entity_id  uuid,
  data       jsonb,
  ip         varchar(45),
  created_at timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_audit_actor_id  ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_action    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS ix_audit_created   ON audit_logs(created_at);
