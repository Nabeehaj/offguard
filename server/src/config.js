import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '../..');
export const DATA_DIR = path.resolve(here, '../data');
export const RUNTIME_DIR = path.join(DATA_DIR, 'runtime');
export const SNAPSHOT_DIR = path.join(RUNTIME_DIR, 'snapshots');
export const CLIENT_DIST = path.join(ROOT, 'client/dist');

dotenv.config({ path: path.join(ROOT, '.env') });

export const config = {
  port: Number(process.env.PORT) || 3001,
  geminiKey: process.env.GEMINI_API_KEY?.trim() || '',
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
  mqttUrl: process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
  mqttPrefix: process.env.MQTT_PREFIX || 'offguard/og-7k3q9x',
  vapidSubject: process.env.VAPID_SUBJECT || 'mailto:offguard@example.com',
  // How long a detection keeps a sensor "active" (roadside sign on, drivers alerted).
  alertWindowMs: 15 * 60 * 1000,
};
