/**
 * Farasdanga API — Cloudflare Worker
 * A free public directory (no login needed to browse or call) plus one paid
 * feature: businesses can pay to post an ad, which the admin approves.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await router(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (err) {
      return json({ error: 'Server error', detail: String(err) }, 500);
    }
  }
};

/* ============================== ROUTER ============================== */
async function router(request, env, url) {
  const { pathname } = url;
  const method = request.method;

  // ---- Public: browse ----
  if (pathname === '/api/categories' && method === 'GET') return listCategories(env);
  if (pathname === '/api/providers' && method === 'GET') return listProviders(env);
  if (pathname === '/api/ads' && method === 'GET') return listAds(env);
  if (pathname === '/api/settings' && method === 'GET') return getSettings(env);

  // ---- Public: free provider suggestion (no login, no payment) ----
  if (pathname === '/api/providers/suggest' && method === 'POST') return suggestProvider(request, env);

  // ---- Public: paid ad flow ----
  if (pathname === '/api/ads/create-order' && method === 'POST') return createAdOrder(request, env);
  if (pathname === '/api/ads/verify-payment' && method === 'POST') return verifyAdPayment(request, env);

  // ---- Admin ----
  if (pathname === '/api/admin/login' && method === 'POST') return adminLogin(request, env);
  if (pathname === '/api/admin/logout' && method === 'POST') return adminLogout(request, env);
  if (pathname === '/api/admin/dashboard' && method === 'GET') return adminOnly(request, env, adminDashboard);
  if (pathname === '/api/admin/providers' && method === 'GET') return adminOnly(request, env, adminListProviders);
  if (pathname === '/api/admin/providers' && method === 'POST') return adminOnly(request, env, (r, e) => adminSaveProvider(r, e, null));
  if (pathname.match(/^\/api\/admin\/providers\/\d+$/) && method === 'PUT') return adminOnly(request, env, (r, e) => adminSaveProvider(r, e, idFromPath(pathname)));
  if (pathname.match(/^\/api\/admin\/providers\/\d+$/) && method === 'DELETE') return adminOnly(request, env, () => adminDeleteProvider(env, idFromPath(pathname)));
  if (pathname.match(/^\/api\/admin\/providers\/\d+\/approve$/) && method === 'POST') return adminOnly(request, env, () => adminApproveProvider(env, idFromPath(pathname)));
  if (pathname.match(/^\/api\/admin\/providers\/\d+\/reject$/) && method === 'POST') return adminOnly(request, env, () => adminRejectProvider(env, idFromPath(pathname)));
  if (pathname === '/api/admin/categories' && method === 'POST') return adminOnly(request, env, adminSaveCategory);
  if (pathname.match(/^\/api\/admin\/categories\/\d+$/) && method === 'DELETE') return adminOnly(request, env, () => adminDeleteCategory(env, idFromPath(pathname)));
  if (pathname === '/api/admin/ads' && method === 'GET') return adminOnly(request, env, adminListAds);
  if (pathname.match(/^\/api\/admin\/ads\/\d+\/approve$/) && method === 'POST') return adminOnly(request, env, () => adminApproveAd(env, idFromPath(pathname)));
  if (pathname.match(/^\/api\/admin\/ads\/\d+\/reject$/) && method === 'POST') return adminOnly(request, env, () => adminRejectAd(env, idFromPath(pathname)));
  if (pathname.match(/^\/api\/admin\/ads\/\d+$/) && method === 'DELETE') return adminOnly(request, env, () => adminDeleteAd(env, idFromPath(pathname)));
  if (pathname === '/api/admin/settings' && method === 'POST') return adminOnly(request, env, adminSaveSettings);

  return json({ error: 'Not found' }, 404);
}

function idFromPath(pathname) { return Number(pathname.match(/\d+/)[0]); }

