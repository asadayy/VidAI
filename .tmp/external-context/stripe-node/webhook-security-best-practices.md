---
source: Stripe Official Docs
library: Stripe
package: stripe
topic: Webhook Security Best Practices
fetched: 2026-02-14T00:00:00Z
official_docs: https://stripe.com/docs/webhooks/best-practices
---

# Webhook Security Best Practices

## Critical: Verify Webhook Signatures

**ALWAYS verify that webhook events come from Stripe, not attackers.**

### Why Signature Verification Matters

Without verification, attackers can:
1. Send fake `payment_intent.succeeded` events to your webhook
2. Trigger order fulfillment without actual payment
3. Access sensitive payment data
4. Manipulate payment states in your system

### Verify Signatures with Official Libraries (Recommended)

#### Node.js Example

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// IMPORTANT: Use raw body for signature verification
app.post('/webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      // Verify signature - throws error if invalid
      event = stripe.webhooks.constructEvent(
        req.body,          // Raw body required
        sig,               // Stripe-Signature header
        endpointSecret     // Your webhook signing secret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Signature verified - safe to process event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handlePaymentSuccess(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await handlePaymentFailure(failedPayment);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.status(200).json({ received: true });
});
```

### Get Your Webhook Signing Secret

1. **Development (Stripe CLI)**:
   ```bash
   stripe listen --forward-to localhost:4242/webhook
   # Returns: Ready! Your webhook signing secret is 'whsec_...'
   ```

2. **Production (Dashboard)**:
   - Go to [Dashboard Webhooks](https://dashboard.stripe.com/webhooks)
   - Select your endpoint
   - Click "Click to reveal" under "Signing secret"
   - Store in environment variable: `STRIPE_WEBHOOK_SECRET`

## Prevent Replay Attacks

### What is a Replay Attack?

An attacker intercepts a valid webhook payload and signature, then re-transmits it to trigger duplicate fulfillment or fraud.

### Built-in Timestamp Verification

Stripe includes a timestamp in the signature. Official libraries automatically:
- Verify the timestamp is part of the signed payload
- Reject events older than **5 minutes** (default tolerance)

```javascript
// Default tolerance: 5 minutes
event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

