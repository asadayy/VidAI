# Design Document: Production Deployment

## Overview

This document outlines the deployment architecture for VidAI, a three-tier wedding planning platform consisting of a React frontend, Node.js backend, and Python AI service. The deployment strategy uses Vercel for frontend hosting (leveraging their CDN and automatic deployments) and Docker containerization for backend services (enabling consistent deployment across environments). The architecture prioritizes security, scalability, and maintainability while keeping operational complexity manageable.

### Deployment Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
    end
    
    subgraph "Vercel CDN"
        Frontend[React Frontend<br/>Port 443 HTTPS]
    end
    
    subgraph "Docker Host"
        subgraph "Docker Network: vidai-network"
            Backend[Backend Service<br/>Node.js:5000]
            AI[AI Service<br/>FastAPI:8000]
            MongoDB[(MongoDB<br/>Port 27017)]
        end
        
        Volumes[("Volumes<br/>- mongodb-data<br/>- logs<br/>- ollama-models")]
    end
    
    subgraph "External Services"
        Atlas[(MongoDB Atlas)]
        Stripe[Stripe API]
        Cloudinary[Cloudinary]
        SendGrid[SendGrid]
    end
    
    Browser -->|HTTPS| Frontend
    Frontend -->|API Calls| Backend
    Frontend -->|AI Requests| AI
    Backend -->|Data| MongoDB
    Backend -->|Data| Atlas
    AI -->|Models| Volumes
    Backend -->|Logs| Volumes
    MongoDB -->|Persist| Volumes
    Backend -->|Payment| Stripe
    Backend -->|Media| Cloudinary
    Backend -->|Email| SendGrid
