-- ============================================================
-- KIVO GYM MANAGEMENT — SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ============================================================
-- CLEANUP (drop everything first for clean install)
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_bar_sale ON sales;
DROP TRIGGER IF EXISTS on_new_visit ON visits;

DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;
DROP TABLE IF EXISTS platform_tariffs CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS districts CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS decrement_product_stock() CASCADE;
DROP FUNCTION IF EXISTS increment_visits_used() CASCADE;
DROP FUNCTION IF EXISTS auth_club_id() CASCADE;
DROP FUNCTION IF EXISTS auth_role() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS entity_status CASCADE;
DROP TYPE IF EXISTS sale_type CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS plan_duration_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;

-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('super_admin', 'club_director', 'staff');
CREATE TYPE entity_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE sale_type AS ENUM ('subscription', 'bar');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer');
CREATE TYPE plan_duration_type AS ENUM ('daily', 'visit_based');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'frozen', 'cancelled');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          user_role NOT NULL DEFAULT 'staff',
  club_id       UUID,
  branch_id     UUID,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  status        entity_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_club_id ON profiles(club_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- REGIONS & DISTRICTS
-- ============================================================
CREATE TABLE regions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE districts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  region_id  UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(region_id, name)
);

-- ============================================================
-- CURRENCIES
-- ============================================================
CREATE TABLE currencies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  symbol     TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  rate       NUMERIC(18,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLATFORM TARIFFS
-- ============================================================
CREATE TABLE platform_tariffs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  price        NUMERIC(18,2) NOT NULL,
  period_days  INT NOT NULL DEFAULT 30,
  features     JSONB NOT NULL DEFAULT '[]',
  status       entity_status NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLUBS
-- ============================================================
CREATE TABLE clubs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE,
  director_name     TEXT,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  region_id         UUID REFERENCES regions(id),
  district_id       UUID REFERENCES districts(id),
  tariff_id         UUID REFERENCES platform_tariffs(id),
  tariff_expires_at TIMESTAMPTZ,
  logo_url          TEXT,
  status            entity_status NOT NULL DEFAULT 'active',
  settings          JSONB NOT NULL DEFAULT '{
    "currency": "UZS",
    "timezone": "Asia/Tashkent",
    "discounts": {"m1": 0, "m3": 10, "m6": 15, "m12": 25},
    "locker_count": 50
  }',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BRANCHES
-- ============================================================
CREATE TABLE branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  manager    TEXT,
  status     entity_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_branches_club_id ON branches(club_id);

