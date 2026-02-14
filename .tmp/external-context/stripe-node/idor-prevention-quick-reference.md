---
source: Stripe Official Docs - Security Summary
library: Stripe
package: stripe
topic: Payment Authorization & IDOR Prevention Summary
fetched: 2026-02-14T00:00:00Z
official_docs: https://stripe.com/docs/payments/payment-intents
---

# Stripe Payment Authorization & IDOR Prevention - Quick Reference

## Critical Security Vulnerability: IDOR in Payment Endpoints

### The Problem

**Insecure Direct Object Reference (IDOR)** occurs when API endpoints expose payment information based on Stripe IDs without verifying the authenticated user owns that payment.

**Example Attack:**
```
User A authenticates and views: GET /api/payments/pi_1ABC123
User A changes URL to:        GET /api/payments/pi_1XYZ789  ← User B's payment
```

If no ownership check exists, User A can view User B's payment details.

## The Solution: Three-Layer Authorization

### Layer 1: Use Your Resource IDs (Not Stripe IDs)

```javascript
// ❌ BAD: Exposes Stripe IDs
GET /api/payments/pi_1ABC123

// ✅ GOOD: Uses your booking IDs
GET /api/bookings/booking_12345/payment
```

**Benefits:**
- Natural ownership checking via your database relationships
- No direct exposure of Stripe internal IDs
- Easier to audit and debug

### Layer 2: Verify Ownership in Your Database

```javascript
app.get('/api/bookings/:bookingId/payment', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id; // From auth middleware
  
  // Query with BOTH booking ID and user ID
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId  // 👈 This is the authorization check
  });
  
  if (!booking) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Now safe to retrieve from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(
    booking.payment_intent_id
  );
  
  res.json(paymentIntent);
});
```

### Layer 3: Verify Metadata Matches

```javascript
// Additional security layer: verify Stripe metadata
app.get('/api/payments/:paymentIntentId', async (req, res) => {
  const userId = req.user.id;
  
  const paymentIntent = await stripe.paymentIntents.retrieve(
    req.params.paymentIntentId
  );
  
  // Check metadata user_id matches authenticated user
  if (paymentIntent.metadata.user_id !== userId.toString()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json(paymentIntent);
});
```

## Required: Metadata for Ownership Tracking

### When Creating PaymentIntent

```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  customer: user.stripe_customer_id, // Optional but recommended
  metadata: {
    user_id: userId.toString(),      // 👈 REQUIRED for ownership verification
    booking_id: bookingId.toString(), // 👈 REQUIRED for linking to your system
    email: user.email                // Helpful for support/reconciliation
  }
});
```

### When Creating Checkout Session

```javascript
const session = await stripe.checkout.sessions.create({
  customer: user.stripe_customer_id,
  payment_intent_data: {
    metadata: {
      user_id: userId.toString(),
      booking_id: bookingId.toString()
    }
  },
  line_items: [{ price: 'price_123', quantity: 1 }],
  mode: 'payment',
  success_url: `${YOUR_DOMAIN}/bookings/${bookingId}/success`,
  cancel_url: `${YOUR_DOMAIN}/bookings/${bookingId}/cancel`
});
```

## Critical Endpoints to Protect

### 1. Payment Status Check

```javascript
// ✅ SECURE
app.get('/api/bookings/:bookingId/payment-status', async (req, res) => {
  const booking = await db.bookings.findOne({
    id: req.params.bookingId,
    user_id: req.user.id  // Authorization
  });
  
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  const payment = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
  res.json({ status: payment.status });
});
```

### 2. Payment Details

```javascript
// ✅ SECURE
app.get('/api/bookings/:bookingId/payment', async (req, res) => {
  const booking = await db.bookings.findOne({
    id: req.params.bookingId,
    user_id: req.user.id  // Authorization
  });
  
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  const payment = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
  
  // Only return necessary fields
  res.json({
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    created: payment.created
  });
});
```

### 3. Refund Request

```javascript
// ✅ SECURE
app.post('/api/bookings/:bookingId/refund', async (req, res) => {
  const booking = await db.bookings.findOne({
    id: req.params.bookingId,
    user_id: req.user.id  // Authorization
  });
  
  if (!booking) return res.status(404).json({ error: 'Not found' });
  
  // Verify payment is in refundable state
  const payment = await stripe.paymentIntents.retrieve(booking.payment_intent_id);
  
  if (payment.status !== 'succeeded') {
    return res.status(400).json({ error: 'Payment not refundable' });
  }
  
  // Verify metadata matches (extra security)
  if (payment.metadata.user_id !== req.user.id.toString()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const refund = await stripe.refunds.create({
    payment_intent: booking.payment_intent_id,
    metadata: {
      user_id: req.user.id.toString(),
      booking_id: booking.id,
      reason: req.body.reason
    }
  });
  
  await db.bookings.update({
    id: booking.id,
    refund_status: 'pending',
    refund_id: refund.id
  });
  
  res.json({ success: true, refundId: refund.id });
});
```

### 4. Webhook Handler (Special Case)

```javascript
// ✅ SECURE: Uses metadata for authorization
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'payment_intent.succeeded') {
    const payment = event.data.object;
    
    // Extract ownership from metadata
    const { user_id, booking_id } = payment.metadata;
    
    // Update ONLY the booking that matches metadata
    await db.bookings.update({
      id: booking_id,
      user_id: user_id,  // Ensures we update correct user's booking
      payment_status: 'succeeded',
      payment_intent_id: payment.id
    });
    
    // Send confirmation email to correct user
    const user = await db.users.findOne({ id: user_id });
    await sendConfirmationEmail(user.email, booking_id);
  }
  
  res.status(200).json({ received: true });
});
```

