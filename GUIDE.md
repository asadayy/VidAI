# 🚀 VidAI - Deployment and Local Setup Guide

Welcome to the **VidAI** setup guide. This document provides step-by-step instructions to get the entire ecosystem (Backend, AI Service, Frontend, and Mobile App) running locally or via Vercel.

---

## 🛠 Prerequisites

Before starting, ensure you have the following installed:
1.  **Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop)
2.  **Node.js (v18+)**: [Download here](https://nodejs.org/)
3.  **ngrok**: [Download here](https://ngrok.com/download) (Required for Vercel/Mobile testing)
4.  **Android Studio**: (For running the mobile emulator)
5.  **Expo Go App**: (On your physical phone for mobile testing)

---

## 📦 1. Fast Local Setup (Docker Compose)

The easiest way to run the entire stack locally is using Docker Compose. This starts the Database, Ollama (AI Engine), AI Microservice, Backend, and Frontend in one command.

### Steps:
1.  **Prepare Environment Variables**:
    - Go to the `server` folder.
    - Copy `.env.example` to `.env`.
    - Fill in your MongoDB URI and other keys (Stripe, Cloudinary, etc.).
2.  **Launch the System**:
    - Open a terminal in the root `VidAI` folder.
    - Run the following command:
      ```bash
      docker-compose up --build
      ```
3.  **Order of Execution** (Handled automatically by Docker):
    - `ollama` starts first to provide the AI model.
    - `ai-service` starts after Ollama is ready.
    - `backend` starts after the AI service is ready.
    - `frontend` starts last and will be available at **[http://localhost:3000](http://localhost:3000)**.

---

## 🌐 2. Vercel Frontend + Local Backend (Hybrid Setup)

If you have the frontend deployed on **Vercel** but want to use your **local backend** (for development or testing), you must expose your local server using **ngrok**.

### Step 1: Start your Local Backend & AI
Ensure your local backend is running (either via Docker or `node server/server.js`).

### Step 2: Configure ngrok
1.  Open a new terminal.
2.  Expose your local backend (Port 5000):
    ```bash
    ngrok http 5000
    ```
3.  Copy the **Forwarding URL** (e.g., `https://a1b2-c3d4.ngrok-free.app`).

### Step 3: Update Vercel Environment Variables
1.  Go to your project on the [Vercel Dashboard](https://vercel.com/dashboard).
2.  Navigate to **Settings > Environment Variables**.
3.  Find/Add the key: `VITE_API_URL`.
4.  Set the value to: `https://your-ngrok-url/api/v1` (replace with your copied URL).
5.  **Important**: Save and **Redeploy** the frontend for changes to take effect.

> **💡 Note on Ngrok URL changes**: If you restart ngrok and it generates a *new* link, you **must** update the `VITE_API_URL` in Vercel and redeploy, or the frontend will lose connection to the backend.

---

## 🔐 3. User Login & Roles Guide

VidAI has three distinct user roles. Here is how to access each:

### 👤 Simple User
- **Access URL**: [http://localhost:3000](http://localhost:3000)
- **How to Login**: 
  1. Click **Sign Up** on the homepage.
  2. Create a standard account.
  3. You can now access the **User Dashboard** at `/user`, use the **AI Wedding Planner**, and manage your **Budget/Task List**.

### 💼 Vendor (Service Providers)
- **Access URL**: [http://localhost:3000/vendor-landing](http://localhost:3000/vendor-landing)
- **How to Login**:
  1. Go to the **Vendor Landing** page.
  2. Click **Join as Vendor** or **Login**.
  3. Complete your **Business Profile** (Prices, Services, Portfolio) at `/vendor`.
  4. Once approved by the admin, your services will be visible to all users.

### 🛡 Admin (Platform Manager)
- **Access URL**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Credentials**:
  - **Email**: `admin@vidai.pk`
  - **Password**: *[Check with your system administrator]*
- **Capabilities**: Access the dashboard at `/admin/dashboard`. Manage all users, approve/ban vendors, monitor platform activity, and view analytics.

---

## 📱 4. Mobile App Setup

The mobile app is built with **React Native (Expo)** and requires the backend to be accessible publicly or via a local network.

### Step 1: Configure the API URL
1.  Open `mobile/app.json`.
2.  Locate the `"extra"` section and update `"apiUrl"`:
    ```json
    "extra": {
      "apiUrl": "https://your-ngrok-url.ngrok-free.dev/api/v1"
    }
    ```
    *Note: If you restart ngrok, you must update this URL and restart the Expo packager.*

### Step 2: Install Dependencies
```bash
cd mobile
npm install
```

### Step 3: Run on Android (Emulator)
1. Open **Android Studio**.
2. Go to **Device Manager** and start your Virtual Device (Emulator).
3. In your terminal, run:
   ```bash
   npm run android
   ```

### Step 4: Run on physical device (Expo Go)
1. Install **Expo Go** from the Play Store/App Store.
2. In your terminal, run:
   ```bash
   cd mobile
   npm start
   ```
3. Scan the **QR Code** using the Expo Go app. 
   *(Ensure your phone and computer are on the same Wi-Fi, or use the ngrok URL configured in Step 1).*

---

## 💡 Pro Tip: Hot Reloading
With the latest `docker-compose.yml` updates, you **don't** need to restart or rebuild Docker whenever you change your code in the `server` or `ai-service` folders. 
- **Automatic Sync**: Your changes in VS Code are instantly reflected inside the running containers.
- **When to use `--build`?**: You only need to run `docker-compose up --build` if:
    1. You add a new library (e.g., `npm install` another package).
    2. You change the `Dockerfile` or `docker-compose.yml` themselves.
    3. You change the `frontend` code (as it's currently built for production in Docker).

---

## 🆘 Troubleshooting
- **CORS Errors**: If you see a CORS error in the console, ensure your `CLIENT_URL` in `server/.env` exactly matches the URL you see in your browser (e.g., `http://localhost:3000` or your Vercel URL).
- **AI Not Responding**: Ensure Docker is running. The `vidai-ollama` container must be active. The first time you use it, it will take a few minutes to load the model into memory.
- **Ngrok Warning**: If you see an ngrok browser warning, the code already includes a header to skip it, but if you're using a browser, you may need to click "Visit Site" once manually.
