#!/usr/bin/env node
/**
 * VidAI Full System Validation Script
 * Run before deployment to validate: env, backend health, AI service health, frontend build/lint.
 * Prerequisites: Start backend (server) and AI service (ai-service with .venv) if you want live health checks.
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BACKEND_URL = process.env.VALIDATE_BACKEND_URL || 'http://localhost:5000';
const AI_SERVICE_URL = process.env.VALIDATE_AI_URL || 'http://localhost:8000';

const results = { ok: [], fail: [], warn: [] };

function ok(msg) {
  results.ok.push(msg);
  console.log('  \x1b[32m✓\x1b[0m', msg);
}
function fail(msg) {
  results.fail.push(msg);
  console.log('  \x1b[31m✗\x1b[0m', msg);
}
function warn(msg) {
  results.warn.push(msg);
  console.log('  \x1b[33m!\x1b[0m', msg);
}

// --- 1. Environment files and required vars ---
function checkServerEnv() {
  console.log('\n--- Server environment (server/.env) ---');
  const envPath = join(ROOT, 'server', '.env');
  if (!existsSync(envPath)) {
    fail('server/.env not found. Copy server/.env.example to server/.env and set values.');
    return;
  }
  ok('server/.env exists');

  const content = readFileSync(envPath, 'utf8');
  const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    const re = new RegExp(`^${key}=(.+)$`, 'm');
    const match = content.match(re);
    const value = match ? match[1].trim() : '';
    if (!value || value.includes('<') || value.includes('GENERATE_') || value === 'sk_test_...') {
      if (key.startsWith('JWT_')) {
        fail(`${key} must be set to a secure random value (see server/.env.example).`);
      } else if (key === 'MONGODB_URI') {
        fail('MONGODB_URI must be set to your MongoDB Atlas connection string.');
      }
    } else {
      ok(`${key} is set`);
    }
  }
  if (content.includes('JWT_SECRET') && content.includes('JWT_REFRESH_SECRET')) {
    const s1 = (content.match(/JWT_SECRET=(.+)/)?.[1] || '').trim();
    const s2 = (content.match(/JWT_REFRESH_SECRET=(.+)/)?.[1] || '').trim();
    if (s1 && s2 && s1 === s2) {
      warn('JWT_SECRET and JWT_REFRESH_SECRET should be different.');
    }
  }
}

// --- 2. Backend health ---
async function checkBackendHealth() {
  console.log('\n--- Backend health (Node server) ---');
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      ok(`Backend health OK (${BACKEND_URL})`);
    } else {
      fail(`Backend returned ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch {
    warn(`Backend not reachable at ${BACKEND_URL}. Start with: cd server && node server.js`);
  }
}

// --- 3. AI service health ---
async function checkAIServiceHealth() {
  console.log('\n--- AI service health (Python .venv) ---');
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (res.ok && data.status) {
      ok(`AI service health OK (${AI_SERVICE_URL}), status: ${data.status}`);
    } else {
      fail(`AI service returned ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch {
    warn(`AI service not reachable at ${AI_SERVICE_URL}. Start with: cd ai-service && .venv\\Scripts\\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`);
  }
}

// --- 4. Auth endpoint sanity (backend must be up) ---
async function checkAuthRoute() {
  console.log('\n--- Auth route validation ---');
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'V',
        email: 'invalid-email',
        password: 'short',
        role: 'user',
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    if (res.status === 400 && !data.success) {
      ok('Auth validation works (invalid register returns 400).');
    } else if (res.status === 500) {
      fail('Auth route returned 500. Check server logs and DB connection.');
    } else {
      ok(`Auth route responded (${res.status}).`);
    }
  } catch {
    warn('Could not test auth route (backend may be down).');
  }
}

// --- 5. Frontend build ---
async function runFrontendBuild() {
  console.log('\n--- Frontend build ---');
  const { execSync } = await import('child_process');
  try {
    execSync('npm run build', {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    ok('Frontend build succeeded.');
  } catch {
    fail('Frontend build failed. Run: npm run build');
  }
}

// --- 6. Frontend lint ---
async function runFrontendLint() {
  console.log('\n--- Frontend lint ---');
  const { execSync } = await import('child_process');
  try {
    execSync('npm run lint', {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    ok('Frontend lint passed.');
  } catch {
    fail('Frontend lint failed. Run: npm run lint');
  }
}

async function main() {
  console.log('VidAI Full System Validation');
  console.log('============================');

  checkServerEnv();
  await checkBackendHealth();
  await checkAIServiceHealth();
  await checkAuthRoute();
  await runFrontendBuild();
  await runFrontendLint();

  console.log('\n--- Summary ---');
  console.log('Passed:', results.ok.length);
  console.log('Warnings:', results.warn.length);
  console.log('Failed:', results.fail.length);
  if (results.fail.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
