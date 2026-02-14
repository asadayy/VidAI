---
source: Official Documentation & Security Best Practices
library: jsonwebtoken
package: jsonwebtoken
topic: JWT Security Best Practices & Common Vulnerabilities
fetched: 2026-02-14T00:00:00Z
official_docs: https://github.com/auth0/node-jsonwebtoken
---

# JWT Security Best Practices for Node.js/Express

## Critical Security Principles

### 1. Secret Management

#### ✅ DO: Use Environment Variables

```javascript
require('dotenv').config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('JWT secrets not configured. Set ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET in .env');
}
```

#### ❌ DON'T: Hardcode Secrets

```javascript
// ❌ NEVER DO THIS
const secret = 'my-secret-key';
const secret = 'shhhhh';

// ❌ NEVER commit secrets to git
// .env file should be in .gitignore
```

#### Generating Secure Secrets

```javascript
// Generate a 512-bit (64 bytes) secret
const crypto = require('crypto');
const secret = crypto.randomBytes(64).toString('hex');
console.log(secret);

// Output example:
// 8f7a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0

// Minimum secret length: 256 bits (32 bytes)
// Recommended: 512 bits (64 bytes)
```

#### Secret Rotation Strategy

```javascript
// Support multiple secrets for rotation (zero-downtime updates)
const CURRENT_SECRET = process.env.ACCESS_TOKEN_SECRET;
const PREVIOUS_SECRET = process.env.ACCESS_TOKEN_SECRET_OLD;

function verifyTokenWithRotation(token) {
  try {
    // Try current secret first
    return jwt.verify(token, CURRENT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    if (PREVIOUS_SECRET && err.name === 'JsonWebTokenError') {
      // Fallback to previous secret during rotation period
      return jwt.verify(token, PREVIOUS_SECRET, { algorithms: ['HS256'] });
    }
    throw err;
  }
}
```

---

### 2. Algorithm Security

#### ✅ DO: Specify Algorithms Explicitly

```javascript
// When signing
const token = jwt.sign(
  payload,
  secret,
  { algorithm: 'HS256' }  // Always specify algorithm
);

// When verifying
const decoded = jwt.verify(
  token,
  secret,
  { algorithms: ['HS256'] }  // CRITICAL: Prevent algorithm confusion attacks
);
```

#### ❌ DON'T: Allow Algorithm Switching

```javascript
// ❌ VULNERABLE TO ALGORITHM CONFUSION ATTACK
const decoded = jwt.verify(token, secret);  // No algorithm specified!

// An attacker can change the algorithm in the header to "none"
// and bypass signature verification
```

#### Algorithm Selection Guide

| Algorithm | Use Case | Security |
|-----------|----------|----------|
| HS256 | Symmetric (shared secret) | ✅ Recommended for most apps |
| HS384 | Symmetric (stronger) | ✅ Good for high-security needs |
| HS512 | Symmetric (strongest) | ✅ Best for maximum security |
| RS256 | Asymmetric (public/private keys) | ⚠️ More complex, use for federated auth |
| none | No signature | ❌ NEVER USE |

```javascript
// ✅ Recommended for most Node.js/Express apps
jwt.sign(payload, secret, { algorithm: 'HS256' });

// ✅ For higher security requirements
jwt.sign(payload, secret, { algorithm: 'HS512' });

// ⚠️ Only use asymmetric if you need public key distribution
const privateKey = fs.readFileSync('private.key');
jwt.sign(payload, privateKey, { algorithm: 'RS256' });
```

---

### 3. Token Expiration Strategy

#### Short-Lived Access Tokens

```javascript
// ✅ RECOMMENDED: 15 minutes to 1 hour
const accessToken = jwt.sign(
  { userId: user.id, type: 'access' },
  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn: '15m' }  // 15 minutes
);

// For high-security applications
const accessToken = jwt.sign(
  { userId: user.id, type: 'access' },
  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn: '5m' }  // 5 minutes
);

// ❌ DON'T: Long-lived access tokens
const accessToken = jwt.sign(
  { userId: user.id },
  secret,
  { expiresIn: '30d' }  // 30 days - TOO LONG!
);
```

#### Long-Lived Refresh Tokens

```javascript
// ✅ RECOMMENDED: 7 to 30 days
const refreshToken = jwt.sign(
  { userId: user.id, type: 'refresh' },
  process.env.REFRESH_TOKEN_SECRET,
  { 
    expiresIn: '7d',  // 7 days
    jwtid: crypto.randomBytes(16).toString('hex')  // For revocation
  }
);

// For very high-security applications
const refreshToken = jwt.sign(
  { userId: user.id, type: 'refresh' },
  process.env.REFRESH_TOKEN_SECRET,
  { expiresIn: '1d' }  // 1 day - requires frequent re-login
);
```

