---
source: Stripe Official Docs
library: Stripe
package: stripe
topic: Payment Status Verification & Authorization
fetched: 2026-02-14T00:00:00Z
official_docs: https://stripe.com/docs/payments/payment-intents/verifying-status
---

# Payment Status Verification & Authorization Patterns

## Critical: Use Webhooks for Payment Status

**DON'T rely solely on client-side status checks. ALWAYS verify payment completion server-side via webhooks.**

### Why Webhooks Are Required

1. **Client can leave page:** User closes browser after payment but before fulfillment
2. **Async payment methods:** Some payment methods complete after user leaves (bank transfers, delayed notifications)
3. **Security:** Client-side checks can be manipulated by attackers
4. **Reliability:** Network issues may prevent client from updating your server

## Payment Status Verification Patterns

### Pattern 1: Webhook-First (Recommended)

```javascript
// ✅ BEST PRACTICE: Webhook handles fulfillment
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    
    // Verify ownership via metadata
    const { user_id, booking_id } = paymentIntent.metadata;
    
    // Atomically update booking and fulfill
    await db.transaction(async (trx) => {
      const booking = await trx('bookings')
        .where({ id: booking_id, user_id })
        .first();
      
      // Idempotency check
      if (booking.payment_status === 'succeeded') {
        return;
      }
      
      // Update status
      await trx('bookings')
        .where({ id: booking_id })
        .update({
          payment_status: 'succeeded',
          payment_intent_id: paymentIntent.id
        });
      
      // Fulfill order
      await fulfillOrder(booking_id);
      await sendConfirmationEmail(booking.user_email);
    });
  }
  
  res.status(200).json({ received: true });
});

// Client-side: Just show UI feedback
stripe.confirmCardPayment(clientSecret).then(({ paymentIntent }) => {
  if (paymentIntent && paymentIntent.status === 'succeeded') {
    // Show success message (webhook handles fulfillment)
    window.location.href = '/booking/confirmation';
  }
});
```

### Pattern 2: Client + Webhook Verification

```javascript
// Client confirms payment
const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret);

if (error) {
  // Handle error
  showError(error.message);
} else if (paymentIntent.status === 'succeeded') {
  // Notify server to check webhook processing
  await fetch('/api/bookings/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId: bookingId,
      paymentIntentId: paymentIntent.id
    })
  });
  
  // Redirect to confirmation
  window.location.href = '/booking/confirmation';
}
```

```javascript
// Server endpoint: Verify ownership before checking status
app.post('/api/bookings/verify-payment', async (req, res) => {
  const { bookingId, paymentIntentId } = req.body;
  const userId = req.user.id;
  
  // STEP 1: Verify user owns this booking
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId
  });
  
  if (!booking) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // STEP 2: Retrieve PaymentIntent from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  // STEP 3: Verify metadata matches
  if (paymentIntent.metadata.booking_id !== bookingId ||
      paymentIntent.metadata.user_id !== userId.toString()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // STEP 4: Update booking if payment succeeded
  if (paymentIntent.status === 'succeeded') {
    await db.bookings.update({
      id: bookingId,
      payment_status: 'succeeded',
      payment_intent_id: paymentIntentId
    });
  }
  
  res.json({ status: paymentIntent.status });
});
```

## Checking Payment Status (Server-Side)

### ❌ VULNERABLE: No Ownership Check

```javascript
// DON'T DO THIS
app.get('/api/payment-status/:paymentIntentId', async (req, res) => {
  const paymentIntent = await stripe.paymentIntents.retrieve(
    req.params.paymentIntentId
  );
  
  // IDOR vulnerability: any user can check any payment
  res.json({ status: paymentIntent.status });
});
```

### ✅ SECURE: Verify Ownership First

