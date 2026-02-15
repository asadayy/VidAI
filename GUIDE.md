# 🚀 How to Run VidAI (Easy Guide)

Welcome to VidAI! This guide is designed for anyone to get the app running in just a few steps, even if you aren't a programmer.

---

### Step 1: Install Docker 🐳
Docker is the "engine" that runs VidAI. 
1. Download **Docker Desktop** for Windows/Mac from: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
2. Install it like any other app.
3. **Important:** Open Docker Desktop and make sure it is running. You should see a green icon in the bottom corner of the window.

---

### Step 2: Prepare the Settings 🔑
Before starting, the app needs its "keys" to work.
1. Inside the folder you received, go into the folder named `server`.
2. Look for a file named `.env.example`.
3. Make a copy of that file and rename the copy to just `.env`.
4. (Optional) If your friend has their own keys (like for MongoDB or Stripe), they can paste them inside that file. If you already set this up for them, they can skip this!

---

### Step 3: Launch VidAI 🚀
1. Open a "Terminal" or "Command Prompt" inside the main `VidAI` folder.
2. Type exactly this command and press Enter:
   ```bash
   docker-compose up --build
   ```
3. **Sit back and relax!** ☕ 
   * The first time you run this, it will download everything it needs (this includes the AI model, which is about 2GB). It might take 5-10 minutes depending on your internet.
   * You will see a lot of text scrolling by—that's normal!

---

### Step 4: Open the App 🌐
Once the text slows down and starts looking repetitive, the app is ready!
1. Open your web browser (Chrome, Edge, etc.).
2. Go to this address: **[http://localhost:3000](http://localhost:3000)**

---

### 🛑 How to Stop
To turn everything off, just go back to that terminal window and press **Ctrl + C** on your keyboard.

### 💡 Troubleshooting
* **Is Docker running?** If the command in Step 3 fails, check if you opened Docker Desktop first.
* **Is it stuck?** The first time, it has to download a large AI file. If it looks "stuck" at the beginning, it's likely just downloading—give it a few more minutes!
