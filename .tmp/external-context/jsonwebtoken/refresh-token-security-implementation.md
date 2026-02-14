---
source: Official GitHub & npm Documentation
library: jsonwebtoken
package: jsonwebtoken
topic: Refresh Token Flow with Separate Secrets & Security Best Practices
fetched: 2026-02-14T00:00:00Z
official_docs: https://github.com/auth0/node-jsonwebtoken
version: 9.0.3
---

# Secure Refresh Token Implementation with jsonwebtoken

## Critical Security Issue Summary

**Your current security vulnerabilities:**
1. ❌ Using the same `JWT_SECRET` for both access and refresh tokens
2. ❌ Refresh token endpoint doesn't verify tokens with `jwt.verify()`
3. ❌ Only checking database existence (missing cryptographic verification)

**What you need to fix:**
1. ✅ Use separate secrets for access and refresh tokens
2. ✅ Always verify refresh tokens with `jwt.verify()` before accepting them
3. ✅ Add custom claims (`type: 'access'` or `type: 'refresh'`) to prevent token misuse
4. ✅ Implement proper token rotation and expiration strategies

---

## 1. Implementing Separate Secrets for Access and Refresh Tokens

### Environment Configuration

```bash
# .env file
ACCESS_TOKEN_SECRET=your-very-long-random-secret-for-access-tokens-min-256-bits
REFRESH_TOKEN_SECRET=your-different-very-long-random-secret-for-refresh-tokens-min-256-bits

# Generate secure secrets using:
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Token Generation with Custom Claims

```javascript
const jwt = require('jsonwebtoken');

// Generate Access Token (short-lived, 15 minutes)
function generateAccessToken(userId) {
  const payload = {
    userId: userId,
    type: 'access',  // CRITICAL: Prevents refresh tokens from being used as access tokens
  };

  return jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    { 
      expiresIn: '15m',  // Short-lived
      algorithm: 'HS256',
      issuer: 'your-app-name',
      audience: 'your-app-users'
    }
  );
}

// Generate Refresh Token (long-lived, 7 days)
function generateRefreshToken(userId) {
  const payload = {
    userId: userId,
    type: 'refresh',  // CRITICAL: Prevents access tokens from being used as refresh tokens
  };

  return jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET,  // Different secret!
    { 
      expiresIn: '7d',  // Long-lived
      algorithm: 'HS256',
      issuer: 'your-app-name',
      audience: 'your-app-users',
      jwtid: require('crypto').randomBytes(16).toString('hex')  // Unique token ID for revocation
    }
  );
}

// Usage example
const accessToken = generateAccessToken(user.id);
const refreshToken = generateRefreshToken(user.id);
```

---

## 2. Proper Token Verification (CRITICAL FIX)

### Verify Access Token Middleware

```javascript
function verifyAccessToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,  // Use access token secret
      {
        algorithms: ['HS256'],  // Specify allowed algorithms
        issuer: 'your-app-name',
        audience: 'your-app-users'
      }
    );

    // CRITICAL: Verify token type
    if (decoded.type !== 'access') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    req.userId = decoded.userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid access token' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
}
```

### Verify Refresh Token (THE FIX YOU NEED)

```javascript
async function verifyRefreshToken(req, res, next) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    // STEP 1: CRYPTOGRAPHIC VERIFICATION (YOU'RE MISSING THIS!)
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,  // Use refresh token secret
      {
        algorithms: ['HS256'],
        issuer: 'your-app-name',
        audience: 'your-app-users'
      }
    );

    // STEP 2: Verify token type
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ error: 'Invalid token type' });
    }

    // STEP 3: Check database for token revocation (your current approach)
    const tokenExists = await db.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND revoked = false',
      [decoded.userId, refreshToken]
    );

    if (tokenExists.rows.length === 0) {
      return res.status(403).json({ error: 'Refresh token revoked or not found' });
    }

    req.userId = decoded.userId;
    req.tokenId = decoded.jti;  // For token rotation
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Token expired - delete from database
      await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid refresh token' });
    }
    return res.status(500).json({ error: 'Token verification failed' });
  }
}
```

---

## 3. Token Rotation Best Practices

### Refresh Token Endpoint with Rotation

```javascript
app.post('/auth/refresh', verifyRefreshToken, async (req, res) => {
  const { refreshToken } = req.body;
  const userId = req.userId;

  try {
    // STEP 1: Generate new tokens
    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = generateRefreshToken(userId);

    // STEP 2: Revoke old refresh token (TOKEN ROTATION)
    await db.query(
      'UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE token = $1',
      [refreshToken]
    );

    // STEP 3: Store new refresh token
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [userId, newRefreshToken]
    );

    // STEP 4: Return new tokens
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});
```

### Automatic Token Rotation Detection (Prevent Replay Attacks)

```javascript
// Detect if a revoked refresh token is being reused (possible attack)
async function detectTokenReuse(req, res, next) {
  const { refreshToken } = req.body;

  // Check if token was revoked
  const revokedToken = await db.query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = true',
    [refreshToken]
  );

  if (revokedToken.rows.length > 0) {
    // SECURITY INCIDENT: Someone is trying to reuse a revoked token
    const userId = revokedToken.rows[0].user_id;

    // Revoke ALL tokens for this user
    await db.query(
      'UPDATE refresh_tokens SET revoked = true WHERE user_id = $1',
      [userId]
    );

    // Log security incident
    console.error(`SECURITY ALERT: Refresh token reuse detected for user ${userId}`);

    return res.status(403).json({ 
      error: 'Token reuse detected. All sessions have been terminated.' 
    });
  }

  next();
}