```javascript
app.get('/api/bookings/:bookingId/payment-status', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  
  // Use YOUR IDs, verify ownership
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId // Ownership check
  });
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  if (!booking.payment_intent_id) {
    return res.json({ status: 'pending' });
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

## Payment Intent Status Lifecycle

### Common Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `requires_payment_method` | Awaiting payment method | Prompt user to provide payment details |
| `requires_confirmation` | Payment method attached, needs confirmation | Confirm on client with `stripe.confirmCardPayment()` |
| `requires_action` | Needs additional authentication (3D Secure) | Stripe.js handles automatically |
| `processing` | Payment submitted, awaiting result | Show loading state |
| `requires_capture` | Authorized, awaiting capture | Capture when ready to fulfill |
| `succeeded` | Payment complete | Fulfill order |
| `canceled` | Payment canceled | Show cancellation message |

### Webhook Events for Each Status

```javascript
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      // Payment completed successfully
      await handlePaymentSuccess(event.data.object);
      break;
      
    case 'payment_intent.payment_failed':
      // Payment declined or failed
      await handlePaymentFailure(event.data.object);
      break;
      
    case 'payment_intent.processing':
      // Payment submitted (for async methods like ACH)
      await updateBookingStatus(event.data.object, 'processing');
      break;
      
    case 'payment_intent.amount_capturable_updated':
      // Authorized amount ready for capture
      await handleAuthorizationReady(event.data.object);
      break;
      
    case 'payment_intent.canceled':
      // Payment was canceled
      await handleCancellation(event.data.object);
      break;
  }
  
  res.status(200).json({ received: true });
});
```

## Authorization Pattern: Check Before Display

### Booking Confirmation Page (Requires Authorization)

```javascript
app.get('/bookings/:bookingId/confirmation', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  
  // STEP 1: Verify user owns this booking
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId
  });
  
  if (!booking) {
    return res.status(404).render('error', { 
      message: 'Booking not found' 
    });
  }
  
  // STEP 2: Get payment status from Stripe
  let paymentStatus = 'pending';
  
  if (booking.payment_intent_id) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      booking.payment_intent_id
    );
    paymentStatus = paymentIntent.status;
  }
  
  // STEP 3: Render confirmation page with status
  res.render('confirmation', {
    booking,
    paymentStatus
  });
});
```

## Retrieving Payment Without Client Secret

### When You Need Full PaymentIntent Data

Client secret only exposes limited fields. To get full PaymentIntent data (including metadata):

```javascript
app.get('/api/bookings/:bookingId/payment-details', async (req, res) => {
  const { bookingId } = req.params;
  const userId = req.user.id;
  
  // Verify ownership
  const booking = await db.bookings.findOne({
    id: bookingId,
    user_id: userId
  });
  
  if (!booking || !booking.payment_intent_id) {
    return res.status(404).json({ error: 'Payment not found' });
  }
  
  // Retrieve with secret key (server-side only)
  const paymentIntent = await stripe.paymentIntents.retrieve(
    booking.payment_intent_id
  );
  
  // Verify metadata matches (extra security layer)
  if (paymentIntent.metadata.user_id !== userId.toString()) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Return payment details
  res.json({
    id: paymentIntent.id,
    status: paymentIntent.status,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    created: paymentIntent.created,
    payment_method: paymentIntent.payment_method // Stripe PM ID
  });
});
```

## Listing User's Payments (Authorization Required)

### ❌ VULNERABLE: List All Payments

```javascript
// DON'T DO THIS
app.get('/api/payments', async (req, res) => {
  const payments = await stripe.paymentIntents.list({ limit: 100 });
  res.json(payments); // Exposes ALL payments to ANY user!
});
```

### ✅ SECURE: Filter by Customer or Metadata

#### Option 1: Filter by Stripe Customer

```javascript
app.get('/api/my-payments', async (req, res) => {
  const userId = req.user.id;
  
  // Get user's Stripe customer ID
  const user = await db.users.findOne({ id: userId });
  
  if (!user.stripe_customer_id) {
    return res.json({ data: [] });
  }
  
  // List payments for THIS customer only
  const payments = await stripe.paymentIntents.list({
    customer: user.stripe_customer_id,
    limit: 100
  });
  
  res.json(payments);
});
```

#### Option 2: Query Your Database (Recommended)

```javascript
app.get('/api/my-payments', async (req, res) => {
  const userId = req.user.id;
  
  // Query YOUR database for user's bookings
  const bookings = await db.bookings.find({
    user_id: userId,
    payment_intent_id: { $ne: null }
  });
  
  // Retrieve payment details from Stripe for each
  const payments = await Promise.all(
    bookings.map(async (booking) => {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        booking.payment_intent_id
      );
      
      return {
        bookingId: booking.id,
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created
      };
    })
  );
  
  res.json(payments);
});
```

## Handling Payment Failures

### Retrieve Failure Details

```javascript
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    const { user_id, booking_id } = paymentIntent.metadata;
    
    // Get error details
    const error = paymentIntent.last_payment_error;
    
    // Update booking
    await db.bookings.update({
      id: booking_id,
      payment_status: 'failed',
      payment_error: error ? error.message : 'Payment failed'
    });
    
    // Notify user
    await sendPaymentFailureEmail(user_id, {
      bookingId: booking_id,
      errorMessage: error?.message,
      declineCode: error?.decline_code
    });
  }
  
  res.status(200).json({ received: true });
});
```

## Summary: Payment Status Authorization Checklist

✅ **DO:**
- [ ] Use webhooks as primary method for payment status updates
- [ ] Verify user ownership before retrieving payment status
- [ ] Store user_id and booking_id in PaymentIntent metadata
- [ ] Use your own resource IDs in API endpoints
- [ ] Handle idempotency in webhook handlers
- [ ] Return only necessary payment fields to clients
- [ ] Validate metadata matches expected user/booking

✅ **WEBHOOK EVENTS TO HANDLE:**
- [ ] `payment_intent.succeeded` - Fulfill order
- [ ] `payment_intent.payment_failed` - Notify user, log error
- [ ] `payment_intent.processing` - Update status to processing
- [ ] `payment_intent.canceled` - Handle cancellation

❌ **DON'T:**
- [ ] Rely solely on client-side status checks
- [ ] Fulfill orders before webhook confirmation
- [ ] Expose payment status endpoints without authorization
- [ ] Allow users to check any payment by ID
- [ ] Trust client-provided payment IDs without verification
- [ ] Skip idempotency checks in webhooks

## Related Documentation

- Payment Intent Ownership: See `payment-intent-ownership-verification.md`
- Webhook Security: See `webhook-security-best-practices.md`