## Common Mistakes to Avoid

### ❌ Mistake 1: No Ownership Verification

```javascript
// VULNERABLE CODE
app.get('/api/payments/:paymentIntentId', async (req, res) => {
  const payment = await stripe.paymentIntents.retrieve(req.params.paymentIntentId);
  res.json(payment); // ⚠️ Any user can view any payment!
});
```

### ❌ Mistake 2: Client-Provided IDs Without Verification

```javascript
// VULNERABLE CODE
app.post('/api/confirm-payment', async (req, res) => {
  const { paymentIntentId } = req.body; // ⚠️ Client controls this!
  
  // No verification that user owns this payment
  const payment = await stripe.paymentIntents.confirm(paymentIntentId);
  res.json(payment);
});
```

### ❌ Mistake 3: Missing Metadata

```javascript
// INCOMPLETE CODE
const payment = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd'
  // ⚠️ No metadata! Cannot verify ownership later
});
```

### ❌ Mistake 4: Trusting Client-Side Status

```javascript
// VULNERABLE CODE
app.post('/api/bookings/:bookingId/confirm', async (req, res) => {
  const { paymentStatus } = req.body; // ⚠️ Client provides status!
  
  // Never trust client-provided payment status
  if (paymentStatus === 'succeeded') {
    await fulfillOrder(req.params.bookingId);
  }
});
```

## Secure Implementation Checklist

### Before Going Live

✅ **Creating Payments:**
- [ ] Always include `user_id` in metadata
- [ ] Always include `booking_id`/`order_id` in metadata
- [ ] Link to Stripe Customer when possible (`customer` field)
- [ ] Never expose client_secret to wrong user

✅ **Reading Payment Status:**
- [ ] Verify user owns booking BEFORE retrieving from Stripe
- [ ] Use your resource IDs in URLs (not Stripe IDs)
- [ ] Check metadata matches authenticated user
- [ ] Return only necessary fields to client

✅ **Webhook Handlers:**
- [ ] Verify webhook signatures
- [ ] Use metadata to identify correct user/booking
- [ ] Handle duplicate events (idempotency)
- [ ] Update only matching user's records

✅ **Authorization Middleware:**
- [ ] All payment endpoints require authentication
- [ ] Ownership verified on every request
- [ ] Failed auth returns 403, not 404 (security)
- [ ] Log unauthorized access attempts

### Testing Your Implementation

```javascript
// Test 1: Can User A access User B's payment?
// Expected: 403 Forbidden
const userA = await loginAs('user_A');
const userBBookingId = 'booking_belonging_to_user_B';

const res = await fetch(`/api/bookings/${userBBookingId}/payment`, {
  headers: { Authorization: `Bearer ${userA.token}` }
});

assert(res.status === 403, 'IDOR vulnerability detected!');

// Test 2: Can unauthenticated user access payments?
// Expected: 401 Unauthorized
const res2 = await fetch('/api/bookings/booking_123/payment');
assert(res2.status === 401, 'Missing authentication check!');

// Test 3: Is metadata preserved?
const payment = await stripe.paymentIntents.retrieve('pi_123');
assert(payment.metadata.user_id, 'Metadata missing!');
assert(payment.metadata.booking_id, 'Metadata missing!');
```

## Quick Fixes for Common Scenarios

### Scenario 1: Booking Payment Status Page

```javascript
// URL: /bookings/booking_123/status
app.get('/bookings/:bookingId/status', async (req, res) => {
  // 1. Auth check
  if (!req.user) {
    return res.redirect('/login');
  }
  
  // 2. Ownership check
  const booking = await db.bookings.findOne({
    id: req.params.bookingId,
    user_id: req.user.id
  });
  
  if (!booking) {
    return res.status(404).render('not-found');
  }
  
  // 3. Retrieve payment (only if authorized)
  let paymentStatus = 'pending';
  if (booking.payment_intent_id) {
    const payment = await stripe.paymentIntents.retrieve(
      booking.payment_intent_id
    );
    paymentStatus = payment.status;
  }
  
  res.render('booking-status', { booking, paymentStatus });
});
```

### Scenario 2: Admin Viewing Any Payment

```javascript
// Admins need different authorization rules
app.get('/admin/payments/:paymentIntentId', async (req, res) => {
  // 1. Verify admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  // 2. Admins can view any payment
  const payment = await stripe.paymentIntents.retrieve(
    req.params.paymentIntentId
  );
  
  // 3. Get associated booking via metadata
  const booking = await db.bookings.findOne({
    id: payment.metadata.booking_id
  });
  
  res.json({ payment, booking });
});
```

## Summary

**Three Critical Rules:**

1. **Always verify ownership** before retrieving payment data
2. **Always store user_id and booking_id** in metadata
3. **Always use webhooks** for payment status updates

**The Golden Pattern:**
```javascript
// 1. Query YOUR database with YOUR IDs
const booking = await db.bookings.findOne({
  id: bookingId,
  user_id: userId  // 👈 Authorization happens here
});

// 2. Return 403 if not found/owned
if (!booking) return res.status(403).json({ error: 'Unauthorized' });

// 3. Only then retrieve from Stripe
const payment = await stripe.paymentIntents.retrieve(booking.payment_intent_id);

// 4. Optionally verify metadata
if (payment.metadata.user_id !== userId) {
  return res.status(403).json({ error: 'Unauthorized' });
}
```

## Related Files

- `payment-intent-ownership-verification.md` - Detailed ownership patterns
- `webhook-security-best-practices.md` - Webhook signature verification
- `payment-status-verification.md` - Payment status checking patterns