// Use in refresh endpoint
app.post('/auth/refresh', detectTokenReuse, verifyRefreshToken, async (req, res) => {
  // ... token refresh logic
});
```

---

## 4. Login Endpoint (Complete Implementation)

```javascript
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Authenticate user
    const user = await authenticateUser(email, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in database
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')',
      [user.id, refreshToken]
    );

    // Return tokens
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});
```

---

## 5. Logout Implementation (Revoke Refresh Token)

```javascript
app.post('/auth/logout', verifyAccessToken, async (req, res) => {
  const { refreshToken } = req.body;
  const userId = req.userId;

  try {
    // Revoke the specific refresh token
    await db.query(
      'UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = $1 AND token = $2',
      [userId, refreshToken]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Logout from all devices
app.post('/auth/logout-all', verifyAccessToken, async (req, res) => {
  const userId = req.userId;

  try {
    await db.query(
      'UPDATE refresh_tokens SET revoked = true, revoked_at = NOW() WHERE user_id = $1',
      [userId]
    );

    res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});
```

---

## 6. Database Schema for Refresh Tokens

```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_revoked (revoked)
);

-- Clean up expired tokens periodically
CREATE OR REPLACE FUNCTION delete_expired_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM refresh_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via cron or pg_cron)
-- SELECT delete_expired_tokens();
```

---

## 7. Security Best Practices

### Token Expiration Strategy

| Token Type | Recommended Expiration | Reasoning |
|-----------|------------------------|-----------|
| Access Token | 15 minutes - 1 hour | Short-lived minimizes damage if stolen |
| Refresh Token | 7 days - 30 days | Long enough for good UX, short enough to limit exposure |

### Secret Management

```javascript
// ❌ NEVER DO THIS
const secret = 'my-secret-key';

// ✅ DO THIS
const secret = process.env.ACCESS_TOKEN_SECRET;

// ✅ Generate strong secrets (minimum 256 bits)
// node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

// ✅ Use different secrets for different environments
// .env.development
// .env.production
```

### Algorithm Selection

```javascript
// ❌ AVOID: Asymmetric algorithms are overkill for simple auth
jwt.sign(payload, privateKey, { algorithm: 'RS256' });

// ✅ RECOMMENDED: HMAC-SHA256 for most use cases
jwt.sign(payload, secret, { algorithm: 'HS256' });

// ALWAYS specify algorithms in verify()
jwt.verify(token, secret, { algorithms: ['HS256'] });  // Prevents algorithm confusion attacks
```

### Custom Claims Validation

```javascript
// Add custom claims to prevent token misuse
const payload = {
  userId: user.id,
  type: 'access',  // or 'refresh'
  roles: ['user', 'admin'],  // Optional: for RBAC
  permissions: ['read:posts', 'write:posts']  // Optional: fine-grained permissions
};

// Validate custom claims
function validateTokenType(token, expectedType) {
  const decoded = jwt.verify(token, secret);
  
  if (decoded.type !== expectedType) {
    throw new Error(`Expected ${expectedType} token, got ${decoded.type}`);
  }
  
  return decoded;
}
```

---

## 8. Common Security Mistakes to Avoid

### ❌ Mistake #1: Not Verifying Refresh Tokens

```javascript
// ❌ INSECURE: Only checking database
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  const tokenExists = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
  
  if (tokenExists) {
    // VULNERABILITY: Anyone can forge a token if they know the format
    const newAccessToken = generateAccessToken(tokenExists.user_id);
    res.json({ accessToken: newAccessToken });
  }
});

// ✅ SECURE: Always verify cryptographically
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  
  // STEP 1: Cryptographic verification
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  
  // STEP 2: Database check
  const tokenExists = await db.query('SELECT * FROM refresh_tokens WHERE token = $1', [refreshToken]);
  
  if (tokenExists) {
    const newAccessToken = generateAccessToken(decoded.userId);
    res.json({ accessToken: newAccessToken });
  }
});
```

### ❌ Mistake #2: Using the Same Secret

```javascript
// ❌ INSECURE
const ACCESS_TOKEN = jwt.sign({ userId: 1, type: 'access' }, 'same-secret');
const REFRESH_TOKEN = jwt.sign({ userId: 1, type: 'refresh' }, 'same-secret');

