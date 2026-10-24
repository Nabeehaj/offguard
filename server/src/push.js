import webpush from 'web-push';
import { config } from './config.js';
import { subscriptionsFile, vapidFile } from './store.js';

// VAPID keys identify this server to browser push services. Generated once
// and kept in the runtime folder so existing subscriptions stay valid.
if (!vapidFile.get()) vapidFile.set(webpush.generateVAPIDKeys());
const vapid = vapidFile.get();
webpush.setVapidDetails(config.vapidSubject, vapid.publicKey, vapid.privateKey);

export const vapidPublicKey = vapid.publicKey;

/** Save or update a driver's commute subscription (keyed by push endpoint). */
export function subscribe({ subscription, fromExit, toExit, label }) {
  const lo = Math.min(fromExit, toExit);
  const hi = Math.max(fromExit, toExit);
  const rest = subscriptionsFile.get().filter((s) => s.subscription.endpoint !== subscription.endpoint);
  const entry = { subscription, fromExit: lo, toExit: hi, label: label || null, createdAt: Date.now() };
  subscriptionsFile.set([...rest, entry]);
  return entry;
}

export function unsubscribe(endpoint) {
  subscriptionsFile.set(subscriptionsFile.get().filter((s) => s.subscription.endpoint !== endpoint));
}

export function findSubscription(endpoint) {
  return subscriptionsFile.get().find((s) => s.subscription.endpoint === endpoint) ?? null;
}

async function send(entry, payload) {
  try {
    await webpush.sendNotification(entry.subscription, JSON.stringify(payload), { TTL: 600, urgency: 'high' });
    return true;
  } catch (err) {
    // 404/410: the browser dropped this subscription; forget it.
    if (err.statusCode === 404 || err.statusCode === 410) unsubscribe(entry.subscription.endpoint);
    else console.warn('[push] send failed:', err.statusCode || err.message);
    return false;
  }
}

/** Notify every driver whose commute covers this sensor's exit. */
export async function notifyCommuters(event, sensor) {
  const targets = subscriptionsFile.get().filter((s) => sensor.exit >= s.fromExit && sensor.exit <= s.toExit);
  const payload = {
    title: `⚠ ${event.species} near Exit ${sensor.exit}`,
    body: event.driverAlert,
    tag: `offguard-${sensor.id}`,
    url: '/drive',
    eventId: event.id,
  };
  const results = await Promise.all(targets.map((t) => send(t, payload)));
  return results.filter(Boolean).length;
}

export async function sendTest(endpoint) {
  const entry = findSubscription(endpoint);
  if (!entry) return false;
  return send(entry, {
    title: 'OffGuard alerts are on',
    body: `You'll be alerted about wildlife between Exits ${entry.fromExit} and ${entry.toExit}.`,
    tag: 'offguard-test',
    url: '/drive',
  });
}
