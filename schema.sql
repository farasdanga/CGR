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
  amount INTEGER,                        -- amount paid, in paise
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT DEFAULT 'pending_payment', -- pending_payment | pending_review | approved | rejected | expired
  starts_at TEXT,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
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
  ('ad_price_rupees', '499'),
  ('ad_duration_days', '30'),
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