#### Expiration Best Practices

| Application Type | Access Token | Refresh Token | Reasoning |
|-----------------|--------------|---------------|-----------|
| Banking/Finance | 5-10 minutes | 1-3 days | Maximum security |
| E-commerce | 15-30 minutes | 7 days | Balance security/UX |
| Social Media | 30-60 minutes | 30 days | Better UX |
| Internal Tools | 1 hour | 90 days | Convenience |

---

### 4. Custom Claims & Validation

#### Standard JWT Claims

```javascript
const payload = {
  // Standard claims
  iss: 'your-app-name',           // Issuer
  aud: 'your-app-users',          // Audience
  sub: user.id.toString(),        // Subject (user ID)
  iat: Math.floor(Date.now() / 1000),  // Issued at
  exp: Math.floor(Date.now() / 1000) + (15 * 60),  // Expiration
  nbf: Math.floor(Date.now() / 1000),  // Not before
  jti: crypto.randomBytes(16).toString('hex'),  // JWT ID (for revocation)
  
  // Custom claims
  type: 'access',                 // Token type
  roles: ['user', 'admin'],       // User roles
  permissions: ['read', 'write']  // Permissions
};

const token = jwt.sign(
  payload,
  secret,
  {
    algorithm: 'HS256',
    issuer: 'your-app-name',
    audience: 'your-app-users'
  }
);
```

#### Validating Claims

```javascript
function validateToken(token, expectedType) {
  const decoded = jwt.verify(
    token,
    secret,
    {
      algorithms: ['HS256'],
      issuer: 'your-app-name',      // Validates 'iss' claim
      audience: 'your-app-users',   // Validates 'aud' claim
      clockTolerance: 30            // Allow 30 seconds clock skew
    }
  );

  // Validate custom type claim
  if (decoded.type !== expectedType) {
    throw new Error(`Invalid token type. Expected ${expectedType}, got ${decoded.type}`);
  }

  // Validate roles/permissions if needed
  if (!decoded.roles || !Array.isArray(decoded.roles)) {
    throw new Error('Invalid token: missing roles');
  }

  return decoded;
}

// Usage
try {
  const decoded = validateToken(token, 'access');
  console.log('Token valid for user:', decoded.sub);
} catch (err) {
  console.error('Token validation failed:', err.message);
}
```

---

### 5. Token Storage

#### ✅ DO: Use httpOnly Cookies for Web Apps

```javascript
// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password);

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);

  // Store tokens in httpOnly cookies (prevents XSS attacks)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,    // Cannot be accessed by JavaScript
    secure: true,      // Only sent over HTTPS
    sameSite: 'strict', // CSRF protection
    maxAge: 15 * 60 * 1000  // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
  });

  res.json({ success: true });
});

// Middleware to extract token from cookie
function extractTokenFromCookie(req, res, next) {
  const token = req.cookies.accessToken;
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  req.token = token;
  next();
}
```

#### ⚠️ CAUTION: localStorage/sessionStorage (Mobile/SPA)

```javascript
// For SPAs/mobile apps, use Authorization header
// Client stores token in memory (not localStorage!)

// ❌ AVOID: localStorage is vulnerable to XSS
localStorage.setItem('accessToken', token);

// ✅ BETTER: Store in memory only
let accessToken = null;

function setAccessToken(token) {
  accessToken = token;
}

function getAccessToken() {
  return accessToken;
}

// Make authenticated requests
fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${getAccessToken()}`
  }
});
```

#### Token Storage Comparison

| Storage Method | XSS Protection | CSRF Protection | Use Case |
|---------------|----------------|-----------------|----------|
| httpOnly Cookie | ✅ Yes | ⚠️ Needs SameSite | Web apps |
| localStorage | ❌ No | ✅ Yes | ❌ Not recommended |
| sessionStorage | ❌ No | ✅ Yes | ❌ Not recommended |
| Memory (variable) | ✅ Yes | ✅ Yes | ✅ SPAs/mobile |

---

### 6. Token Revocation Strategies

#### Database-Based Revocation

```javascript
// Refresh token table
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token_hash VARCHAR(64) UNIQUE NOT NULL,  -- Store hash, not plaintext
  jti VARCHAR(32) UNIQUE NOT NULL,         -- JWT ID for revocation
  revoked BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

