// Regenerates the simulated crossing history. `npm run seed` wipes live events too.
import { eventsFile } from '../src/store.js';
import { generateHistory } from '../src/seed.js';

const events = generateHistory();
eventsFile.set(events);
console.log(`Seeded ${events.length} simulated events over 30 days.`);
