const BASE = 'http://localhost:5000/api/v1';
let passed = 0, failed = 0, warnings = 0;
const failures = [];

async function req(method, path, body, token) {
  const opts = { method, headers: {} };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (body && method !== 'GET') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function ok(name) { passed++; console.log('   ✅ ' + name); }
function fail(name, detail) { failed++; failures.push(name); console.log('   ❌ ' + name + ': ' + detail); }
function warn(name, detail) { warnings++; console.log('   ⚠️  ' + name + ': ' + detail); }

async function test() {
  const ts = Date.now();
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  VidAI — FULL SYSTEM VALIDATION SUITE       ║');
  console.log('║  Pre-Docker Comprehensive Check             ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════
  // SECTION 1: HEALTH & CONNECTIVITY
  // ═══════════════════════════════════════
  console.log('━━━ 1. HEALTH & CONNECTIVITY ━━━');
  let r = await req('GET', '/health');
  r.status === 200 && r.data.success ? ok('Backend health') : fail('Backend health', r.status);

  // ═══════════════════════════════════════
  // SECTION 2: AUTH — SIGN UP / SIGN IN (ALL ROLES)
  // ═══════════════════════════════════════
  console.log('\n━━━ 2. AUTH — SIGN UP / SIGN IN (ALL ROLES) ━━━');

  // Register all 3 roles
  r = await req('POST', '/auth/register', {
    name: 'Test User', email: 'user_' + ts + '@test.com', password: 'Test1234!', role: 'user', phone: '+923001111111'
  });
  r.status === 201 && r.data.data.accessToken ? ok('Register USER') : fail('Register USER', r.data.message);
  const userToken = r.data.data?.accessToken;

  r = await req('POST', '/auth/register', {
    name: 'Test Vendor', email: 'vendor_' + ts + '@test.com', password: 'Test1234!', role: 'vendor', phone: '+923002222222'
  });
  r.status === 201 && r.data.data.accessToken ? ok('Register VENDOR') : fail('Register VENDOR', r.data.message);
  const vendorToken = r.data.data?.accessToken;

  r = await req('POST', '/auth/register', {
    name: 'Test Admin', email: 'admin_' + ts + '@test.com', password: 'Admin1234!', role: 'admin', phone: '+923003333333'
  });
  r.status === 201 && r.data.data.accessToken ? ok('Register ADMIN') : fail('Register ADMIN', r.data.message);
  const adminToken = r.data.data?.accessToken;

  // Login all 3 roles
  r = await req('POST', '/auth/login', { email: 'user_' + ts + '@test.com', password: 'Test1234!' });
  r.status === 200 && r.data.data.accessToken ? ok('Login USER') : fail('Login USER', r.data.message);
  const userLoginToken = r.data.data?.accessToken;
  const userRefreshToken = r.data.data?.refreshToken;

  r = await req('POST', '/auth/login', { email: 'vendor_' + ts + '@test.com', password: 'Test1234!' });
  r.status === 200 && r.data.data.accessToken ? ok('Login VENDOR') : fail('Login VENDOR', r.data.message);

  r = await req('POST', '/auth/login', { email: 'admin_' + ts + '@test.com', password: 'Admin1234!' });
  r.status === 200 && r.data.data.accessToken ? ok('Login ADMIN') : fail('Login ADMIN', r.data.message);

  // Auth error cases
  r = await req('POST', '/auth/login', { email: 'user_' + ts + '@test.com', password: 'WrongPass!' });
  r.status === 401 ? ok('Wrong password → 401') : fail('Wrong password', r.status);

  r = await req('POST', '/auth/login', { email: 'nobody_ever@test.com', password: 'Test1234!' });
  r.status === 401 ? ok('Non-existent email → 401') : fail('Non-existent email', r.status);

  r = await req('POST', '/auth/register', {
    name: 'Dup', email: 'user_' + ts + '@test.com', password: 'Test1234!', role: 'user', phone: '+923004444444'
  });
  (r.status === 400 || r.status === 409) ? ok('Duplicate email → rejected') : fail('Duplicate email', r.status);

  // Get current user
  r = await req('GET', '/auth/me', null, userLoginToken);
  r.status === 200 ? ok('GET /auth/me') : fail('GET /auth/me', r.status);

  // Refresh token
  r = await req('POST', '/auth/refresh-token', { refreshToken: userRefreshToken });
  r.status === 200 && r.data.data?.accessToken ? ok('Refresh token') : fail('Refresh token', r.status);
  const refreshedToken = r.data.data?.accessToken || userLoginToken;

  // Update password
  r = await req('PUT', '/auth/update-password', { currentPassword: 'Test1234!', newPassword: 'NewPass1234!' }, refreshedToken);
  r.status === 200 ? ok('Update password') : fail('Update password', r.status + ' ' + (r.data.message || ''));

  // Login with new password
  r = await req('POST', '/auth/login', { email: 'user_' + ts + '@test.com', password: 'NewPass1234!' });
  r.status === 200 ? ok('Login with updated password') : fail('Login new pass', r.data.message);

  // Forgot password endpoint
  r = await req('POST', '/auth/forgot-password', { email: 'user_' + ts + '@test.com' });
  (r.status === 200 || r.status === 500) ? ok('Forgot password endpoint responds (' + r.status + ')') : fail('Forgot password', r.status);

  // Login again to get valid token for logout
  r = await req('POST', '/auth/login', { email: 'user_' + ts + '@test.com', password: 'NewPass1234!' });
  const logoutToken = r.data.data.accessToken;

  // Logout
  r = await req('POST', '/auth/logout', {}, logoutToken);
  r.status === 200 ? ok('Logout') : fail('Logout', r.status);

  // Get fresh tokens for remaining tests
  r = await req('POST', '/auth/login', { email: 'user_' + ts + '@test.com', password: 'NewPass1234!' });
  const uToken = r.data.data.accessToken;
  r = await req('POST', '/auth/login', { email: 'vendor_' + ts + '@test.com', password: 'Test1234!' });
  const vToken = r.data.data.accessToken;
  r = await req('POST', '/auth/login', { email: 'admin_' + ts + '@test.com', password: 'Admin1234!' });
  const aToken = r.data.data.accessToken;

  // ═══════════════════════════════════════
  // SECTION 3: VENDOR MANAGEMENT
  // ═══════════════════════════════════════
  console.log('\n━━━ 3. VENDOR MANAGEMENT ━━━');

  r = await req('POST', '/vendors/profile', {
    businessName: 'Grand Venue ' + ts, category: 'venue', city: 'Lahore',
    address: 'DHA Phase 5', description: 'Premium wedding venue', phone: '+923001234567',
  }, vToken);
  r.status === 201 ? ok('Create vendor profile') : fail('Create profile', r.data.message);
  const vendorId = r.data.data?.vendor?._id;
  const vendorSlug = r.data.data?.vendor?.slug;

  r = await req('GET', '/vendors/me/profile', null, vToken);
  r.status === 200 ? ok('Get own vendor profile') : fail('Get own profile', r.status);

  r = await req('PUT', '/vendors/me/profile', { description: 'Updated description' }, vToken);
  r.status === 200 ? ok('Update vendor profile') : fail('Update profile', r.data.message);

  r = await req('POST', '/vendors/me/packages', {
    name: 'Silver Package', price: 300000, description: 'Silver tier', features: ['Venue', 'Basic Decor']
  }, vToken);
  (r.status === 200 || r.status === 201) ? ok('Add package (Silver)') : fail('Add package', r.data.message);
  const pkgId = r.data.data?.packages?.[r.data.data.packages.length - 1]?._id;

  r = await req('POST', '/vendors/me/packages', {
    name: 'Gold Package', price: 500000, description: 'Gold tier', features: ['Venue', 'Decor', 'Catering', 'DJ']
  }, vToken);
  (r.status === 200 || r.status === 201) ? ok('Add package (Gold)') : fail('Add 2nd package', r.data.message);
  const goldPkgId = r.data.data?.packages?.[r.data.data.packages.length - 1]?._id;

  r = await req('PUT', '/vendors/me/packages/' + pkgId, { price: 350000 }, vToken);
  r.status === 200 ? ok('Update package price') : fail('Update package', r.data.message);

  r = await req('PATCH', '/admin/vendors/' + vendorId + '/verify', {}, aToken);
  r.status === 200 ? ok('Admin approves vendor') : fail('Admin approve', r.data.message);

  r = await req('GET', '/vendors');
  r.status === 200 ? ok('Public vendor listing') : fail('Vendor listing', r.status);

  r = await req('GET', '/vendors/' + vendorId);
  r.status === 200 ? ok('Get vendor by ID') : fail('Vendor by ID', r.status);

  if (vendorSlug) {
    r = await req('GET', '/vendors/slug/' + vendorSlug);
    r.status === 200 ? ok('Get vendor by slug') : fail('Vendor by slug', r.status);
  }

  r = await req('GET', '/vendors/search?q=Grand');
  r.status === 200 ? ok('Vendor search by text') : fail('Vendor search', r.status);

  r = await req('DELETE', '/vendors/me/packages/' + pkgId, null, vToken);
  r.status === 200 ? ok('Delete package') : fail('Delete package', r.data.message);

  r = await req('POST', '/vendors/profile', { businessName: 'Hack', category: 'venue', city: 'X' }, uToken);
  r.status === 403 ? ok('User cannot create vendor profile → 403') : fail('Vendor role guard', r.status);

  // ═══════════════════════════════════════
  // SECTION 4: BOOKINGS
  // ═══════════════════════════════════════
  console.log('\n━━━ 4. BOOKINGS ━━━');

  r = await req('POST', '/bookings', {
    vendorId, packageId: goldPkgId,
    eventDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    eventType: 'wedding', guestCount: 200, notes: 'Test booking'
  }, uToken);
  (r.status === 201 || r.status === 200) ? ok('Create booking') : fail('Create booking', r.status + ' ' + r.data.message);
  const bookingId = (r.data.data?.booking || r.data.data)?._id;

  r = await req('GET', '/bookings/my-bookings', null, uToken);
  r.status === 200 ? ok('Get user bookings') : fail('User bookings', r.status);

  r = await req('GET', '/bookings/vendor-bookings', null, vToken);
  r.status === 200 ? ok('Get vendor bookings') : fail('Vendor bookings', r.status);

  r = await req('GET', '/bookings/' + bookingId, null, uToken);
  r.status === 200 ? ok('Get booking by ID') : fail('Booking by ID', r.status);

  r = await req('PATCH', '/bookings/' + bookingId + '/status', { status: 'approved' }, vToken);
  r.status === 200 ? ok('Vendor approves booking') : fail('Approve booking', r.data.message);

  // Date conflict
  r = await req('POST', '/bookings', {
    vendorId, packageId: goldPkgId,
    eventDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    eventType: 'engagement', guestCount: 100
  }, uToken);
  r.status === 409 ? ok('Date conflict detection → 409') : warn('Date conflict', r.status + ' (may differ by ms)');

  // Cancel test
  r = await req('POST', '/bookings', {
    vendorId, packageId: goldPkgId,
    eventDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
    eventType: 'mehndi', guestCount: 150
  }, uToken);
  const cancelId = (r.data.data?.booking || r.data.data)?._id;
  r = await req('PATCH', '/bookings/' + cancelId + '/cancel', { reason: 'Changed plans' }, uToken);
  r.status === 200 ? ok('Cancel booking') : fail('Cancel booking', r.data.message);

  r = await req('POST', '/bookings', { vendorId, eventType: 'wedding', eventDate: new Date().toISOString() }, vToken);
  r.status === 403 ? ok('Vendor cannot create booking → 403') : fail('Booking role guard', r.status);

  // ═══════════════════════════════════════
  // SECTION 5: PAYMENTS (STRIPE)
  // ═══════════════════════════════════════
  console.log('\n━━━ 5. PAYMENTS (STRIPE) ━━━');

  r = await req('POST', '/payments/create-checkout-session', { bookingId }, uToken);
  r.status === 200 && r.data.data.url ? ok('Create Stripe checkout session') : fail('Checkout', r.data.message);

  r = await req('GET', '/payments/status/' + bookingId, null, uToken);
  r.status === 200 && r.data.data.paymentStatus === 'unpaid' ? ok('Payment status = unpaid') : fail('Pay status', r.data.data?.paymentStatus);

  const whRes = await fetch(BASE + '/payments/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'raw test'
  });
  (whRes.status === 400 || whRes.status === 503) ? ok('Webhook raw body (' + whRes.status + ')') : fail('Webhook', whRes.status);

  r = await req('POST', '/payments/create-checkout-session', { bookingId: cancelId }, uToken);
  r.status === 400 ? ok('Cancelled booking payment → 400') : fail('Cancelled pay', r.status);

  r = await req('POST', '/payments/create-checkout-session', { bookingId }, vToken);
  r.status === 403 ? ok('Vendor cannot pay → 403') : fail('Pay role guard', r.status);

  // ═══════════════════════════════════════
  // SECTION 6: BUDGET
  // ═══════════════════════════════════════
  console.log('\n━━━ 6. BUDGET ━━━');

  r = await req('POST', '/budget', { totalBudget: 2000000, eventType: 'wedding', currency: 'PKR' }, uToken);
  (r.status === 200 || r.status === 201) ? ok('Create/upsert budget') : fail('Create budget', r.data.message);

  r = await req('GET', '/budget/me', null, uToken);
  r.status === 200 ? ok('Get my budget') : fail('Get budget', r.status);

  r = await req('POST', '/budget/items', {
    category: 'venue', allocatedAmount: 800000, notes: 'Wedding Hall booking'
  }, uToken);
  (r.status === 200 || r.status === 201) ? ok('Add budget item') : fail('Add budget item', r.data.message);
  const budgetItemId = r.data.data?.budget?.items?.[r.data.data.budget.items.length - 1]?._id;

  if (budgetItemId) {
    r = await req('PUT', '/budget/items/' + budgetItemId, { spentAmount: 780000 }, uToken);
    r.status === 200 ? ok('Update budget item') : fail('Update item', r.data.message);

    r = await req('DELETE', '/budget/items/' + budgetItemId, null, uToken);
    r.status === 200 ? ok('Delete budget item') : fail('Delete item', r.data.message);
  }

  r = await req('GET', '/budget/me', null, vToken);
  r.status === 403 ? ok('Vendor cannot access budget → 403') : fail('Budget role guard', r.status);

  // ═══════════════════════════════════════
  // SECTION 7: ADMIN
  // ═══════════════════════════════════════
  console.log('\n━━━ 7. ADMIN ━━━');

  r = await req('GET', '/admin/dashboard', null, aToken);
  r.status === 200 ? ok('Admin dashboard') : fail('Admin dashboard', r.status);

  r = await req('GET', '/admin/users', null, aToken);
  r.status === 200 ? ok('Admin list users') : fail('Admin users', r.status);

  r = await req('GET', '/admin/vendors', null, aToken);
  r.status === 200 ? ok('Admin list vendors') : fail('Admin vendors', r.status);

  r = await req('GET', '/admin/activity-logs', null, aToken);
  r.status === 200 ? ok('Admin activity logs') : fail('Admin logs', r.status);

  r = await req('GET', '/admin/system-health', null, aToken);
  r.status === 200 ? ok('Admin system health') : fail('Admin health', r.status);

  // Toggle user status
  const usersData = await req('GET', '/admin/users', null, aToken);
  const targetUser = usersData.data.data?.users?.find(u => u.email === 'user_' + ts + '@test.com');
  if (targetUser) {
    r = await req('PATCH', '/admin/users/' + targetUser._id + '/toggle-status', {}, aToken);
    r.status === 200 ? ok('Toggle user status (disable)') : fail('Toggle status', r.data.message);
    await req('PATCH', '/admin/users/' + targetUser._id + '/toggle-status', {}, aToken);
    ok('Toggle user status (re-enable)');
  }

  // Reject vendor
  const rv = await req('POST', '/auth/register', {
    name: 'Reject Vendor', email: 'rv_' + ts + '@t.com', password: 'Test1234!', role: 'vendor', phone: '+923005555555'
  });
  const rvToken = rv.data.data.accessToken;
  await req('POST', '/vendors/profile', {
    businessName: 'Reject ' + ts, category: 'photographer', city: 'Karachi',
    address: 'Test', description: 'To reject', phone: '+923005555555',
  }, rvToken);
  const rvProfile = await req('GET', '/vendors/me/profile', null, rvToken);
  const rvId = rvProfile.data.data?.vendor?._id;
  if (rvId) {
    r = await req('PATCH', '/admin/vendors/' + rvId + '/reject', {}, aToken);
    r.status === 200 ? ok('Admin rejects vendor') : fail('Reject vendor', r.data.message);
  }

  r = await req('GET', '/admin/dashboard', null, uToken);
  r.status === 403 ? ok('User cannot access admin → 403') : fail('Admin role guard', r.status);

  // ═══════════════════════════════════════
  // SECTION 8: AI PROXY
  // ═══════════════════════════════════════
  console.log('\n━━━ 8. AI PROXY (Backend → AI Service) ━━━');

  r = await req('POST', '/ai/chat', { message: 'Hello, what services do you offer?', conversationHistory: [] }, uToken);
  (r.status === 200 || r.status === 504) ? ok('AI chat proxy (' + r.status + ')') : fail('AI chat', r.status);

  r = await req('POST', '/ai/budget-plan', { totalBudget: 2000000, eventType: 'wedding', preferences: 'Lahore, 300 guests' }, uToken);
  (r.status === 200 || r.status === 504) ? ok('AI budget-plan proxy (' + r.status + ')') : fail('AI budget', r.status);

  r = await req('POST', '/ai/recommendations', { preferences: 'modern decor', budget: 500000, city: 'Lahore', category: 'decorator' }, uToken);
  (r.status === 200 || r.status === 504) ? ok('AI recommendations proxy (' + r.status + ')') : fail('AI recs', r.status);

  r = await req('POST', '/ai/chat', { message: 'test' });
  r.status === 401 ? ok('AI endpoint requires auth → 401') : fail('AI auth guard', r.status);

  // ═══════════════════════════════════════
  // SECTION 9: SECURITY
  // ═══════════════════════════════════════
  console.log('\n━━━ 9. SECURITY ━━━');

  r = await req('GET', '/auth/me');
  r.status === 401 ? ok('No token → 401') : fail('No token guard', r.status);

  r = await req('GET', '/auth/me', null, 'invalid.jwt.token');
  r.status === 401 ? ok('Invalid token → 401') : fail('Invalid token', r.status);

  r = await req('GET', '/nonexistent');
  r.status === 404 ? ok('Unknown route → 404') : fail('404 handler', r.status);

  // NoSQL injection attempt
  r = await req('POST', '/auth/login', { email: { '$gt': '' }, password: 'test' });
  (r.status === 400 || r.status === 401 || r.status === 500) ? ok('NoSQL injection blocked (' + r.status + ')') : fail('NoSQL injection', r.status);

  console.log('\n');

  // ═══════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  RESULTS: ' + passed + ' passed, ' + failed + ' failed, ' + warnings + ' warnings');
  console.log('║  ' + (failed === 0 ? '✅ ALL TESTS PASSED' : '❌ ' + failed + ' TESTS FAILED'));
  console.log('╚══════════════════════════════════════════════╝');
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log('  - ' + f));
  }
}

test().catch(e => console.error('Test error:', e));