// Store refresh token
async function storeRefreshToken(userId, token, decoded) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await db.query(`
    INSERT INTO refresh_tokens (user_id, token_hash, jti, expires_at)
    VALUES ($1, $2, $3, $4)
  `, [userId, tokenHash, decoded.jti, new Date(decoded.exp * 1000)]);
}

// Verify refresh token
async function verifyRefreshToken(token) {
  // Step 1: Cryptographic verification
  const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, {
    algorithms: ['HS256']
  });

  // Step 2: Check database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const result = await db.query(`
    SELECT * FROM refresh_tokens
    WHERE token_hash = $1 AND revoked = false
  `, [tokenHash]);

  if (result.rows.length === 0) {
    throw new Error('Token revoked or not found');
  }

  return decoded;
}

// Revoke token by JTI
async function revokeTokenByJti(jti) {
  await db.query(`
    UPDATE refresh_tokens
    SET revoked = true
    WHERE jti = $1
  `, [jti]);
}
```

#### Redis-Based Revocation (Blacklist)

```javascript
const redis = require('redis');
const client = redis.createClient();

// Blacklist a token
async function blacklistToken(token, decoded) {
  const ttl = decoded.exp - Math.floor(Date.now() / 1000);
  
  if (ttl > 0) {
    await client.setex(`blacklist:${decoded.jti}`, ttl, '1');
  }
}

// Check if token is blacklisted
async function isTokenBlacklisted(decoded) {
  const result = await client.get(`blacklist:${decoded.jti}`);
  return result !== null;
}

// Middleware
async function checkBlacklist(req, res, next) {
  const token = req.token;
  const decoded = jwt.decode(token, { complete: true });

  if (await isTokenBlacklisted(decoded.payload)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  next();
}
```

---

### 7. HTTPS and Transport Security

```javascript
// ✅ Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// ✅ Set security headers
const helmet = require('helmet');
app.use(helmet());

// ✅ Set HSTS (HTTP Strict Transport Security)
app.use(helmet.hsts({
  maxAge: 31536000,  // 1 year
  includeSubDomains: true,
  preload: true
}));
```

---

### 8. Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Rate limit auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 requests per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/auth/login', authLimiter, async (req, res) => {
  // Login logic
});

app.post('/auth/refresh', authLimiter, async (req, res) => {
  // Refresh logic
});

// Rate limit by user ID (after authentication)
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,  // 3 requests per hour
  keyGenerator: (req) => req.userId,  // Rate limit by user
  skipSuccessfulRequests: true
});
```

---

### 9. Token Size Considerations

```javascript
// ❌ DON'T: Store large data in JWT
const badPayload = {
  userId: 1,
  userProfile: {
    name: 'John Doe',
    email: 'john@example.com',
    address: '123 Main St',
    preferences: { /* large object */ },
    history: [ /* array of 1000 items */ ]
  }
};

// ✅ DO: Store minimal data
const goodPayload = {
  userId: 1,
  type: 'access',
  roles: ['user']
};

// If you need more data, fetch it from the database using userId
```

**Why?**
- JWTs are sent with EVERY request
- Large tokens increase bandwidth and latency
- Keep tokens under 1KB
- Store only essential claims

---

### 10. Testing Security

```javascript
// Test suite for JWT security
const request = require('supertest');
const app = require('./app');

