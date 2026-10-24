import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { RUNTIME_DIR, SNAPSHOT_DIR } from './config.js';

mkdirSync(SNAPSHOT_DIR, { recursive: true });

/** A JSON file that is read once and written back atomically on every change. */
function jsonFile(name, fallback) {
  const file = path.join(RUNTIME_DIR, name);
  let value = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback();
  const save = () => {
    writeFileSync(`${file}.tmp`, JSON.stringify(value));
    renameSync(`${file}.tmp`, file);
  };
  return {
    get: () => value,
    set(next) {
      value = next;
      save();
    },
    exists: () => existsSync(file),
  };
}

export const eventsFile = jsonFile('events.json', () => []);
export const subscriptionsFile = jsonFile('subscriptions.json', () => []);
export const vapidFile = jsonFile('vapid.json', () => null);

export function addEvent(event) {
  const events = eventsFile.get();
  events.push(event);
  events.sort((a, b) => a.ts - b.ts);
  eventsFile.set(events);
  return event;
}

export function saveSnapshot(id, base64Jpeg) {
  const name = `${id}.jpg`;
  writeFileSync(path.join(SNAPSHOT_DIR, name), Buffer.from(base64Jpeg, 'base64'));
  return `/snapshots/${name}`;
}
