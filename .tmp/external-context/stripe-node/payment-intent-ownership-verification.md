---
source: Stripe Official Docs
library: Stripe
package: stripe
topic: Payment Intent Ownership Verification & IDOR Prevention
fetched: 2026-02-14T00:00:00Z
official_docs: https://stripe.com/docs/payments/payment-intents
---

# Payment Intent Ownership Verification & IDOR Prevention

## Critical Security Principle

**NEVER expose PaymentIntent IDs or client secrets directly to users without proper authorization checks.**

The PaymentIntent object contains sensitive payment information. Your backend must verify that the authenticated user owns the payment before exposing any payment data.

## Using Metadata for Ownership Tracking

### Store User/Booking References in Metadata

When creating a PaymentIntent, attach your system's user ID and booking/order ID to track ownership:

```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1099,
  currency: 'usd',
  metadata: {
    user_id: 'user_12345',        // Your system's user ID
    booking_id: 'booking_67890',  // Your system's booking/order ID
    email: 'customer@example.com' // For reconciliation
  }
});
```

**Key Points:**
- Metadata is NOT shown to customers
- Metadata is NOT used for authorization/fraud decisions by Stripe
- Metadata can have up to 50 keys
- Key names: up to 40 characters
- Values: up to 500 characters
- **DO NOT store sensitive information** (card details, passwords, SSN) in metadata

### Metadata Use Cases for Security

1. **Link IDs**: Attach your system's unique IDs to simplify lookups and ownership verification
2. **User Association**: Store user_id to verify ownership before showing payment status
3. **Order Tracking**: Store booking_id/order_id to match payments with your system's records

## Authorization Pattern: Verify Before Retrieve

### ❌ VULNERABLE Pattern (IDOR Risk)

```javascript
// DON'T DO THIS - No ownership verification!
app.get('/api/payments/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  
  // VULNERABLE: Any authenticated user can view any payment
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  res.json(paymentIntent);
});
```

**Attack Vector:** User A can access User B's payment by changing the URL:
- `/api/payments/pi_userA123` → `/api/payments/pi_userB456`

### ✅ SECURE Pattern (Ownership Verification)

#### Option 1: Verify via Your Database

```javascript
app.get('/api/payments/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  const userId = req.user.id; // From your auth middleware
  
  // STEP 1: Check ownership in YOUR database first
  const booking = await db.bookings.findOne({
    payment_intent_id: paymentIntentId,
    user_id: userId // Verify ownership
  });
  
  if (!booking) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // STEP 2: Only retrieve from Stripe if ownership is verified
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  res.json(paymentIntent);
});
```

#### Option 2: Verify via Stripe Metadata

```javascript
app.get('/api/payments/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  const userId = req.user.id;
  
  // STEP 1: Retrieve payment from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  // STEP 2: Verify ownership via metadata
  if (paymentIntent.metadata.user_id !== userId.toString()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // STEP 3: Return data only if ownership is verified
  res.json(paymentIntent);
});
```

#### Option 3: Never Expose Payment IDs (Most Secure)

```javascript
// Use your own booking IDs in URLs, not Stripe IDs
app.get('/api/bookings/:bookingId/payment', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  
  // STEP 1: Query YOUR database with YOUR IDs
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId // Ownership check
  });
  
  if (!booking) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // STEP 2: Use stored payment_intent_id to retrieve from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(
    booking.payment_intent_id
  );
  
  res.json(paymentIntent);
});
```

## Client Secret Security

### What is a Client Secret?

The `client_secret` is a unique key that allows client-side code to:
- Access limited PaymentIntent fields (status, amount, currency)
- Complete payment confirmation
- **Does NOT expose sensitive metadata or customer information**

### Client Secret Best Practices

1. **Pass to client only after ownership verification**:
```javascript
app.post('/api/bookings/:bookingId/create-payment', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  
  // Verify user owns this booking
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId
  });
  
  if (!booking) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: booking.amount,
    currency: 'usd',
    metadata: {
      user_id: userId,
      booking_id: bookingId
    }
  });
  
  // Safe to return client_secret - it's scoped to this payment
  res.json({ 
    clientSecret: paymentIntent.client_secret 
  });
});
```

2. **Never log or embed client secrets in URLs**
3. **Require HTTPS on pages with client secrets**
4. **Don't expose to anyone other than the customer**

## Customer Field for Additional Security

### Link PaymentIntent to Stripe Customer

```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: 1099,
  currency: 'usd',
  customer: 'cus_stripe_customer_id', // Link to Stripe Customer
  metadata: {
    user_id: userId,
    booking_id: bookingId
  }
});
```

**Benefits:**
- Stripe enforces that payment methods must belong to this customer
- Prevents payment method reuse across customers
- Easier to track payment history per customer

### Verification with Customer Field

```javascript
app.get('/api/payments/:paymentIntentId', async (req, res) => {
  const { paymentIntentId } = req.params;
  const userId = req.user.id;
  
  // Get user's Stripe customer ID from your database
  const user = await db.users.findOne({ id: userId });
  
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  // Verify ownership via Stripe customer field
  if (paymentIntent.customer !== user.stripe_customer_id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json(paymentIntent);
});
```

## Retrieve Payment Status Without Exposing IDs

### Best Practice: Use Your Own Resource IDs

```javascript
// Client makes request with YOUR booking ID
fetch('/api/bookings/booking_12345/payment-status')
  .then(res => res.json())
  .then(data => {
    if (data.status === 'succeeded') {
      // Show success message
    }
  });

// Server endpoint
app.get('/api/bookings/:bookingId/payment-status', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  
  // Query with YOUR IDs (automatic ownership check)
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId
  });
  
  if (!booking || !booking.payment_intent_id) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Retrieve from Stripe only after ownership verified
  const paymentIntent = await stripe.paymentIntents.retrieve(
    booking.payment_intent_id
  );
  
  // Return only necessary fields
  res.json({
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency
  });
});
```

## Summary: IDOR Prevention Checklist

✅ **DO:**
- Store user_id and booking_id in PaymentIntent metadata
- Verify ownership in your database BEFORE retrieving from Stripe
- Use your own resource IDs in API endpoints (not Stripe IDs)
- Link PaymentIntent to Stripe Customer when possible
- Return only necessary payment fields to clients
- Validate user owns booking before creating/accessing payments

❌ **DON'T:**
- Expose PaymentIntent IDs in URLs without authorization checks
- Allow authenticated users to access any payment by ID
- Store sensitive data in metadata
- Trust client-provided Stripe IDs without verification
- Return full PaymentIntent objects to clients unnecessarily

## Related Documentation

- Webhook Security: See `webhook-security-best-practices.md`
- Payment Status Verification: See `payment-status-verification.md`