```

## Architecture

### Component Overview

The VidAI platform consists of three independently deployable components:

1. **Frontend Application (React + Vite)**: Single-page application served via Vercel's global CDN, providing the user interface for wedding planning features
2. **Backend Service (Node.js + Express)**: RESTful API server handling business logic, authentication, data persistence, and third-party integrations
3. **AI Service (Python + FastAPI)**: Microservice providing AI-powered features using Ollama for local LLM inference

### Deployment Strategy

**Frontend**: Deployed to Vercel for automatic builds, CDN distribution, and zero-configuration HTTPS. Vercel provides instant rollbacks, preview deployments for pull requests, and automatic SSL certificate management.

**Backend Services**: Containerized using Docker and orchestrated with Docker Compose. This approach ensures:
- Consistent environments across development, staging, and production
- Easy scaling and resource management
- Isolated networking between services
- Simple rollback via image versioning

**Database**: Supports two deployment modes:
- **MongoDB Atlas** (recommended for production): Managed service with automatic backups, scaling, and monitoring
- **Containerized MongoDB**: For development or self-hosted production environments

### Network Architecture

All backend services run within a Docker bridge network (`vidai-network`), enabling service-to-service communication using container names as hostnames. Only the Backend and AI services expose ports to the host machine. MongoDB remains internal to the Docker network for security.

## Components and Interfaces

### 1. Frontend Application (Vercel)

**Technology Stack**: React 19, Vite 7, React Router 7

**Build Configuration**:
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 18.x or higher
- Framework preset: Vite

**Environment Variables**:
```
VITE_API_URL          # Backend API base URL (e.g., https://api.vidai.com)
VITE_AI_SERVICE_URL   # AI service base URL (e.g., https://ai.vidai.com)
```

**Routing Configuration**: All routes must be rewritten to `/index.html` to support client-side routing (SPA behavior). Vercel handles this automatically for Vite projects, but explicit configuration ensures compatibility.

**Build Optimization**:
- Code splitting enabled by default in Vite
- Asset optimization (minification, tree-shaking)
- Lazy loading for route components
- React Compiler plugin for optimized rendering

### 2. Backend Service (Docker Container)

**Technology Stack**: Node.js 18+, Express 4, MongoDB 8, Mongoose

**Container Specifications**:
- Base image: `node:18-alpine` (multi-stage build)
- Exposed port: 5000
- Working directory: `/app`
- Health check: `GET /api/v1/health` every 30s

**Environment Variables**:
```
NODE_ENV              # Environment: development, staging, production
PORT                  # Server port (default: 5000)
MONGODB_URI           # MongoDB connection string
JWT_SECRET            # Secret key for JWT token signing
JWT_EXPIRE            # JWT expiration time (e.g., 7d)
STRIPE_SECRET_KEY     # Stripe API secret key
STRIPE_WEBHOOK_SECRET # Stripe webhook signing secret
CLOUDINARY_CLOUD_NAME # Cloudinary cloud name
CLOUDINARY_API_KEY    # Cloudinary API key
CLOUDINARY_API_SECRET # Cloudinary API secret
SENDGRID_API_KEY      # SendGrid API key
SENDGRID_FROM_EMAIL   # Sender email address
CORS_ORIGIN           # Allowed CORS origins (comma-separated)
RATE_LIMIT_WINDOW     # Rate limit window in minutes (default: 15)
RATE_LIMIT_MAX        # Max requests per window (default: 100)
```

**Dependencies** (from package.json):
- Core: express, mongoose, dotenv
- Security: helmet, cors, express-rate-limit, express-mongo-sanitize, hpp
- Authentication: jsonwebtoken, bcryptjs
- Integrations: stripe, cloudinary, @sendgrid/mail
- Utilities: morgan, winston, compression, multer, validator

**Health Check Endpoint**:
```javascript
GET /api/v1/health
Response: {
  status: "healthy" | "unhealthy",
  timestamp: "2024-01-15T10:30:00Z",
  database: "connected" | "disconnected",
  uptime: 3600
}
```

### 3. AI Service (Docker Container)

**Technology Stack**: Python 3.11+, FastAPI, Ollama, httpx

**Container Specifications**:
- Base image: `python:3.11-slim` (multi-stage build)
- Exposed port: 8000
- Working directory: `/app`
- Health check: `GET /health` every 30s
- Volume mount: `/root/.ollama` for model persistence

**Environment Variables**:
```
HOST                  # Service host (default: 0.0.0.0)
PORT                  # Service port (default: 8000)
DEBUG                 # Debug mode (true/false)
OLLAMA_BASE_URL       # Ollama API URL (default: http://localhost:11434)
OLLAMA_MODEL          # Model name (default: llama3.2:3b)
OLLAMA_TIMEOUT        # Request timeout in seconds (default: 60)
CORS_ORIGINS          # Allowed CORS origins (comma-separated)
```

**Dependencies** (from requirements.txt):
- Core: fastapi, uvicorn, httpx, pydantic
- Utilities: python-dotenv, PyYAML

**Health Check Endpoint**:
```python
GET /health
Response: {
  status: "healthy" | "degraded",
  service: "vidai-ai",
  version: "1.0.0",
  ollama: {
    status: "connected" | "disconnected",
    model: "llama3.2:3b",
    url: "http://localhost:11434"
  }
}
```

**Ollama Integration**:
The AI service requires Ollama to be running either:
1. On the host machine (accessible via `host.docker.internal:11434` from container)
2. As a separate Docker container in the same network
3. As a remote service (configured via `OLLAMA_BASE_URL`)

### 4. MongoDB Database

**Deployment Options**:

**Option A: MongoDB Atlas (Recommended for Production)**
- Managed service with automatic backups
- Connection string format: `mongodb+srv://username:password@cluster.mongodb.net/vidai?retryWrites=true&w=majority`
- Built-in monitoring and alerting
- Automatic scaling and high availability

**Option B: Containerized MongoDB**
- Base image: `mongo:7`
- Exposed port: 27017 (internal to Docker network only)
- Volume mount: `mongodb-data:/data/db`
- Environment variables: `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`

**Database Configuration**:
- Database name: `vidai`
- Connection pooling: Enabled (Mongoose default)
- Write concern: `majority`
- Read preference: `primary`

### 5. Docker Compose Orchestration

**Services Definition**:
```yaml
services:
  backend:
    - Depends on: mongodb (if containerized)
    - Networks: vidai-network
    - Ports: 5000:5000
    - Volumes: ./logs:/app/logs
    - Restart policy: unless-stopped
    
  ai-service:
    - Networks: vidai-network
    - Ports: 8000:8000
    - Volumes: ollama-models:/root/.ollama, ./logs:/app/logs
    - Restart policy: unless-stopped
    
  mongodb (optional):
    - Networks: vidai-network
    - Volumes: mongodb-data:/data/db
    - Restart policy: unless-stopped
```

**Network Configuration**:
- Network name: `vidai-network`
- Driver: bridge
- Internal DNS: Enabled (services can reference each other by name)

