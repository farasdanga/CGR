-- Farasdanga database schema (Cloudflare D1 / SQLite)
-- Simple by design: a free public directory + one paid feature (business ads).

CREATE TABLE IF NOT EXISTS admin_sessions (
  token TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT
);

CREATE TABLE IF NOT EXISTS providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  service TEXT NOT NULL,
  icon TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  bio TEXT,
  status TEXT DEFAULT 'approved',        -- approved | pending | rejected
  suggested_by_name TEXT,
  suggested_by_contact TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  business_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  website_url TEXT,                      -- optional link the ad redirects to when clicked
  whatsapp TEXT,                         -- optional, falls back to phone if blank
  image_data TEXT,                       -- base64 data URL of the banner image, or NULL
  amount INTEGER,                        -- amount paid, in paise
  placement TEXT DEFAULT 'directory',    -- directory | banner | popup — from the chosen ad plan
  duration_days INTEGER,                 -- from the chosen ad plan, snapshotted at submission time
  plan_name TEXT,                        -- from the chosen ad plan, snapshotted at submission time
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'pending_payment', -- pending_payment | pending_review | approved | rejected | expired
  refund_status TEXT,                    -- NULL | pending | refunded | failed
  razorpay_refund_id TEXT,
  starts_at TEXT,
  expires_at INTEGER,                    -- milliseconds since epoch (NOT a date string — see worker code)
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ad_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  placement TEXT NOT NULL,               -- directory | banner | popup
  duration_days INTEGER NOT NULL,
  price_rupees INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('hero_title1', 'Farasdanga''s Trusted Local Directory,'),
  ('hero_title2', '100% Free. Always.'),
  ('hero_subtitle', 'Find a Plumber, Cleaner, Carpenter and more in Farasdanga. See their number, call them directly. No fees, no middleman, ever.'),
  ('footer_about', 'A free community directory connecting Farasdanga residents with local service professionals. No charges to browse, call or hire — ever.'),
  ('contact_phone', '+91 98765 00000'),
  ('contact_email', 'hello@farasdanga.example');

INSERT OR IGNORE INTO categories (id, name, icon) VALUES
  (1, 'Plumber', '🪠'),
  (2, 'Cleaner', '🧹'),
  (3, 'Carpenter', '🪚'),
  (4, 'Painter', '🎨'),
  (5, 'Driver', '🚗'),
  (6, 'Security', '🛡️'),
  (7, 'Electrician', '💡');

INSERT OR IGNORE INTO providers (id, name, service, icon, phone, bio, status) VALUES
  (1, 'Ramesh Kumar', 'Plumber', '🪠', '+919800000001', '10 years experience in residential plumbing.', 'approved'),
  (2, 'Suresh Das', 'Carpenter', '🪚', '+919800000002', 'Custom furniture and repairs.', 'approved'),
  (3, 'Anita Roy', 'Cleaner', '🧹', '+919800000003', 'Deep home cleaning specialist.', 'approved');

INSERT OR IGNORE INTO ad_plans (id, name, placement, duration_days, price_rupees, active) VALUES
  (1, 'Directory Listing — 30 days', 'directory', 30, 499, 1),
  (2, 'Directory Listing — 90 days', 'directory', 90, 1299, 1),
  (3, 'Homepage Banner — 15 days', 'banner', 15, 1499, 1),
  (4, 'Homepage Banner — 30 days', 'banner', 30, 2499, 1),
  (5, 'Popup Spotlight — 7 days', 'popup', 7, 999, 1);
