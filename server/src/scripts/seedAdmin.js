/**
 * Seed the default admin account into the Admin collection.
 *
 * Usage:  node server/src/scripts/seedAdmin.js
 *
 * Safe to run repeatedly — it skips creation if the email already exists.
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Admin from '../models/Admin.model.js';

const ADMIN_EMAIL = 'admin@vidai.com';
const ADMIN_PASSWORD = 'Asadasad04#';
const ADMIN_NAME = 'VidAI Admin';

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const existing = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`Admin already exists: ${ADMIN_EMAIL}`);
    } else {
      await Admin.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });
      console.log(`Admin created: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