**Volume Configuration**:
- `mongodb-data`: Persists database files
- `ollama-models`: Persists downloaded AI models (large files, ~2-4GB)
- `./logs`: Host-mounted directory for log access

## Data Models

### Dockerfile Structure

**Backend Dockerfile** (Multi-stage build):

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
CMD ["node", "server.js"]
```

**AI Service Dockerfile** (Multi-stage build):

```dockerfile
# Stage 1: Dependencies
FROM python:3.11-slim AS dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production
FROM python:3.11-slim
WORKDIR /app
COPY --from=dependencies /root/.local /root/.local
COPY . .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import httpx; httpx.get('http://localhost:8000/health', timeout=5)"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose Configuration

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    container_name: vidai-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=5000
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRE=${JWT_EXPIRE:-7d}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
      - CLOUDINARY_API_KEY=${CLOUDINARY_API_KEY}
      - CLOUDINARY_API_SECRET=${CLOUDINARY_API_SECRET}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - SENDGRID_FROM_EMAIL=${SENDGRID_FROM_EMAIL}
      - CORS_ORIGIN=${CORS_ORIGIN}
      - RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-15}
      - RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-100}
    volumes:
      - ./logs:/app/logs
    networks:
      - vidai-network
    restart: unless-stopped
    depends_on:
      mongodb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5000/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  ai-service:
    build:
      context: ./ai-service
      dockerfile: Dockerfile
    container_name: vidai-ai
    ports:
      - "8000:8000"
    environment:
      - HOST=0.0.0.0
      - PORT=8000
      - DEBUG=${DEBUG:-false}
      - OLLAMA_BASE_URL=${OLLAMA_BASE_URL:-http://host.docker.internal:11434}
      - OLLAMA_MODEL=${OLLAMA_MODEL:-llama3.2:3b}
      - OLLAMA_TIMEOUT=${OLLAMA_TIMEOUT:-60}
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - ollama-models:/root/.ollama
      - ./logs:/app/logs
    networks:
      - vidai-network
    restart: unless-stopped
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "python", "-c", "import httpx; httpx.get('http://localhost:8000/health', timeout=5)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:7
    container_name: vidai-mongodb
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
      - MONGO_INITDB_DATABASE=vidai
    volumes:
      - mongodb-data:/data/db
    networks:
      - vidai-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

networks:
  vidai-network:
    driver: bridge

volumes:
  mongodb-data:
  ollama-models:
```

### Vercel Configuration

**vercel.json**:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "env": {
    "VITE_API_URL": "@vidai-api-url",
    "VITE_AI_SERVICE_URL": "@vidai-ai-url"
  }
}
```

### Environment Files

**.env.example** (Backend):
```bash
# Server Configuration
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vidai?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxxxxxxxxxx
CLOUDINARY_API_SECRET=xxxxxxxxxxxxx

# SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@vidai.com

# Security
CORS_ORIGIN=https://vidai.com,https://www.vidai.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

**.env.example** (AI Service):
```bash
# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=false

# Ollama Configuration
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT=60

# Security
CORS_ORIGINS=https://vidai.com,https://www.vidai.com,https://api.vidai.com
```

**.env.example** (Docker Compose):
```bash
# Environment
NODE_ENV=production
DEBUG=false

# MongoDB (if using containerized)
MONGO_USERNAME=vidai_admin
MONGO_PASSWORD=change-this-secure-password

# Backend Service (see backend .env.example for all variables)
MONGODB_URI=mongodb://vidai_admin:change-this-secure-password@mongodb:27017/vidai?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
# ... (all other backend variables)

# AI Service
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:3b
CORS_ORIGINS=https://vidai.com,https://api.vidai.com
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Before defining properties, let me analyze the acceptance criteria for testability:


### Configuration Validation Properties

Since deployment configuration is primarily about ensuring specific files exist and contain required elements, most testable criteria are examples rather than universal properties. The following examples validate deployment configuration correctness:

**Example 1: Vercel Configuration Completeness**
The vercel.json file should exist and contain: buildCommand, outputDirectory, framework, rewrites for SPA routing, security headers, and environment variable references.
**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

**Example 2: Backend Dockerfile Structure**
The server/Dockerfile should exist and contain: multi-stage build with FROM statements, Node.js 18 base image, EXPOSE 5000, HEALTHCHECK instruction, and npm ci --only=production for dependency installation.
**Validates: Requirements 2.1, 2.3, 2.6, 12.1, 12.3, 12.5**

**Example 3: AI Service Dockerfile Structure**
The ai-service/Dockerfile should exist and contain: multi-stage build with FROM statements, Python 3.11 base image, EXPOSE 8000, HEALTHCHECK instruction, and requirements.txt copied before application code.
**Validates: Requirements 3.1, 3.4, 12.2, 12.4, 12.6**

**Example 4: Docker Compose Service Definitions**
The docker-compose.yml should define three services (backend, ai-service, mongodb) with correct container names, port mappings (5000:5000, 8000:8000), and network configuration.
**Validates: Requirements 4.1, 4.2, 4.5**

**Example 5: Docker Compose Volume Configuration**
The docker-compose.yml should define and mount volumes: mongodb-data to /data/db, ollama-models to /root/.ollama, and ./logs to /app/logs for both backend and ai-service.
**Validates: Requirements 2.7, 3.7, 4.4, 10.1, 10.2**

**Example 6: Service Dependencies and Health Checks**
The docker-compose.yml backend service should have depends_on: mongodb with condition: service_healthy, and all services should have healthcheck configurations with restart: unless-stopped.
**Validates: Requirements 4.3, 4.7**

**Example 7: Backend Environment Variables Documentation**
The server/.env.example should exist and document all required variables: NODE_ENV, PORT, MONGODB_URI, JWT_SECRET, JWT_EXPIRE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, CORS_ORIGIN, RATE_LIMIT_WINDOW, RATE_LIMIT_MAX.
**Validates: Requirements 5.1, 5.6**

**Example 8: AI Service Environment Variables Documentation**
The ai-service/.env.example should exist and document: HOST, PORT, DEBUG, OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_TIMEOUT, CORS_ORIGINS.
**Validates: Requirements 5.2, 5.6**

**Example 9: Frontend Environment Variables Configuration**
The vercel.json env section should reference VITE_API_URL and VITE_AI_SERVICE_URL using Vercel secret syntax (@vidai-api-url, @vidai-ai-url).
**Validates: Requirements 5.3**

**Example 10: MongoDB Atlas Connection String Format**
The server/.env.example MONGODB_URI should demonstrate the mongodb+srv:// connection string format with authentication parameters.
**Validates: Requirements 6.2**

**Example 11: MongoDB Network Isolation**
The docker-compose.yml mongodb service should NOT have a ports section, ensuring it's only accessible within the Docker network.
**Validates: Requirements 6.5**

**Example 12: Containerized MongoDB Persistence**
The docker-compose.yml mongodb service should have a volume mount: mongodb-data:/data/db for data persistence.
**Validates: Requirements 6.3**

**Example 13: Backend Health Check Endpoint**
The server/Dockerfile HEALTHCHECK should use the /api/v1/health endpoint, and the endpoint should return status and database connectivity information.
**Validates: Requirements 2.2, 2.5, 7.1**

**Example 14: AI Service Health Check Endpoint**
The ai-service/Dockerfile HEALTHCHECK should use the /health endpoint, and the endpoint should return status with ollama connectivity and model information.
**Validates: Requirements 3.3, 3.5, 7.2**

**Example 15: Docker Compose Log Configuration**
The docker-compose.yml should configure logging driver or document log rotation strategy to prevent disk exhaustion.
**Validates: Requirements 10.6**

**Example 16: Backup Documentation**
The deployment documentation should include MongoDB restoration procedures for both Atlas and containerized deployments.
**Validates: Requirements 11.4**

## Error Handling

### Build-Time Errors

**Docker Build Failures**:
- Missing dependencies: Ensure package.json and requirements.txt are complete
- Network timeouts: Configure Docker to use appropriate registry mirrors
- Layer caching issues: Use --no-cache flag to force clean build
- Multi-stage build failures: Verify each stage completes successfully

**Vercel Build Failures**:
- Environment variable missing: Verify all VITE_* variables are configured in Vercel dashboard
- Build command errors: Check package.json build script and Vite configuration
- Output directory mismatch: Ensure vercel.json outputDirectory matches Vite build output

### Runtime Errors

**Container Startup Failures**:
- Port conflicts: Ensure ports 5000, 8000, and 27017 are available on host
- Volume permission errors: Check Docker volume permissions and ownership
- Network creation failures: Remove existing networks with same name
- Health check failures: Increase start_period in healthcheck configuration

**Database Connection Errors**:
- MongoDB Atlas: Verify connection string, whitelist IP addresses, check credentials
- Containerized MongoDB: Ensure mongodb container is healthy before backend starts
- Connection timeout: Increase connection timeout in Mongoose configuration
- Authentication failures: Verify MONGO_USERNAME and MONGO_PASSWORD match

**Ollama Integration Errors**:
- Ollama not running: Start Ollama service on host machine
- Model not found: Pull required model using `ollama pull llama3.2:3b`
- Connection refused: Verify OLLAMA_BASE_URL points to correct host (host.docker.internal for Docker)
- Timeout errors: Increase OLLAMA_TIMEOUT for large model responses

**CORS Errors**:
- Frontend cannot reach backend: Verify CORS_ORIGIN includes frontend domain
- AI service rejects requests: Verify CORS_ORIGINS includes frontend and backend domains
- Preflight failures: Ensure OPTIONS requests are handled correctly

### Deployment Errors

**Vercel Deployment Issues**:
- Build timeout: Optimize build process or request timeout increase
- Environment variable not applied: Redeploy after adding new variables
- Domain configuration: Verify DNS settings and SSL certificate provisioning
- Rollback needed: Use Vercel dashboard to revert to previous deployment

**Docker Deployment Issues**:
- Image pull failures: Verify Docker registry authentication
- Volume mount failures: Check host directory permissions
- Network connectivity: Verify Docker network configuration
- Resource exhaustion: Monitor CPU, memory, and disk usage

### Monitoring and Alerting

**Health Check Monitoring**:
- Set up external monitoring (UptimeRobot, Pingdom) for /health endpoints
- Configure alerts for consecutive health check failures
- Monitor response times and set thresholds for degraded performance

**Log Monitoring**:
- Centralize logs using log aggregation service (Papertrail, Loggly)
- Set up alerts for error patterns and exceptions
- Monitor log volume for anomalies

**Resource Monitoring**:
- Track Docker container CPU and memory usage
- Monitor disk space for volumes (especially mongodb-data and ollama-models)
- Set up alerts for resource threshold breaches

## Testing Strategy

### Configuration Validation Tests

**Purpose**: Verify that all deployment configuration files exist and contain required elements.

**Approach**: Write unit tests that parse and validate configuration files against expected schemas.

**Test Files**:
- `tests/deployment/test_vercel_config.js`: Validate vercel.json structure
- `tests/deployment/test_dockerfiles.js`: Validate Dockerfile syntax and instructions
- `tests/deployment/test_docker_compose.js`: Validate docker-compose.yml structure
- `tests/deployment/test_env_examples.js`: Validate .env.example completeness

**Example Test Structure**:
```javascript
// tests/deployment/test_vercel_config.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Vercel Configuration', () => {
  it('should have valid vercel.json with required fields', () => {
    const configPath = path.join(process.cwd(), 'vercel.json');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    expect(config.buildCommand).toBe('npm run build');
    expect(config.outputDirectory).toBe('dist');
    expect(config.framework).toBe('vite');
    expect(config.rewrites).toBeDefined();
    expect(config.headers).toBeDefined();
    expect(config.env).toHaveProperty('VITE_API_URL');
    expect(config.env).toHaveProperty('VITE_AI_SERVICE_URL');
  });
  
  it('should configure SPA routing rewrites', () => {
    const config = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    const spaRewrite = config.rewrites.find(r => r.destination === '/index.html');
    expect(spaRewrite).toBeDefined();
    expect(spaRewrite.source).toBe('/(.*)');
  });
});
```

### Docker Build Tests

**Purpose**: Verify that Docker images build successfully and contain expected components.

**Approach**: Use Docker build commands in test scripts to validate Dockerfiles.

**Test Script**:
```bash
#!/bin/bash
# tests/deployment/test_docker_builds.sh

echo "Testing Backend Dockerfile..."
docker build -t vidai-backend-test ./server
if [ $? -ne 0 ]; then
  echo "Backend Docker build failed"
  exit 1
fi

echo "Testing AI Service Dockerfile..."
docker build -t vidai-ai-test ./ai-service
if [ $? -ne 0 ]; then
  echo "AI Service Docker build failed"
  exit 1
fi

echo "Verifying image sizes..."
backend_size=$(docker images vidai-backend-test --format "{{.Size}}")
ai_size=$(docker images vidai-ai-test --format "{{.Size}}")

echo "Backend image size: $backend_size"
echo "AI Service image size: $ai_size"

# Cleanup
docker rmi vidai-backend-test vidai-ai-test

echo "All Docker builds successful"
```

### Integration Tests

**Purpose**: Verify that all services start correctly and can communicate with each other.

**Approach**: Use docker-compose to start all services and test inter-service communication.

**Test Script**:
```bash
#!/bin/bash
# tests/deployment/test_integration.sh

echo "Starting services with docker-compose..."
docker-compose up -d

echo "Waiting for services to be healthy..."
sleep 30

echo "Testing Backend health endpoint..."
backend_health=$(curl -s http://localhost:5000/api/v1/health)
if [[ $backend_health == *"healthy"* ]]; then
  echo "✓ Backend is healthy"
else
  echo "✗ Backend health check failed"
  docker-compose logs backend
  exit 1
fi

echo "Testing AI Service health endpoint..."
ai_health=$(curl -s http://localhost:8000/health)
if [[ $ai_health == *"healthy"* ]] || [[ $ai_health == *"degraded"* ]]; then
  echo "✓ AI Service is responding"
else
  echo "✗ AI Service health check failed"
  docker-compose logs ai-service
  exit 1
fi

echo "Testing Backend-MongoDB connectivity..."
if [[ $backend_health == *"connected"* ]]; then
  echo "✓ Backend connected to MongoDB"
else
  echo "✗ Backend-MongoDB connection failed"
  exit 1
fi

echo "Cleaning up..."
docker-compose down -v

echo "All integration tests passed"
```

### Environment Variable Validation

**Purpose**: Ensure all required environment variables are documented and validated.

**Approach**: Write tests that check .env.example files for completeness.

**Test File**:
```javascript
// tests/deployment/test_env_examples.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Environment Variable Documentation', () => {
  it('should document all backend environment variables', () => {
    const envExample = fs.readFileSync('server/.env.example', 'utf-8');
    
    const requiredVars = [
      'NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_EXPIRE',
      'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
      'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
      'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL',
      'CORS_ORIGIN', 'RATE_LIMIT_WINDOW', 'RATE_LIMIT_MAX'
    ];
    
    requiredVars.forEach(varName => {
      expect(envExample).toContain(varName);
    });
  });
  
  it('should document all AI service environment variables', () => {
    const envExample = fs.readFileSync('ai-service/.env.example', 'utf-8');
    
    const requiredVars = [
      'HOST', 'PORT', 'DEBUG',
      'OLLAMA_BASE_URL', 'OLLAMA_MODEL', 'OLLAMA_TIMEOUT',
      'CORS_ORIGINS'
    ];
    
    requiredVars.forEach(varName => {
      expect(envExample).toContain(varName);
    });
  });
});
```

### Manual Testing Checklist

**Pre-Deployment Verification**:
1. Build all Docker images locally and verify no errors
2. Start services with docker-compose and verify all health checks pass
3. Test API endpoints from frontend (CORS configuration)
4. Verify environment variables are loaded correctly
5. Check log output for errors or warnings
6. Test database connectivity and data persistence
7. Verify Ollama model availability and AI endpoints

**Post-Deployment Verification**:
1. Verify frontend loads correctly on Vercel domain
2. Test user authentication flow end-to-end
3. Verify API requests from frontend to backend succeed
4. Test AI features (chat, recommendations, budget planning)
5. Check health endpoints return healthy status
6. Verify HTTPS and security headers
7. Test error handling and logging
8. Monitor resource usage and performance

### Test Execution

**Local Development**:
```bash
# Run configuration validation tests
npm test tests/deployment/

# Build and test Docker images
./tests/deployment/test_docker_builds.sh

# Run integration tests
./tests/deployment/test_integration.sh
```

**CI/CD Pipeline**:
- Run configuration validation tests on every commit
- Build Docker images and run integration tests on pull requests
- Deploy to staging environment for manual testing
- Deploy to production only after all tests pass

### Test Coverage Goals

- Configuration validation: 100% of deployment files
- Docker builds: All Dockerfiles must build successfully
- Integration tests: All service-to-service communication paths
- Environment variables: 100% of required variables documented

## Deployment Instructions

### Prerequisites

**Local Machine**:
- Docker and Docker Compose installed
- Node.js 18+ installed
- Git installed
- Ollama installed and running (for AI service)

**Accounts and Services**:
- Vercel account with project created
- MongoDB Atlas cluster (or plan to use containerized MongoDB)
- Stripe account with API keys
- Cloudinary account with credentials
- SendGrid account with API key

### Step 1: Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd vidai

# Create environment files from examples
cp server/.env.example server/.env
cp ai-service/.env.example ai-service/.env

# Edit environment files with actual credentials
nano server/.env
nano ai-service/.env
```

### Step 2: Deploy Frontend to Vercel

**Option A: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Set environment variables
vercel env add VITE_API_URL production
vercel env add VITE_AI_SERVICE_URL production

# Deploy to production
vercel --prod
```

**Option B: Vercel Dashboard**
1. Go to vercel.com and create new project
2. Connect GitHub repository
3. Configure build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables:
   - `VITE_API_URL`: Your backend API URL
   - `VITE_AI_SERVICE_URL`: Your AI service URL
5. Deploy

### Step 3: Prepare Docker Host

**For Production Server**:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### Step 4: Build Docker Images

```bash
# Build backend image
cd server
docker build -t vidai-backend:latest .

# Build AI service image
cd ../ai-service
docker build -t vidai-ai:latest .

# Return to root
cd ..
```

### Step 5: Configure Environment for Docker Compose

```bash
# Create .env file for docker-compose
cat > .env << EOF
NODE_ENV=production
DEBUG=false

# MongoDB (if using containerized)
MONGO_USERNAME=vidai_admin
MONGO_PASSWORD=$(openssl rand -base64 32)

# Backend Service
MONGODB_URI=mongodb://vidai_admin:$(openssl rand -base64 32)@mongodb:27017/vidai?authSource=admin
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRE=7d
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@vidai.com
CORS_ORIGIN=https://vidai.com,https://www.vidai.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# AI Service
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:3b
OLLAMA_TIMEOUT=60
CORS_ORIGINS=https://vidai.com,https://www.vidai.com,https://api.vidai.com
EOF

# Secure the .env file
chmod 600 .env
```

### Step 6: Start Ollama (if using host Ollama)

```bash
# Start Ollama service
ollama serve

# In another terminal, pull required model
ollama pull llama3.2:3b
```

### Step 7: Start Services with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check service status
docker-compose ps

# Verify health checks
curl http://localhost:5000/api/v1/health
curl http://localhost:8000/health
```

### Step 8: Verify Deployment

```bash
# Test backend API
curl http://localhost:5000/api/v1/health

# Test AI service
curl http://localhost:8000/health

# Check MongoDB connection
docker-compose exec backend node -e "require('./src/config/database.js').connectDB().then(() => console.log('Connected')).catch(console.error)"

# View logs
docker-compose logs backend
docker-compose logs ai-service
docker-compose logs mongodb
```

### Step 9: Configure Reverse Proxy (Production)

**Using Nginx**:
```nginx
# /etc/nginx/sites-available/vidai

# Backend API
server {
    listen 80;
    server_name api.vidai.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# AI Service
server {
    listen 80;
    server_name ai.vidai.com;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Enable sites and obtain SSL certificates**:
```bash
# Enable sites
sudo ln -s /etc/nginx/sites-available/vidai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificates
sudo certbot --nginx -d api.vidai.com
sudo certbot --nginx -d ai.vidai.com
```

### Step 10: Set Up Monitoring

```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  echo "=== $(date) ==="
  echo "Backend Health:"
  curl -s http://localhost:5000/api/v1/health | jq .
  echo ""
  echo "AI Service Health:"
  curl -s http://localhost:8000/health | jq .
  echo ""
  echo "Docker Stats:"
  docker stats --no-stream
  echo ""
  sleep 60
done
EOF

chmod +x monitor.sh

# Run monitoring in background
nohup ./monitor.sh > monitoring.log 2>&1 &
```

### Rollback Procedure

**Frontend (Vercel)**:
1. Go to Vercel dashboard
2. Navigate to Deployments
3. Find previous working deployment
4. Click "..." menu and select "Promote to Production"

**Backend Services (Docker)**:
```bash
# Stop current containers
docker-compose down

# Pull previous image version
docker pull vidai-backend:previous-tag
docker pull vidai-ai:previous-tag

# Update docker-compose.yml to use previous tags
# Or rebuild from previous Git commit

# Start services
docker-compose up -d

# Verify rollback
curl http://localhost:5000/api/v1/health
curl http://localhost:8000/health
```

### Backup and Restore

**MongoDB Atlas**:
- Backups are automatic
- Restore via Atlas dashboard

**Containerized MongoDB**:
```bash
# Backup
docker-compose exec mongodb mongodump --out=/data/backup
docker cp vidai-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore
docker cp ./mongodb-backup-20240115 vidai-mongodb:/data/restore
docker-compose exec mongodb mongorestore /data/restore
```

### Maintenance

**Update Dependencies**:
```bash
# Update frontend
npm update
npm audit fix

# Update backend
cd server
npm update
npm audit fix

# Update AI service
cd ../ai-service
pip list --outdated
pip install -U <package-name>
```

**Update Docker Images**:
```bash
# Rebuild images
docker-compose build --no-cache

# Restart services
docker-compose up -d

# Remove old images
docker image prune -a
```

**Log Rotation**:
```bash
# Configure logrotate
sudo cat > /etc/logrotate.d/vidai << EOF
/path/to/vidai/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
    postrotate
        docker-compose restart backend ai-service
    endscript
}
EOF
```

## Security Considerations

### Secrets Management

**Never commit secrets to Git**:
- Add `.env` files to `.gitignore`
- Use `.env.example` for documentation only
- Use Vercel environment variables for frontend secrets
- Use Docker secrets or environment files for backend secrets

**Rotate secrets regularly**:
- JWT secrets: Every 90 days
- API keys: When team members leave or keys are compromised
- Database passwords: Every 180 days

### Network Security

**Firewall Configuration**:
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

**Docker Network Isolation**:
- MongoDB is not exposed to host (no ports mapping)
- Only backend and AI service expose ports
- Services communicate via internal Docker network

### SSL/TLS Configuration

**Vercel**: Automatic SSL certificates via Let's Encrypt

**Backend Services**: Use Nginx reverse proxy with Certbot for SSL

### Rate Limiting

Backend already includes express-rate-limit middleware. Configure appropriate limits:
- Public endpoints: 100 requests per 15 minutes
- Authenticated endpoints: 1000 requests per 15 minutes
- AI endpoints: 20 requests per 15 minutes (due to computational cost)

### CORS Configuration

Ensure CORS_ORIGIN and CORS_ORIGINS only include production domains:
```bash
CORS_ORIGIN=https://vidai.com,https://www.vidai.com
CORS_ORIGINS=https://vidai.com,https://www.vidai.com,https://api.vidai.com
```

Never use `*` in production.

## Performance Optimization

### Frontend Optimization

- Vite automatically handles code splitting and tree shaking
- Use React.lazy() for route-based code splitting
- Optimize images with Cloudinary transformations
- Enable Vercel Edge Network for global CDN

### Backend Optimization

- Enable compression middleware (already included)
- Use MongoDB indexes for frequently queried fields
- Implement caching for expensive operations (Redis recommended)
- Use connection pooling (Mongoose default)

### AI Service Optimization

- Use smaller Ollama models for faster responses (llama3.2:3b vs larger models)
- Implement request queuing to prevent overload
- Cache common AI responses
- Consider GPU acceleration for Ollama if available

### Docker Optimization

- Use multi-stage builds (already implemented)
- Minimize layer count in Dockerfiles
- Use .dockerignore to exclude unnecessary files
- Set resource limits in docker-compose.yml:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Conclusion

This deployment design provides a production-ready architecture for VidAI using modern DevOps practices. The combination of Vercel for frontend hosting and Docker for backend services offers a balance of simplicity, scalability, and maintainability. The configuration supports both MongoDB Atlas and containerized MongoDB, allowing flexibility based on operational requirements and budget constraints.

Key benefits of this architecture:
- **Separation of concerns**: Frontend, backend, and AI service are independently deployable
- **Scalability**: Each component can scale independently
- **Security**: Network isolation, secrets management, and HTTPS by default
- **Maintainability**: Clear configuration, comprehensive documentation, and automated health checks
- **Cost-effective**: Vercel free tier for frontend, self-hosted backend services

The deployment can be executed by following the step-by-step instructions, and the testing strategy ensures configuration correctness before production deployment.