-- ============================================================
-- AGENTS
-- ============================================================
CREATE TABLE agents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL,
  phone       TEXT,
  username    TEXT UNIQUE NOT NULL,
  region_id   UUID REFERENCES regions(id),
  district_id UUID REFERENCES districts(id),
  schedule    TEXT,
  status      entity_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  price           NUMERIC(18,2) NOT NULL,
  duration_type   plan_duration_type NOT NULL DEFAULT 'daily',
  duration_value  INT NOT NULL,
  category        TEXT,
  amenities       JSONB NOT NULL DEFAULT '[]',
  time_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  start_time      TIME,
  end_time        TIME,
  status          entity_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_plans_club_id ON plans(club_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id       UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES branches(id),
  first_name    TEXT NOT NULL,
  last_name     TEXT,
  phone         TEXT,
  photo_url     TEXT,
  gender        TEXT CHECK (gender IN ('male', 'female', 'other')),
  birth_date    DATE,
  address       TEXT,
  locker_number INT,
  notes         TEXT,
  status        entity_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_customers_club_id ON customers(club_id);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  plan_id         UUID NOT NULL REFERENCES plans(id),
  plan_name       TEXT NOT NULL,
  plan_price      NUMERIC(18,2) NOT NULL,
  duration_type   plan_duration_type NOT NULL,
  duration_value  INT NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(18,2) NOT NULL,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  visits_total    INT,
  visits_used     INT NOT NULL DEFAULT 0,
  status          subscription_status NOT NULL DEFAULT 'active',
  sold_by         UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_club_id ON subscriptions(club_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- ============================================================
-- VISITS
-- ============================================================
CREATE TABLE visits (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id),
  customer_id      UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  subscription_id  UUID REFERENCES subscriptions(id),
  checked_in_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at   TIMESTAMPTZ,
  checked_in_by    UUID REFERENCES profiles(id),
  notes            TEXT
);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_club_id ON visits(club_id);
CREATE INDEX idx_visits_checked_in_at ON visits(checked_in_at);

-- ============================================================
-- PRODUCT CATEGORIES
-- ============================================================
CREATE TABLE product_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id    UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id          UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  category_id      UUID REFERENCES product_categories(id),
  name             TEXT NOT NULL,
  barcode          TEXT,
  image_url        TEXT,
  sell_price       NUMERIC(18,2) NOT NULL,
  purchase_price   NUMERIC(18,2) NOT NULL DEFAULT 0,
  quantity         INT NOT NULL DEFAULT 0,
  low_stock_alert  INT NOT NULL DEFAULT 10,
  status           entity_status NOT NULL DEFAULT 'active',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_club_id ON products(club_id);

-- ============================================================
-- SALES
-- ============================================================
CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id),
  type            sale_type NOT NULL,
  customer_id     UUID REFERENCES customers(id),
  subscription_id UUID REFERENCES subscriptions(id),
  product_id      UUID REFERENCES products(id),
  product_name    TEXT,
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(18,2) NOT NULL,
  discount_pct    NUMERIC(5,2) NOT NULL DEFAULT 0,
  amount          NUMERIC(18,2) NOT NULL,
  purchase_cost   NUMERIC(18,2) NOT NULL DEFAULT 0,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  sold_by         UUID REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_sales_club_id ON sales(club_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_type ON sales(type);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','clubs','branches','agents','plans','customers','subscriptions','products','currencies','platform_tariffs']
  LOOP
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- TRIGGERS: Auto-decrement stock on bar sale
-- ============================================================
CREATE OR REPLACE FUNCTION decrement_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'bar' AND NEW.product_id IS NOT NULL THEN
    UPDATE products
    SET quantity = GREATEST(0, quantity - NEW.quantity)
    WHERE id = NEW.product_id AND club_id = NEW.club_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_bar_sale
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION decrement_product_stock();

-- ============================================================
-- TRIGGERS: Increment visits_used on visit
-- ============================================================
CREATE OR REPLACE FUNCTION increment_visits_used()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_id IS NOT NULL THEN
    UPDATE subscriptions
    SET visits_used = visits_used + 1
    WHERE id = NEW.subscription_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_visit
  AFTER INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION increment_visits_used();

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================
CREATE OR REPLACE FUNCTION auth_club_id()
RETURNS UUID AS $$
  SELECT club_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_role() = 'super_admin';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: super_admin all" ON profiles FOR ALL USING (is_super_admin());
CREATE POLICY "profiles: own row" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles: director sees club members" ON profiles FOR SELECT USING (auth_role() = 'club_director' AND club_id = auth_club_id());
CREATE POLICY "profiles: own update" ON profiles FOR UPDATE USING (id = auth.uid());

-- Clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs: super_admin all" ON clubs FOR ALL USING (is_super_admin());
CREATE POLICY "clubs: members read own" ON clubs FOR SELECT USING (id = auth_club_id());

-- Branches
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "branches: super_admin all" ON branches FOR ALL USING (is_super_admin());
CREATE POLICY "branches: club read" ON branches FOR SELECT USING (club_id = auth_club_id());
CREATE POLICY "branches: director manage" ON branches FOR ALL USING (auth_role() = 'club_director' AND club_id = auth_club_id());

-- Customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers: super_admin all" ON customers FOR ALL USING (is_super_admin());
CREATE POLICY "customers: club read" ON customers FOR SELECT USING (club_id = auth_club_id());
CREATE POLICY "customers: director all" ON customers FOR ALL USING (auth_role() = 'club_director' AND club_id = auth_club_id());
CREATE POLICY "customers: staff insert" ON customers FOR INSERT WITH CHECK (auth_role() = 'staff' AND club_id = auth_club_id());
CREATE POLICY "customers: staff update" ON customers FOR UPDATE USING (auth_role() = 'staff' AND club_id = auth_club_id());

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs: super_admin all" ON subscriptions FOR ALL USING (is_super_admin());
CREATE POLICY "subs: club all" ON subscriptions FOR ALL USING (club_id = auth_club_id());

-- Visits
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "visits: super_admin all" ON visits FOR ALL USING (is_super_admin());
CREATE POLICY "visits: club all" ON visits FOR ALL USING (club_id = auth_club_id());

-- Plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans: super_admin all" ON plans FOR ALL USING (is_super_admin());
CREATE POLICY "plans: club read" ON plans FOR SELECT USING (club_id = auth_club_id());
CREATE POLICY "plans: director manage" ON plans FOR ALL USING (auth_role() = 'club_director' AND club_id = auth_club_id());

-- Products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products: super_admin all" ON products FOR ALL USING (is_super_admin());
CREATE POLICY "products: club read" ON products FOR SELECT USING (club_id = auth_club_id());
CREATE POLICY "products: director manage" ON products FOR ALL USING (auth_role() = 'club_director' AND club_id = auth_club_id());

-- Product Categories
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pcats: super_admin all" ON product_categories FOR ALL USING (is_super_admin());
CREATE POLICY "pcats: club all" ON product_categories FOR ALL USING (club_id = auth_club_id());

-- Sales
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales: super_admin all" ON sales FOR ALL USING (is_super_admin());
CREATE POLICY "sales: club all" ON sales FOR ALL USING (club_id = auth_club_id());

-- Regions/Districts (public read)
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "regions: all read" ON regions FOR SELECT USING (true);
CREATE POLICY "regions: super_admin write" ON regions FOR ALL USING (is_super_admin());

ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "districts: all read" ON districts FOR SELECT USING (true);
CREATE POLICY "districts: super_admin write" ON districts FOR ALL USING (is_super_admin());

-- Currencies (public read)
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "currencies: all read" ON currencies FOR SELECT USING (true);
CREATE POLICY "currencies: super_admin write" ON currencies FOR ALL USING (is_super_admin());

-- Platform tariffs (public read)
ALTER TABLE platform_tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tariffs: all read" ON platform_tariffs FOR SELECT USING (true);
CREATE POLICY "tariffs: super_admin write" ON platform_tariffs FOR ALL USING (is_super_admin());

-- Agents (super_admin only)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents: super_admin all" ON agents FOR ALL USING (is_super_admin());

-- ============================================================
-- SEED: Default currency
-- ============================================================
INSERT INTO currencies (code, name, symbol, is_default, rate)
VALUES ('UZS', 'O''zbek so''mi', 'so''m', TRUE, 1)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- HOW TO CREATE FIRST SUPER ADMIN:
-- 1. Go to Supabase Dashboard → Authentication → Users → Invite user
-- 2. After signup, update their profile:
--    UPDATE profiles SET role = 'super_admin' WHERE id = '<user-uuid>';
-- ============================================================
