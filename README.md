# 🏸 ShuttleAI — Pro Badminton AI Chatbot

> Powered by **Groq® Ultra-Fast LPU Inference** (`llama-3.3-70b-versatile` & `llama-3.1-8b-instant`).

ShuttleAI is a modern, responsive web application designed for badminton players, coaches, referees, and enthusiasts. It delivers instant, master-level guidance on stroke biomechanics, BWF tournament laws, racket stringing physics, and singles/doubles match strategies.

---

## 🚀 Quick Start

### Option 1: Run with Python (Recommended)
ShuttleAI comes with a built-in Python 3 server (zero pip dependencies required):

```bash
python3 server.py
```
Open your browser and navigate to: **[http://localhost:8000](http://localhost:8000)**

### Option 2: Run with Any Static Server or Direct Browser
You can open `public/index.html` directly in your browser or serve it using any HTTP server:
```bash
python3 -m http.server 8000 --directory public
```

---

## 🔑 Groq API Key Configuration

ShuttleAI supports two easy ways to use your Groq Cloud API key:

### Method A: Directly in the Web UI (Easiest)
1. Open the website at `http://localhost:8000`.
2. Click the **"Groq API Key"** button in the top navigation bar.
3. Paste your key (`gsk_...`) and click **"Test Connection"** then **"Save & Apply"**.
4. The key is securely saved in your browser's `localStorage`.

### Method B: In `.env` File
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and add your Groq API key:
   ```ini
   GROQ_API_KEY=gsk_your_actual_key_here
   PORT=8000
   ```
3. Restart `python3 server.py`.

*Don't have a Groq key yet? Get a free key in seconds at [console.groq.com/keys](https://console.groq.com/keys).*

---

## 🌟 Key Features

- **4 Specialized Badminton Personas**:
  - 🏸 **Head Coach Viktor**: Jump smash biomechanics, kinetic chain, 6-corner shadow footwork, endurance routines.
  - ⚖️ **BWF Umpire Chen**: Official BWF Laws (Law 9 service height, Law 13 faults, line calls, lets, scoring).
  - ⚙️ **The Gear Guru**: 3U vs 4U rackets, head-heavy vs head-light balance, string tension (lbs), Yonex BG80/Exbolt 65.
  - 🎯 **Tactics Master Lin**: Singles corner pinning, doubles front/back attack rotation vs side-by-side defense.
- **Interactive BWF Badminton Court Visualizer**:
  - Interactive SVG diagram of an official BWF court (13.40m × 6.10m / 5.18m).
  - Visual breakdown of singles vs doubles tramlines, short service line (1.98m), and doubles rear service line.
  - Click any zone to instantly ask ShuttleAI about regulations or tactical play for that area.
- **Lightning-Fast Streaming**: Real-time token streaming via Groq's high-speed LPU infrastructure.
- **Synthesized Racket Hit Sound FX**: Realistic shuttle hit sound built with Web Audio API (toggleable in top bar).
- **Modern Midnight Court Aesthetic**: Dark mode emerald styling, glassmorphism, responsive mobile-friendly UI.
