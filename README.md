# OffGuard

**Wildlife on the road. Know before you're there.**

OffGuard warns drivers on the Long Island Expressway (I-495 East) about deer and other wildlife *before* they reach them. Roadside cameras spot animals with on-device AI, Google Gemini confirms the species, the roadside crossing sign flashes and drops its gate, and drivers get a phone alert, even while they're navigating in Google Maps.

Built solo at **SBU Hacks** for the theme **Steam & Steel**.

## How it works

```
Camera (TensorFlow.js COCO-SSD) ──▶ OffGuard server ──▶ Gemini: "2 × white-tailed deer"
                                       │
        ┌──────────────┬───────────────┼──────────────────┐
        ▼              ▼               ▼                  ▼
  Command Center   Roadside unit   Driver phones      Driver Mode /
  (Socket.IO)      (ESP32 / MQTT)  (Web Push)         Car Display
```

1. **Detector**: the webcam runs COCO-SSD in the browser. An animal at ≥60% confidence for 1 second triggers a detection (10 s cooldown). COCO-SSD has no deer class, so large mammals act as the trigger.
2. **Gemini** looks at the snapshot and names the real species and count. If Gemini is unavailable, the COCO label is used.
3. The server fans the detection out:
   - **Command Center**: a live corridor map, hotspots, event feed, gauges and an animated crossing signal
   - **Roadside unit**: an ESP32 (simulated in Wokwi) flashes its lamps, rings its bell, shows the warning on its LCD and lowers its gate
   - **Commute alerts**: web push to every driver subscribed to that stretch of the LIE
4. **Driver Mode** and **Car Display** call out hazards ahead with distance and voice.
5. The **Wildlife Report** is a weekly briefing for NYSDOT and NYSDEC, written by Gemini from the sensor data.

## Run it

Requires Node.js 20+.

```bash
npm install
cp .env.example .env      # then paste your Gemini key into .env
npm run dev
```

Open http://localhost:5173.

| Page | URL |
| --- | --- |
| Homepage | `/` |
| Command Center | `/command` |
| Detector (webcam) | `/detector` |
| Driver app (commute alerts + Driver Mode) | `/drive` |
| Car Display | `/car` |
| Wildlife Report | `/report` |

### On your phone (push notifications)

Push needs HTTPS. Start a free Cloudflare quick tunnel to the dev server:

```bash
cloudflared tunnel --url http://localhost:5173
```

Open the `https://….trycloudflare.com` link on your phone → **Driver App** → **Commute alerts** → pick your exits → **Alert me**. On iPhone, add OffGuard to the home screen first (Share → Add to Home Screen).

### Wokwi roadside unit

1. Create a new **ESP32** project on [wokwi.com](https://wokwi.com).
2. Replace `sketch.ino` and `diagram.json` with the files in [`wokwi/`](wokwi/), and add a `libraries.txt` tab with [`wokwi/libraries.txt`](wokwi/libraries.txt).
3. Press ▶. The LCD shows `ALL CLEAR` once it's linked. Detections now flash the unit, and clicking the PIR sensor reports motion back to OffGuard.

`MQTT_PREFIX` in `.env` and in `sketch.ino` must match.

## Tech

React 19, Vite, Tailwind CSS 4, Leaflet + OpenStreetMap, Recharts, TensorFlow.js COCO-SSD, Node.js/Express, Socket.IO, Google Gemini (`@google/genai`), Web Push (VAPID), MQTT (HiveMQ public broker), ESP32 on Wokwi.

## Data

Sensor locations sit at real I-495 exits (49 to 70). The road shape comes from OpenStreetMap via OSRM (`npm run fetch-route`). **Crossing history before today is simulated** (shaped like real deer activity: dawn and dusk peaks, heavier toward the wooded eastern exits). Live detections are real. `npm run seed` regenerates the history.

## License

MIT