/* ============================== HELPERS ============================== */
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extraHeaders } });
}
function getCookie(request, name) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}
function cookieHeader(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}
function clearCookieHeader(name) { return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }
function randomToken() { return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, ''); }

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function adminOnly(request, env, handler) {
  const token = getCookie(request, 'admin_session');
  if (!token) return json({ error: 'Admin login required' }, 401);
  const row = await env.DB.prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")').bind(token).first();
  if (!row) return json({ error: 'Admin login required' }, 401);
  return handler(request, env);
}

/* ============================== PUBLIC: BROWSE ============================== */
async function listCategories(env) {
  const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY id').all();
  return json({ categories: results });
}
async function listProviders(env) {
  const { results } = await env.DB.prepare("SELECT id, name, service, icon, phone, whatsapp, bio FROM providers WHERE status = 'approved' ORDER BY id DESC").all();
  return json({ providers: results });
}
async function listAds(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, business_name, description, icon, phone FROM ads WHERE status = 'approved' AND expires_at > datetime('now') ORDER BY id DESC"
  ).all();
  return json({ ads: results });
}
async function getSettings(env) {
  const { results } = await env.DB.prepare('SELECT * FROM settings').all();
  const settings = {};
  results.forEach(r => settings[r.key] = r.value);
  return json({ settings });
}

/* ============================== PUBLIC: FREE PROVIDER SUGGESTION ============================== */
async function suggestProvider(request, env) {
  const body = await request.json();
  const { name, service, phone, whatsapp, bio, suggestedByName, suggestedByContact } = body;
  if (!name || !service || !phone) return json({ error: 'Name, service and phone are required.' }, 400);

  const category = await env.DB.prepare('SELECT icon FROM categories WHERE name = ?').bind(service).first();
  const icon = category ? category.icon : '🔧';

  await env.DB.prepare(
    `INSERT INTO providers (name, service, icon, phone, whatsapp, bio, status, suggested_by_name, suggested_by_contact)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  ).bind(name, service, icon, phone, whatsapp || null, bio || '', suggestedByName || '', suggestedByContact || '').run();

  return json({ ok: true, message: 'Thanks! Submitted for review.' });
}

/* ============================== PUBLIC: PAID BUSINESS ADS ============================== */
async function createAdOrder(request, env) {
  const body = await request.json();
  const { businessName, description, phone, email, icon } = body;
  if (!businessName || !phone) return json({ error: 'Business name and phone are required.' }, 400);

  const priceSetting = await env.DB.prepare("SELECT value FROM settings WHERE key = 'ad_price_rupees'").first();
  const rupees = Number(priceSetting?.value || 499);
  const amountPaise = rupees * 100;

  const auth = btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`);
  const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: `ad_${Date.now()}` })
  });
  const order = await orderRes.json();
  if (!order.id) return json({ error: 'Could not create payment order.', detail: order }, 502);

  const result = await env.DB.prepare(
    `INSERT INTO ads (business_name, description, icon, phone, email, amount, razorpay_order_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment')`
  ).bind(businessName, description || '', icon || '📢', phone, email || '', amountPaise, order.id).run();

  return json({ adId: result.meta.last_row_id, orderId: order.id, amount: amountPaise, keyId: env.RAZORPAY_KEY_ID });
}

async function verifyAdPayment(request, env) {
  const { adId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
  const expected = await hmacHex(env.RAZORPAY_KEY_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
  if (expected !== razorpay_signature) return json({ error: 'Payment verification failed.' }, 400);

  const ad = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(adId).first();
  if (!ad) return json({ error: 'Ad not found.' }, 404);

  await env.DB.prepare("UPDATE ads SET status = 'pending_review', razorpay_payment_id = ? WHERE id = ?").bind(razorpay_payment_id, adId).run();
  return json({ ok: true, message: 'Payment received. Your ad will go live once approved.' });
}

/* ============================== ADMIN: AUTH ============================== */
async function adminLogin(request, env) {
  const { password } = await request.json();
  if (password !== env.ADMIN_PASSWORD) return json({ error: 'Incorrect password.' }, 401);
  const token = randomToken();
  const expires = new Date(Date.now() + 12 * 3600 * 1000).toISOString();
  await env.DB.prepare('INSERT INTO admin_sessions (token, expires_at) VALUES (?, ?)').bind(token, expires).run();
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('admin_session', token, 12 * 3600) });
}
async function adminLogout(request, env) {
  return json({ ok: true }, 200, { 'Set-Cookie': clearCookieHeader('admin_session') });
}

