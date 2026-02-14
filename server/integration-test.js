/**
 * VidAI Phase 6 — Full Integration Test Suite
 * Tests all backend endpoints end-to-end against running services.
 * 
 * Prerequisites:
 *   - Backend running on port 5000
 *   - AI service running on port 8000
 *   - MongoDB Atlas connected
 *   - Ollama running with llama3.2:3b
 * 
 * Run: node server/integration-test.js
 */

const BASE = 'http://localhost:5000/api/v1';
const AI_BASE = 'http://localhost:8000';
const TS = Date.now();

let passed = 0;
let failed = 0;
const results = [];

function log(test, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const line = `${icon} ${test}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ test, status, detail });
  if (status === 'PASS') passed++;
  else failed++;
}

async function req(method, path, body = null, token = null, base = BASE) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${base}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, headers: res.headers };
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 1: Health Checks
// ══════════════════════════════════════════════════════════════
async function testHealth() {
  console.log('\n═══ 1. HEALTH CHECKS ═══');

  // Backend health
  const h1 = await req('GET', '/health');
  log('Backend health', h1.status === 200 && h1.data.success ? 'PASS' : 'FAIL', `status=${h1.status}`);

  // AI service health
  const h2 = await req('GET', '/health', null, null, AI_BASE);
  log('AI service health', h2.status === 200 && h2.data.status === 'healthy' ? 'PASS' : 'FAIL',
    `ollama=${h2.data?.ollama?.status}`);
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 2: Auth Flow
// ══════════════════════════════════════════════════════════════
let userToken = '';
let vendorToken = '';
let adminToken = '';
let userId = '';
let vendorUserId = '';
let _adminUserId = '';

async function testAuth() {
  console.log('\n═══ 2. AUTH FLOW ═══');

  // 2.1 Register a regular user
  const r1 = await req('POST', '/auth/register', {
    name: `TestUser${TS}`,
    email: `testuser${TS}@vidai.pk`,
    password: 'Test1234!',
    role: 'user',
    phone: '+923001234567',
  });
  log('Register user', r1.status === 201 ? 'PASS' : 'FAIL', `status=${r1.status}`);
  if (r1.data?.data?.accessToken) {
    userToken = r1.data.data.accessToken;
    userId = r1.data.data.user.id;
  }

  // 2.2 Register a vendor
  const r2 = await req('POST', '/auth/register', {
    name: `TestVendor${TS}`,
    email: `testvendor${TS}@vidai.pk`,
    password: 'Test1234!',
    role: 'vendor',
    phone: '+923009876543',
  });
  log('Register vendor', r2.status === 201 ? 'PASS' : 'FAIL', `status=${r2.status}`);
  if (r2.data?.data?.accessToken) {
    vendorToken = r2.data.data.accessToken;
    vendorUserId = r2.data.data.user.id;
  }

  // 2.3 Register an admin
  const r3 = await req('POST', '/auth/register', {
    name: `TestAdmin${TS}`,
    email: `testadmin${TS}@vidai.pk`,
    password: 'Test1234!',
    role: 'admin',
    phone: '+923005555555',
  });
  log('Register admin', r3.status === 201 ? 'PASS' : 'FAIL', `status=${r3.status}`);
  if (r3.data?.data?.accessToken) {
    adminToken = r3.data.data.accessToken;
    _adminUserId = r3.data.data.user.id;
  }

  // 2.4 Login with user
  const r4 = await req('POST', '/auth/login', {
    email: `testuser${TS}@vidai.pk`,
    password: 'Test1234!',
  });
  log('Login user', r4.status === 200 && r4.data.data?.accessToken ? 'PASS' : 'FAIL', `status=${r4.status}`);
  if (r4.data?.data?.accessToken) userToken = r4.data.data.accessToken;

  // 2.5 Login with wrong password
  const r5 = await req('POST', '/auth/login', {
    email: `testuser${TS}@vidai.pk`,
    password: 'WrongPassword!',
  });
  log('Login wrong password rejected', r5.status === 401 ? 'PASS' : 'FAIL', `status=${r5.status}`);

  // 2.6 Get /me with valid token
  const r6 = await req('GET', '/auth/me', null, userToken);
  log('GET /me with token', r6.status === 200 && r6.data.data?.user?.email ? 'PASS' : 'FAIL', `status=${r6.status}`);

  // 2.7 Get /me without token (should fail)
  const r7 = await req('GET', '/auth/me');
  log('GET /me without token rejected', r7.status === 401 ? 'PASS' : 'FAIL', `status=${r7.status}`);

  // 2.8 Duplicate registration
  const r8 = await req('POST', '/auth/register', {
    name: `TestUser${TS}`,
    email: `testuser${TS}@vidai.pk`,
    password: 'Test1234!',
    role: 'user',
  });
  log('Duplicate email rejected', r8.status === 400 ? 'PASS' : 'FAIL', `status=${r8.status}`);
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 3: Vendor CRUD
// ══════════════════════════════════════════════════════════════
async function testVendorCRUD() {
  console.log('\n═══ 3. VENDOR CRUD ═══');

  // 3.1 Create vendor profile
  const r1 = await req('POST', '/vendors/profile', {
    businessName: `TestBusiness${TS}`,
    category: 'photographer',
    description: 'Professional wedding photographer in Lahore',
    city: 'Lahore',
    address: '123 Test Street, Gulberg, Lahore',
    phone: '+923009876543',
    startingPrice: 150000,
    experience: 5,
    packages: [
      { name: 'Basic', price: 150000, description: 'Basic coverage', features: ['4 hours', '100 photos'] },
      { name: 'Premium', price: 350000, description: 'Full day coverage', features: ['Full day', '500 photos', 'Album'] },
    ],
  }, vendorToken);
  log('Create vendor profile', r1.status === 201 ? 'PASS' : 'FAIL', `status=${r1.status}`);

  // 3.2 Get own vendor profile
  const r2 = await req('GET', '/vendors/me/profile', null, vendorToken);
  log('Get own vendor profile', r2.status === 200 && r2.data.data?.vendor ? 'PASS' : 'FAIL', `status=${r2.status}`);

  // 3.3 Update vendor profile (PUT /vendors/me/profile)
  const r3 = await req('PUT', '/vendors/me/profile', {
    description: 'Award-winning wedding photographer in Lahore with 5+ years experience',
    startingPrice: 175000,
  }, vendorToken);
  log('Update vendor profile', r3.status === 200 ? 'PASS' : 'FAIL', `status=${r3.status}`);

  // 3.4 Get public vendor listing
  const r4 = await req('GET', '/vendors');
  log('Get vendors listing (public)', r4.status === 200 ? 'PASS' : 'FAIL', `status=${r4.status}`);

  // 3.5 User cannot create vendor profile
  const r5 = await req('POST', '/vendors/profile', {
    businessName: 'Unauthorized Business',
    category: 'venue',
  }, userToken);
  log('User cannot create vendor profile', r5.status === 403 ? 'PASS' : 'FAIL', `status=${r5.status}`);
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 4: Admin Endpoints
// ══════════════════════════════════════════════════════════════
async function testAdmin() {
  console.log('\n═══ 4. ADMIN ENDPOINTS ═══');

  // 4.1 Admin dashboard stats
  const r1 = await req('GET', '/admin/dashboard', null, adminToken);
  log('Admin dashboard', r1.status === 200 && r1.data.data?.stats ? 'PASS' : 'FAIL', `status=${r1.status}`);

  // 4.2 Admin get all users
  const r2 = await req('GET', '/admin/users', null, adminToken);
  log('Admin get users', r2.status === 200 ? 'PASS' : 'FAIL', `status=${r2.status}`);

  // 4.3 Admin get vendors
  const r3 = await req('GET', '/admin/vendors', null, adminToken);
  log('Admin get vendors', r3.status === 200 ? 'PASS' : 'FAIL', `status=${r3.status}`);

  // 4.4 Admin get activity logs
  const r4 = await req('GET', '/admin/activity-logs', null, adminToken);
  log('Admin get logs', r4.status === 200 ? 'PASS' : 'FAIL', `status=${r4.status}`);

  // 4.5 Regular user cannot access admin
  const r5 = await req('GET', '/admin/dashboard', null, userToken);
  log('User blocked from admin', r5.status === 403 ? 'PASS' : 'FAIL', `status=${r5.status}`);

  // 4.6 Vendor cannot access admin
  const r6 = await req('GET', '/admin/dashboard', null, vendorToken);
  log('Vendor blocked from admin', r6.status === 403 ? 'PASS' : 'FAIL', `status=${r6.status}`);
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 5: AI Endpoints (via Backend Proxy)
// ══════════════════════════════════════════════════════════════
async function testAIProxy() {
  console.log('\n═══ 5. AI ENDPOINTS (Backend → AI Service) ═══');

  // 5.1 Chat via backend proxy
  const r1 = await req('POST', '/ai/chat', {
    message: 'What is a typical mehndi ceremony?',
    conversationHistory: [],
  }, userToken);
  const chatOk = r1.status === 200 && r1.data.data?.response;
  log('AI Chat via proxy', chatOk ? 'PASS' : 'FAIL',
    `status=${r1.status}, response=${chatOk ? r1.data.data.response.substring(0, 60) + '...' : 'none'}`);

  // 5.2 Budget plan via backend proxy
  const r2 = await req('POST', '/ai/budget-plan', {
    totalBudget: 2000000,
    eventType: 'walima',
    preferences: { guestCount: 200, city: 'Islamabad' },
  }, userToken);
  const budgetOk = r2.status === 200 && r2.data.success;
  log('AI Budget Plan via proxy', budgetOk ? 'PASS' : 'FAIL',
    `status=${r2.status}, hasData=${!!r2.data.data}, fallback=${r2.data.data?.fallback || false}`);

  // 5.3 Recommendations via backend proxy
  const r3 = await req('POST', '/ai/recommendations', {
    preferences: { style: 'modern' },
    budget: 500000,
    city: 'Lahore',
    category: 'venue',
  }, userToken);
  const recOk = r3.status === 200 && r3.data.data;
  log('AI Recommendations via proxy', recOk ? 'PASS' : 'FAIL', `status=${r3.status}`);

  // 5.4 AI endpoint without auth (should fail)
  const r4 = await req('POST', '/ai/chat', { message: 'test' });
  log('AI chat without auth rejected', r4.status === 401 ? 'PASS' : 'FAIL', `status=${r4.status}`);

  // 5.5 AI chat with empty message (should fail)
  const r5 = await req('POST', '/ai/chat', { message: '' }, userToken);
  log('AI chat empty message rejected', r5.status === 400 ? 'PASS' : 'FAIL', `status=${r5.status}`);

  // 5.6 AI budget with negative amount (should fail)
  const r6 = await req('POST', '/ai/budget-plan', { totalBudget: -100 }, userToken);
  log('AI budget negative amount rejected', r6.status === 400 ? 'PASS' : 'FAIL', `status=${r6.status}`);
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 6: Security Checks
// ══════════════════════════════════════════════════════════════
async function testSecurity() {
  console.log('\n═══ 6. SECURITY CHECKS ═══');

  // 6.1 Invalid JWT rejected
  const r1 = await req('GET', '/auth/me', null, 'invalid.jwt.token');
  log('Invalid JWT rejected', r1.status === 401 ? 'PASS' : 'FAIL', `status=${r1.status}`);

  // 6.2 NoSQL injection attempt
  const r2 = await req('POST', '/auth/login', {
    email: { '$gt': '' },
    password: 'test',
  });
  log('NoSQL injection blocked', r2.status !== 200 ? 'PASS' : 'FAIL', `status=${r2.status}`);

  // 6.3 Check security headers (helmet)
  const r3 = await req('GET', '/health');
  const hasXFrame = r3.headers.get('x-frame-options') !== null;
  const hasCSP = r3.headers.get('content-security-policy') !== null;
  log('Security headers present', hasXFrame || hasCSP ? 'PASS' : 'FAIL',
    `x-frame-options=${hasXFrame}, csp=${hasCSP}`);

  // 6.4 CORS headers
  const opts = {
    method: 'OPTIONS',
    headers: { 'Origin': 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' },
  };
  const r4 = await fetch(`${BASE}/health`, opts);
  const corsHeader = r4.headers.get('access-control-allow-origin');
  log('CORS configured', corsHeader ? 'PASS' : 'FAIL', `allow-origin=${corsHeader}`);

  // 6.5 Body size limit
  const bigBody = { message: 'x'.repeat(11 * 1024 * 1024) }; // 11MB
  try {
    const r5 = await req('POST', '/ai/chat', bigBody, userToken);
    log('Large body rejected', r5.status === 413 || r5.status === 400 ? 'PASS' : 'FAIL', `status=${r5.status}`);
  } catch {
    log('Large body rejected', 'PASS', 'request failed (expected)');
  }
}

// ══════════════════════════════════════════════════════════════
// TEST GROUP 7: Booking & Budget Endpoints
// ══════════════════════════════════════════════════════════════
async function testBookingBudget() {
  console.log('\n═══ 7. BOOKING & BUDGET ═══');

  // 7.1 Create a budget
  const r1 = await req('POST', '/budget', {
    totalBudget: 5000000,
    eventType: 'full_wedding',
    items: [
      { category: 'venue', allocatedAmount: 1500000, notes: 'Marquee in Lahore' },
      { category: 'catering', allocatedAmount: 1200000, notes: 'Per head 4000 x 300' },
    ],
  }, userToken);
  log('Create budget', r1.status === 200 || r1.status === 201 ? 'PASS' : 'FAIL', `status=${r1.status}`);

  // 7.2 Get user budget
  const r2 = await req('GET', '/budget/me', null, userToken);
  log('Get budget', r2.status === 200 ? 'PASS' : 'FAIL', `status=${r2.status}`);
}

// ══════════════════════════════════════════════════════════════
// CLEANUP: Remove test data
// ══════════════════════════════════════════════════════════════
async function cleanup() {
  console.log('\n═══ CLEANUP ═══');
  // Deactivate test users via admin
  if (adminToken && userId) {
    await req('PATCH', `/admin/users/${userId}/toggle-status`, {}, adminToken);
  }
  if (adminToken && vendorUserId) {
    await req('PATCH', `/admin/users/${vendorUserId}/toggle-status`, {}, adminToken);
  }
  console.log('Test users deactivated');
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     VidAI Phase 6 — Full Integration Test Suite        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  await testHealth();
  await testAuth();
  await testVendorCRUD();
  await testAdmin();
  await testAIProxy();
  await testSecurity();
  await testBookingBudget();
  await cleanup();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.test} — ${r.detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Test suite error:', e); process.exit(1); });