// If attacker gets the secret from access token, they can forge refresh tokens!

// ✅ SECURE
const ACCESS_TOKEN = jwt.sign({ userId: 1, type: 'access' }, process.env.ACCESS_TOKEN_SECRET);
const REFRESH_TOKEN = jwt.sign({ userId: 1, type: 'refresh' }, process.env.REFRESH_TOKEN_SECRET);
```

### ❌ Mistake #3: Not Rotating Refresh Tokens

```javascript
// ❌ INSECURE: Reusing refresh tokens
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  
  const newAccessToken = generateAccessToken(decoded.userId);
  
  // Still using the old refresh token!
  res.json({ accessToken: newAccessToken, refreshToken: refreshToken });
});

// ✅ SECURE: Rotate refresh tokens on each use
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  
  const newAccessToken = generateAccessToken(decoded.userId);
  const newRefreshToken = generateRefreshToken(decoded.userId);
  
  // Revoke old refresh token
  await db.query('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [refreshToken]);
  
  // Store new refresh token
  await db.query('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')', [decoded.userId, newRefreshToken]);
  
  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});
```

---

## 9. Error Handling Reference

### JWT Error Types

```javascript
jwt.verify(token, secret, (err, decoded) => {
  if (err) {
    switch (err.name) {
      case 'TokenExpiredError':
        // err.expiredAt contains expiration timestamp
        console.log('Token expired at:', err.expiredAt);
        break;
        
      case 'JsonWebTokenError':
        // Invalid token (malformed, wrong signature, etc.)
        console.log('Invalid token:', err.message);
        break;
        
      case 'NotBeforeError':
        // Token not yet valid (nbf claim)
        console.log('Token not active until:', err.date);
        break;
        
      default:
        console.log('Token verification failed:', err);
    }
  }
});
```

### Complete Error Handling Example

```javascript
function verifyToken(token, secret, tokenType) {
  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: 'your-app-name',
      audience: 'your-app-users'
    });

    if (decoded.type !== tokenType) {
      throw new Error(`Invalid token type. Expected ${tokenType}, got ${decoded.type}`);
    }

    return { success: true, decoded };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { success: false, error: 'TOKEN_EXPIRED', message: 'Token has expired' };
    }
    if (err.name === 'JsonWebTokenError') {
      return { success: false, error: 'INVALID_TOKEN', message: 'Token is invalid' };
    }
    if (err.name === 'NotBeforeError') {
      return { success: false, error: 'TOKEN_NOT_ACTIVE', message: 'Token not yet active' };
    }
    return { success: false, error: 'VERIFICATION_FAILED', message: err.message };
  }
}

// Usage
const result = verifyToken(req.headers.authorization, process.env.ACCESS_TOKEN_SECRET, 'access');
if (!result.success) {
  return res.status(401).json({ error: result.error, message: result.message });
}
```

---

## 10. Quick Migration Checklist

To fix your current security issues:

- [ ] **Generate two separate secrets** (256+ bits each)
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```

- [ ] **Update token generation** to use separate secrets
  - Access tokens: Use `ACCESS_TOKEN_SECRET`
  - Refresh tokens: Use `REFRESH_TOKEN_SECRET`

- [ ] **Add custom `type` claim** to all tokens
  - Access tokens: `{ type: 'access', ... }`
  - Refresh tokens: `{ type: 'refresh', ... }`

- [ ] **Fix refresh endpoint** to call `jwt.verify()` BEFORE database check
  ```javascript
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  ```

- [ ] **Verify token type** in all verification middleware
  ```javascript
  if (decoded.type !== 'access') throw new Error('Invalid token type');
  ```

- [ ] **Implement token rotation** on refresh
  - Generate new refresh token
  - Revoke old refresh token
  - Return both new tokens

- [ ] **Add token reuse detection** to prevent replay attacks

- [ ] **Update database schema** to support revocation
  - Add `revoked` boolean column
  - Add `revoked_at` timestamp column

- [ ] **Implement cleanup job** for expired tokens

- [ ] **Test security**
  - Try using refresh token as access token (should fail)
  - Try using access token as refresh token (should fail)
  - Try reusing revoked refresh token (should fail)
  - Try forged tokens (should fail)

---

## Official Documentation Links

- GitHub: https://github.com/auth0/node-jsonwebtoken
- npm: https://www.npmjs.com/package/jsonwebtoken
- JWT Specification: https://tools.ietf.org/html/rfc7519
- Refresh Token Best Practices: https://github.com/auth0/node-jsonwebtoken/issues/122