/* ============================== ADMIN: DASHBOARD ============================== */
async function adminDashboard(request, env) {
  const providers = await env.DB.prepare("SELECT COUNT(*) as n FROM providers WHERE status = 'approved'").first();
  const pendingProviders = await env.DB.prepare("SELECT COUNT(*) as n FROM providers WHERE status = 'pending'").first();
  const liveAds = await env.DB.prepare("SELECT COUNT(*) as n FROM ads WHERE status = 'approved' AND expires_at > datetime('now')").first();
  const pendingAds = await env.DB.prepare("SELECT COUNT(*) as n FROM ads WHERE status = 'pending_review'").first();
  const revenue = await env.DB.prepare("SELECT COALESCE(SUM(amount),0) as total FROM ads WHERE status IN ('pending_review','approved','expired')").first();
  return json({
    totalProviders: providers.n, pendingProviders: pendingProviders.n,
    liveAds: liveAds.n, pendingAds: pendingAds.n, adRevenue: revenue.total
  });
}

/* ============================== ADMIN: PROVIDERS ============================== */
async function adminListProviders(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM providers ORDER BY id DESC').all();
  return json({ providers: results });
}
async function adminSaveProvider(request, env, id) {
  const b = await request.json();
  const category = await env.DB.prepare('SELECT icon FROM categories WHERE name = ?').bind(b.service).first();
  const icon = category ? category.icon : '🔧';
  if (id) {
    await env.DB.prepare('UPDATE providers SET name=?, service=?, icon=?, phone=?, whatsapp=?, bio=?, status=? WHERE id=?')
      .bind(b.name, b.service, icon, b.phone, b.whatsapp || null, b.bio, b.status, id).run();
  } else {
    await env.DB.prepare("INSERT INTO providers (name, service, icon, phone, whatsapp, bio, status) VALUES (?,?,?,?,?,?, 'approved')")
      .bind(b.name, b.service, icon, b.phone, b.whatsapp || null, b.bio).run();
  }
  return json({ ok: true });
}
async function adminDeleteProvider(env, id) {
  await env.DB.prepare('DELETE FROM providers WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
async function adminApproveProvider(env, id) {
  await env.DB.prepare("UPDATE providers SET status = 'approved' WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
async function adminRejectProvider(env, id) {
  await env.DB.prepare("UPDATE providers SET status = 'rejected' WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

/* ============================== ADMIN: CATEGORIES ============================== */
async function adminSaveCategory(request, env) {
  const { id, name, icon } = await request.json();
  if (id) await env.DB.prepare('UPDATE categories SET name=?, icon=? WHERE id=?').bind(name, icon, id).run();
  else await env.DB.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)').bind(name, icon).run();
  return json({ ok: true });
}
async function adminDeleteCategory(env, id) {
  await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

/* ============================== ADMIN: ADS ============================== */
async function adminListAds(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM ads ORDER BY id DESC').all();
  return json({ ads: results });
}
async function adminApproveAd(env, id) {
  const setting = await env.DB.prepare("SELECT value FROM settings WHERE key = 'ad_duration_days'").first();
  const days = Number(setting?.value || 30);
  const expires = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
  await env.DB.prepare("UPDATE ads SET status = 'approved', starts_at = datetime('now'), expires_at = ? WHERE id = ?").bind(expires, id).run();
  return json({ ok: true });
}
async function adminRejectAd(env, id) {
  await env.DB.prepare("UPDATE ads SET status = 'rejected' WHERE id = ?").bind(id).run();
  return json({ ok: true });
}
async function adminDeleteAd(env, id) {
  await env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

/* ============================== ADMIN: SITE SETTINGS ============================== */
async function adminSaveSettings(request, env) {
  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, value).run();
  }
  return json({ ok: true });
}