// Custom tolerance (use with caution)
event = stripe.webhooks.constructEvent(
  req.body, 
  sig, 
  endpointSecret,
  300 // Tolerance in seconds (5 minutes)
);
```

**⚠️ WARNING:** Never use tolerance of `0` - this disables recency checks entirely.

### Additional Replay Protection: Event ID Logging

```javascript
const processedEventIds = new Set(); // In production, use database

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Check if we've already processed this event
  if (processedEventIds.has(event.id)) {
    console.log(`Duplicate event ${event.id} - already processed`);
    return res.status(200).json({ received: true });
  }
  
  // Process event
  try {
    await handleEvent(event);
    
    // Mark as processed
    processedEventIds.add(event.id);
    // In production: await db.processedEvents.create({ event_id: event.id });
    
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing event ${event.id}:`, err);
    res.status(500).send('Processing error');
  }
});
```

## Handle Duplicate Events

Webhooks may send the same event multiple times due to:
- Network retries
- Stripe retry logic (up to 3 days with exponential backoff)

### Idempotency Pattern

```javascript
async function handlePaymentSuccess(paymentIntent) {
  const bookingId = paymentIntent.metadata.booking_id;
  
  // Use database transaction for atomic updates
  await db.transaction(async (trx) => {
    const booking = await trx('bookings')
      .where({ id: bookingId })
      .first();
    
    // Check if already processed (idempotency)
    if (booking.payment_status === 'succeeded') {
      console.log(`Booking ${bookingId} already marked as paid`);
      return; // Skip duplicate processing
    }
    
    // Update booking status
    await trx('bookings')
      .where({ id: bookingId })
      .update({
        payment_status: 'succeeded',
        payment_intent_id: paymentIntent.id,
        updated_at: new Date()
      });
    
    // Send confirmation email (idempotent)
    await sendConfirmationEmail(booking.user_email);
    
    // Fulfill order
    await fulfillOrder(bookingId);
  });
}
```

## Return 200 Response Quickly

### ❌ BAD: Slow synchronous processing

```javascript
app.post('/webhook', async (req, res) => {
  const event = stripe.webhooks.constructEvent(req.body, sig, secret);
  
  // DON'T DO THIS - slow operations block response
  if (event.type === 'payment_intent.succeeded') {
    await updateInventory();           // 5 seconds
    await sendConfirmationEmail();     // 3 seconds
    await updateAccountingSystem();    // 10 seconds
  }
  
  res.status(200).send(); // Stripe times out before this!
});
```

**Problem:** Stripe expects a response within seconds. Timeouts trigger retries.

### ✅ GOOD: Async queue pattern

```javascript
const queue = require('bull'); // or similar job queue
const webhookQueue = new queue('stripe-webhooks');

app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Add to queue for async processing
  await webhookQueue.add({
    eventId: event.id,
    type: event.type,
    data: event.data.object
  });
  
  // Respond immediately
  res.status(200).json({ received: true });
});

// Process jobs asynchronously
webhookQueue.process(async (job) => {
  const { eventId, type, data } = job.data;
  
  try {
    switch (type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(data);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(data);
        break;
    }
  } catch (err) {
    console.error(`Error processing webhook ${eventId}:`, err);
    throw err; // Queue will retry
  }
});
```

## Use HTTPS and TLS 1.2+

### Requirements

- **Production:** HTTPS required (Stripe validates SSL/TLS certificate)
- **TLS version:** v1.2 or higher
- **Valid certificate:** No self-signed certificates in production

### Test SSL Configuration

Use [SSL Labs Server Test](https://www.ssllabs.com/ssltest/) to verify:
- Valid certificate chain
- TLS 1.2+ support
- No critical vulnerabilities

## Only Listen to Required Events

### ❌ Don't listen to all events

```javascript
// BAD: Listening to all events unnecessarily
// Creates load and potential security issues
events: ['*']
```

### ✅ Subscribe only to what you need

```javascript
// GOOD: Only events your integration requires
const requiredEvents = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled'
];
```

**Configure in Dashboard:**
1. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
2. Select your endpoint
3. Click "Select events"
4. Choose only required events

## Exempt Webhook Route from CSRF Protection

### Why This Matters

Web frameworks (Rails, Django, Express) often require CSRF tokens for POST requests. Stripe webhooks won't have these tokens.

### Express.js Example

```javascript
const express = require('express');
const csrf = require('csurf');

const app = express();

// CSRF protection for all routes EXCEPT webhook
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
  // Skip CSRF for webhook endpoint
  if (req.path === '/webhook') {
    return next();
  }
  csrfProtection(req, res, next);
});

// Webhook endpoint without CSRF (uses signature verification instead)
app.post('/webhook', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Signature verification is the security layer
    const event = stripe.webhooks.constructEvent(req.body, sig, secret);
    // ...
  }
);
```

## Roll Webhook Secrets Periodically

### When to Roll Secrets

- **Periodically:** Every 90-180 days
- **After compromise:** Immediately if secret is exposed
- **Team changes:** When developers with access leave

### How to Roll Secrets (Zero Downtime)

1. Go to Dashboard → Webhooks → Select endpoint
2. Click overflow menu (⋯) → "Roll secret"
3. Choose: "Delay expiration for 24 hours" (recommended)
4. During 24-hour window:
   - Multiple secrets are active
   - Stripe generates signatures for EACH secret
   - Update your environment variable with new secret
   - Deploy updated code
5. After 24 hours, old secret expires automatically

## Verify Source IP (Optional Additional Layer)

Stripe sends webhooks from [specific IP addresses](https://stripe.com/docs/ips).

```javascript
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  // ... (see docs for full list)
];

app.post('/webhook', (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Optional additional check (signature verification is primary)
  if (!STRIPE_WEBHOOK_IPS.includes(clientIP)) {
    console.warn(`Webhook from unexpected IP: ${clientIP}`);
    // Consider logging but don't reject (IPs may change)
  }
  
  next();
});
```

**⚠️ WARNING:** Don't rely solely on IP checks. Always verify signatures.

## Webhook Security Checklist

✅ **MUST DO:**
- [ ] Verify webhook signatures with `stripe.webhooks.constructEvent()`
- [ ] Use raw request body for signature verification
- [ ] Store webhook secret in environment variables (not code)
- [ ] Return 200 response within seconds (use async queues)
- [ ] Use HTTPS with TLS 1.2+ in production
- [ ] Handle duplicate events with idempotency checks
- [ ] Prevent replay attacks with timestamp verification

✅ **SHOULD DO:**
- [ ] Log processed event IDs to prevent duplicates
- [ ] Subscribe only to required event types
- [ ] Exempt webhook route from CSRF protection
- [ ] Roll webhook secrets periodically (90-180 days)
- [ ] Use database transactions for atomic updates
- [ ] Test webhook signature verification in development

❌ **DON'T:**
- [ ] Skip signature verification (critical security risk)
- [ ] Manipulate request body before verification (breaks signature)
- [ ] Use tolerance of 0 (disables replay protection)
- [ ] Process slow operations synchronously (causes timeouts)
- [ ] Log webhook secrets or expose them publicly
- [ ] Listen to all events (`'*'`) unnecessarily

## Example: Complete Secure Webhook Handler

```javascript
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Queue } = require('bullmq');

const app = express();
const webhookQueue = new Queue('webhooks');

// Webhook endpoint (raw body for signature verification)
app.post('/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
      // Verify signature (critical security step)
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Check for duplicate (optional additional safety)
    const exists = await db.processedEvents.exists({ event_id: event.id });
    if (exists) {
      console.log(`Duplicate event ${event.id} - already processed`);
      return res.status(200).json({ received: true });
    }
    
    // Add to async queue
    await webhookQueue.add('process-event', {
      eventId: event.id,
      type: event.type,
      data: event.data.object,
      created: event.created
    });
    
    // Respond immediately (Stripe requirement)
    res.status(200).json({ received: true });
  }
);

// Async worker
webhookQueue.process('process-event', async (job) => {
  const { eventId, type, data } = job.data;
  
  try {
    // Process in transaction
    await db.transaction(async (trx) => {
      // Check idempotency
      const processed = await trx('processed_events')
        .where({ event_id: eventId })
        .first();
      
      if (processed) {
        console.log(`Event ${eventId} already processed`);
        return;
      }
      
      // Handle event
      switch (type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(data, trx);
          break;
        case 'payment_intent.payment_failed':
          await handlePaymentFailure(data, trx);
          break;
      }
      
      // Mark as processed
      await trx('processed_events').insert({
        event_id: eventId,
        event_type: type,
        processed_at: new Date()
      });
    });
  } catch (err) {
    console.error(`Error processing webhook ${eventId}:`, err);
    throw err; // Queue will retry
  }
});

async function handlePaymentSuccess(paymentIntent, trx) {
  const { user_id, booking_id } = paymentIntent.metadata;
  
  // Update booking
  await trx('bookings')
    .where({ id: booking_id, user_id })
    .update({
      payment_status: 'succeeded',
      payment_intent_id: paymentIntent.id,
      updated_at: new Date()
    });
  
  // Fulfill order (idempotent)
  await fulfillOrder(booking_id);
}

app.listen(4242, () => console.log('Server running on port 4242'));
```

## Related Documentation

- Payment Intent Ownership: See `payment-intent-ownership-verification.md`
- Payment Status Verification: See `payment-status-verification.md`
