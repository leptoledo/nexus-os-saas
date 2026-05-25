-- ============================================================
-- NexusOS - Migration 001: Initial Schema
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE sector_type AS ENUM (
  'logistics',
  'technology',
  'retail',
  'health',
  'services'
);

CREATE TYPE plan_type AS ENUM (
  'starter',
  'pro',
  'business'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'manager',
  'viewer'
);

CREATE TYPE subscription_status AS ENUM (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete'
);

-- ============================================================
-- HELPER: updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLE: user_profiles
-- ============================================================

CREATE TABLE user_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    text,
  avatar_url   text,
  email        text,
  phone        text,
  language     text NOT NULL DEFAULT 'pt',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: organizations
-- ============================================================

CREATE TABLE organizations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text NOT NULL UNIQUE,
  sector                  sector_type,
  plan                    plan_type NOT NULL DEFAULT 'starter',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  subscription_status     subscription_status NOT NULL DEFAULT 'trialing',
  onboarding_completed    boolean NOT NULL DEFAULT false,
  logo_url                text,
  timezone                text NOT NULL DEFAULT 'Europe/Lisbon',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLE: organization_members
-- ============================================================

CREATE TABLE organization_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'viewer',
  invited_by  uuid REFERENCES auth.users(id),
  invited_at  timestamptz,
  joined_at   timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  UNIQUE(org_id, user_id)
);

-- ============================================================
-- TABLE: invitations
-- ============================================================

CREATE TABLE invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        user_role NOT NULL DEFAULT 'viewer',
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: onboarding_steps
-- ============================================================

CREATE TABLE onboarding_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  step_name    text NOT NULL,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  data         jsonb,
  UNIQUE(org_id, step_name)
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================

CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id),
  action        text NOT NULL,
  resource_type text,
  resource_id   text,
  details       jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index for common audit log queries
CREATE INDEX idx_audit_logs_org_id_created_at ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_org_members_org_id ON organization_members(org_id);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_onboarding_steps_org_id ON onboarding_steps(org_id);

-- ============================================================
-- TRIGGER: Auto-create user_profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY: enable
-- ============================================================

ALTER TABLE user_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;
