# How to Run VidAI Locally

Run these **three** processes (each in its own terminal). Order does not matter for backend and AI service; start the frontend last so you can open the app.

---

## 1. Backend (Node + MongoDB)

```bash
cd server
node server.js
```

- **Port:** 5000  
- **Requires:** `server/.env` with `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`  
- You should see: `VidAI Server running in development mode on port 5000`

---

## 2. AI service (Python + Ollama)

```bash
cd ai-service
.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```
                  
- **Port:** 8001  
- **Requires:** Ollama running locally (e.g. `ollama serve` and model `llama3.2:3b`)  
- You should see: `Uvicorn running on http://0.0.0.0:8001`

---

## 3. Frontend (React + Vite)

```bash
npm run dev
```

- **Port:** 3000  
- You should see: `Local: http://localhost:3000/`

---

## Open the app

In your browser go to: **http://localhost:3000**

---

## Quick frontend checks

| Step | What to do |
|------|------------|
| **Sign up** | Click Sign up, enter name, email, password (8+ chars, one upper, one lower, one number). Submit. |
| **Sign in** | If needed, open Login, enter the same email/password. You should land on the user dashboard. |
| **User dashboard** | Visit **Dashboard**, **Budget**, **Chat** (AI), **Vendors**. |
| **Sign out** | Use the logout control in the header, then confirm you’re back on the home page. |
| **Sign in again** | Log in again and confirm protected routes still work. |

Backend and AI service must be running for API and AI features to work. To confirm everything: run `npm run validate` from the project root (with backend and AI service already started).

---

## 4. Mobile App (React Native + Expo)

```bash
cd mobile
npm start
```

- **Platform:** React Native with Expo
- **Requires:** Backend and AI service running (ports 5000 and 8000)
- **To run on Android:** `npm run android` (requires Android emulator or device)
- **To run on iOS:** `npm run ios` (requires macOS and iOS simulator)
- **To run on web:** `npm run web` (for testing)

**From project root:**
- `npm run mobile:start` - Start Expo dev server
- `npm run mobile:android` - Run on Android
- `npm run mobile:ios` - Run on iOS
- `npm run mobile:web` - Run on web

**Note:** The mobile app uses the same backend API. Make sure the backend is running on `http://localhost:5000` or update the API URL in `mobile/app.json` (`extra.apiUrl`).
