/**
 * Data Migration: Retroactively assign weddingEvent to existing budget items.
 *
 * Strategy:
 * 1. For items with a bookingId — look up the booking's eventType,
 *    then find a matching WeddingEvent for that user.
 * 2. For items without a bookingId — try to match via the budget.events
 *    array by checking which event budget the item's category is most
 *    likely associated with (using eventType matching on category names).
 * 3. If a user has only ONE event, assign all unlinked items to it.
 *
 * Usage:  node server/scripts/migrate-budget-events.js
 * Requires MONGODB_URI in .env or environment.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Budget from '../src/models/Budget.model.js';
import Booking from '../src/models/Booking.model.js';
import WeddingEvent from '../src/models/WeddingEvent.model.js';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set. Add it to server/.env');
  process.exit(1);
}

// Map common booking eventType values to WeddingEvent eventType
const EVENT_TYPE_MAP = {
  wedding: ['baraat', 'nikkah', 'walima'],
  engagement: ['engagement'],
  mehndi: ['mehndi'],
  baraat: ['baraat'],
  walima: ['walima'],
  nikkah: ['nikkah'],
};

async function migrate() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  const budgets = await Budget.find({});
  console.log(`📦 Found ${budgets.length} budget document(s) to process.\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const budget of budgets) {
    const userId = budget.user;
    const userEvents = await WeddingEvent.find({ user: userId }).lean();

    if (userEvents.length === 0) {
      console.log(`  [User ${userId}] No wedding events — skipping ${budget.items.length} item(s).`);
      totalSkipped += budget.items.length;
      continue;
    }

    let changed = false;

    for (const item of budget.items) {
      // Skip items that already have a weddingEvent assigned
      if (item.weddingEvent) continue;

      let matchedEvent = null;

      // Strategy 1: If item has a bookingId, look up the booking's eventType
      if (item.bookingId) {
        try {
          const booking = await Booking.findById(item.bookingId).select('eventType weddingEventId').lean();
          if (booking) {
            // If the booking already has a weddingEventId, use it directly
            if (booking.weddingEventId) {
              const evt = userEvents.find(e => e._id.toString() === booking.weddingEventId.toString());
              if (evt) matchedEvent = evt;
            }

            // Otherwise, match by eventType
            if (!matchedEvent && booking.eventType) {
              const possibleTypes = EVENT_TYPE_MAP[booking.eventType] || [booking.eventType];
              matchedEvent = userEvents.find(e => possibleTypes.includes(e.eventType));
            }
          }
        } catch {
          // Booking may have been deleted — continue to fallback
        }
      }

      // Strategy 2: If user has only ONE event, assign everything to it
      if (!matchedEvent && userEvents.length === 1) {
        matchedEvent = userEvents[0];
      }

      // Strategy 3: Try to match by budget.events association
      if (!matchedEvent && budget.events.length > 0) {
        // Check if any budget event's eventType matches common patterns in the item category
        const catLower = (item.category || '').toLowerCase();
        for (const budgetEvt of budget.events) {
          const evt = userEvents.find(e => e._id.toString() === budgetEvt.weddingEvent?.toString());
          if (evt) {
            // Simple heuristic: if category mentions an event type
            if (catLower.includes(evt.eventType)) {
              matchedEvent = evt;
              break;
            }
          }
        }
      }

      if (matchedEvent) {
        item.weddingEvent = matchedEvent._id;
        changed = true;
        totalUpdated++;
        console.log(`  [User ${userId}] Item "${item.category}" → ${matchedEvent.title || matchedEvent.eventType}`);
      } else {
        totalSkipped++;
      }
    }

    if (changed) {
      await budget.save();
    }
  }

  console.log(`\n✅ Migration complete.`);
  console.log(`   Updated: ${totalUpdated} item(s)`);
  console.log(`   Skipped: ${totalSkipped} item(s) (no match found or already assigned)`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