describe('JWT Security Tests', () => {
  test('Should reject tokens with wrong secret', async () => {
    const fakeToken = jwt.sign({ userId: 1 }, 'wrong-secret');
    
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${fakeToken}`);
    
    expect(res.status).toBe(403);
  });

  test('Should reject expired tokens', async () => {
    const expiredToken = jwt.sign(
      { userId: 1, type: 'access' },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '-1s' }  // Already expired
    );
    
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${expiredToken}`);
    
    expect(res.status).toBe(401);
  });

  test('Should reject refresh token used as access token', async () => {
    const refreshToken = generateRefreshToken(1);
    
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${refreshToken}`);
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Invalid token type');
  });

  test('Should reject access token used as refresh token', async () => {
    const accessToken = generateAccessToken(1);
    
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: accessToken });
    
    expect(res.status).toBe(403);
  });

  test('Should detect token reuse', async () => {
    const refreshToken = generateRefreshToken(1);
    
    // Use token once (should succeed)
    await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    
    // Try to reuse (should fail and revoke all tokens)
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });
    
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Token reuse detected');
  });

  test('Should enforce algorithm', async () => {
    // Try to change algorithm to 'none'
    const parts = validToken.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    header.alg = 'none';
    
    const tamperedToken = Buffer.from(JSON.stringify(header)).toString('base64') + '.' + parts[1] + '.';
    
    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${tamperedToken}`);
    
    expect(res.status).toBe(403);
  });
});
```

---

## Security Checklist

### Critical Security Checks

- [ ] ✅ Using separate secrets for access and refresh tokens
- [ ] ✅ Secrets are at least 256 bits (32 bytes)
- [ ] ✅ Secrets stored in environment variables, not hardcoded
- [ ] ✅ Algorithm explicitly specified in `jwt.sign()` and `jwt.verify()`
- [ ] ✅ Token type (`access` or `refresh`) included in payload
- [ ] ✅ Token type validated in all verification middleware
- [ ] ✅ Refresh tokens cryptographically verified with `jwt.verify()`
- [ ] ✅ Short expiration for access tokens (15 min - 1 hour)
- [ ] ✅ Reasonable expiration for refresh tokens (7-30 days)
- [ ] ✅ Refresh tokens rotated on each use
- [ ] ✅ Token reuse detection implemented
- [ ] ✅ Revoked tokens stored in database
- [ ] ✅ Expired tokens cleaned up periodically
- [ ] ✅ Rate limiting on auth endpoints
- [ ] ✅ HTTPS enforced in production
- [ ] ✅ httpOnly cookies used (or tokens in memory for SPAs)
- [ ] ✅ Security headers set (Helmet)
- [ ] ✅ Standard JWT claims validated (iss, aud, exp, etc.)
- [ ] ✅ Error messages don't leak sensitive information
- [ ] ✅ Security tests written and passing

### Additional Recommendations

- [ ] Implement logging for security events (failed logins, token reuse, etc.)
- [ ] Monitor for unusual patterns (many failed attempts, token reuse)
- [ ] Set up alerts for security incidents
- [ ] Regular security audits
- [ ] Keep dependencies updated (`npm audit`)
- [ ] Use a Web Application Firewall (WAF) in production
- [ ] Implement account lockout after failed attempts
- [ ] Add 2FA for sensitive operations
- [ ] Document your JWT implementation
- [ ] Train team on JWT security best practices

---

## Common Vulnerabilities & Fixes

### 1. Algorithm Confusion Attack

**Vulnerability:**
```javascript
// ❌ No algorithm specified
const decoded = jwt.verify(token, secret);
```

**Attack:** Attacker changes `alg` header to `none`, bypassing signature verification.

**Fix:**
```javascript
// ✅ Always specify algorithms
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
```

---

### 2. Key Confusion Attack

**Vulnerability:**
```javascript
// Using RS256 (asymmetric) but public key is accessible
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

// Attacker changes algorithm to HS256 and signs with the public key
```

**Fix:**
```javascript
// For most apps, use HS256 with a strong secret
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

// When verifying, enforce the algorithm
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

---

### 3. Token Sidejacking

**Vulnerability:** Tokens transmitted over HTTP can be intercepted.

**Fix:**
```javascript
// ✅ Always use HTTPS in production
if (process.env.NODE_ENV === 'production') {
  res.cookie('token', token, {
    secure: true,  // Only sent over HTTPS
    httpOnly: true,
    sameSite: 'strict'
  });
}
```

---

### 4. XSS Token Theft

**Vulnerability:** Tokens stored in localStorage can be stolen via XSS.

**Fix:**
```javascript
// ✅ Use httpOnly cookies
res.cookie('accessToken', token, {
  httpOnly: true,  // Cannot be accessed by JavaScript
  secure: true,
  sameSite: 'strict'
});

// Or store in memory only (for SPAs)
let accessToken = null;  // Never in localStorage!
```

---

### 5. Weak Secrets

**Vulnerability:**
```javascript
const secret = 'secret';  // Only 6 characters = 48 bits
```

**Fix:**
```javascript
// ✅ Use 256-bit (32 bytes) or larger secrets
const secret = crypto.randomBytes(64).toString('hex');
// Output: 128-character hex string (512 bits)
```

---

## Additional Resources

- **JWT Official Spec:** https://tools.ietf.org/html/rfc7519
- **OWASP JWT Cheat Sheet:** https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html
- **Auth0 JWT Handbook:** https://auth0.com/resources/ebooks/jwt-handbook
- **Node.js Security Checklist:** https://blog.risingstack.com/node-js-security-checklist/
