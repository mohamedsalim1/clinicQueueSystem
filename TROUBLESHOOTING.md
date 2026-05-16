# Clinic Queue Management System - Troubleshooting & Diagnostics Guide

This document provides a comprehensive debugging guide for production network environments (LAN) and system connectivity. If devices on your network cannot connect to the host or if the system behaves unexpectedly, follow these steps.

## 1. How to Find the Host's Local IP
To allow other devices to connect to the clinic system, you must know the **Host Machine's Local Network IP** (the machine running the backend/Tauri app).

**On Windows (Tauri Host or Web Host):**
1. Open Command Prompt (`cmd`).
2. Type `ipconfig` and press Enter.
3. Look for **IPv4 Address** under your active network adapter (e.g., Wireless LAN or Ethernet). It usually starts with `192.168.x.x` or `10.0.x.x`.

**On Linux:**
1. Open Terminal.
2. Type `ip a` or `hostname -I`.
3. Find the address associated with your local network interface (e.g., `eth0` or `wlan0`).

---

## 2. Testing LAN Communication (Ping)
Once you have the Host IP, verify that other devices can physically "see" the host on the network.

**From a Client Device:**
1. Open Command Prompt / Terminal.
2. Type `ping [HOST_IP]` (e.g., `ping 192.168.1.120`).
3. If you receive "Reply from...", the devices can communicate.
4. If you receive "Request timed out" or "Destination host unreachable", **your network router is isolating devices** or **the Host's Windows Firewall is blocking ICMP (Ping) packets**.

---

## 3. How to Diagnose Firewall Issues & Port Accessibility
By default, the backend runs on port `3000`. Windows Firewall often blocks incoming connections to non-standard ports.

**Testing Port Accessibility:**
From a client device, open a web browser and navigate to:
`http://[HOST_IP]:3000/health`
*(Example: `http://192.168.1.120:3000/health`)*

- If you see `{"status":"OK"}`, the port is open and accessible.
- If it times out, the port is blocked.

**How to Fix Windows Firewall:**
1. Open **Windows Defender Firewall with Advanced Security**.
2. Click **Inbound Rules** > **New Rule...**
3. Select **Port** > Next.
4. Select **TCP** and specify **Specific local ports**: `3000, 5173`.
5. Select **Allow the connection** > Next.
6. Check Domain, Private, and Public > Next.
7. Name it "Clinic System Ports" and click **Finish**.

---

## 4. How to Test Backend & Database Availability
To verify that the Express backend is running and can talk to PostgreSQL:

1. Open a browser on the Host or Client.
2. Go to: `http://[HOST_IP]:3000/api/queue/display/all`
3. If you receive a JSON array of clinics, the Backend and Database are working perfectly.
4. **PostgreSQL Failures:** If you receive a `500 Internal Server Error` or the server crashes immediately on startup, check your `.env` database URL and ensure the PostgreSQL service is running (`services.msc` -> PostgreSQL).

---

## 5. How to Identify WebSocket (Socket.io) Failures
If the UI loads but real-time updates (like new tickets or announcements) do not work:

**Diagnosis:**
1. Open the Client's browser (e.g., Chrome).
2. Press `F12` to open **Developer Tools**.
3. Go to the **Console** tab.
4. Look for red errors like `net::ERR_CONNECTION_TIMED_OUT` or `Socket connection error`.
5. Go to the **Network** tab, click the **WS** (WebSocket) filter. Refresh the page.
6. You should see a connection to `?EIO=4&transport=websocket`. If it remains in "Pending" or shows red, the WebSocket connection is failing.

**Causes:**
- The socket URL is pointing to `localhost` instead of the `HOST_IP`. (This was fixed by the dynamic URL implementation, but ensure no old `.env` files are overriding it).
- Antivirus software is blocking WebSocket protocols.

---

## 6. Device Connection Failures (Mixed Frontend/Backend Ports)
**Symptom:** You access `http://192.168.1.120:5173` (Vite dev server) on a tablet, the UI loads, but says "API Error" or "Disconnected".

**Explanation:** The Vite dev server (5173) loaded the UI, but the UI attempted to reach the API. If `VITE_API_URL` was hardcoded to `localhost` in the build, the tablet attempts to find the API on *its own* localhost, which fails.

**The Fix Implemented:**
The system now dynamically determines the API URL using `window.location.hostname`.
In **Web Host Mode** production, the backend (Express) now serves the built frontend on port `3000`. 
Therefore, **always access the app in production via `http://[HOST_IP]:3000`**, which serves both the UI and the API seamlessly.

---

## 7. Audio Announcement System Debugging
**Symptom:** The display screen doesn't play audio, or audio overlaps.

**Debugging:**
1. **Autoplay Policies:** Browsers block audio unless the user interacts with the page first. On the Display Screen, **click anywhere on the page once** after it loads to grant audio permissions.
2. **Missing Voices:** Open DevTools Console and type `speechSynthesis.getVoices()`. If it returns an empty array, the Windows/OS TTS engine is not loaded or missing Arabic language packs. Install the Arabic language pack in Windows Settings -> Time & Language -> Language.
3. **Queue Overlap:** The system uses an internal queue (`announcementQueue`). If you hear the "ding" but no voice, the previous voice instance might have crashed. Refreshing the page resets the `SpeechSynthesis` engine.
