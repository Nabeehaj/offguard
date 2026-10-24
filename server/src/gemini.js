import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

const ai = config.geminiKey ? new GoogleGenAI({ apiKey: config.geminiKey }) : null;
export const geminiEnabled = !!ai;

// COCO-SSD has no deer class, so its label is only a rough trigger. These
// fallbacks are used when Gemini is off or fails.
const COCO_FALLBACK = {
  horse: { species: 'Large animal (possible deer)', key: 'deer' },
  cow: { species: 'Large animal (possible deer)', key: 'deer' },
  sheep: { species: 'Large animal (possible deer)', key: 'deer' },
  dog: { species: 'Canine (dog / coyote / fox)', key: 'fox' },
  cat: { species: 'Small mammal', key: 'raccoon' },
  bird: { species: 'Bird', key: 'turkey' },
  bear: { species: 'Bear', key: 'bear' },
  'teddy bear': { species: 'Animal (toy model)', key: 'deer' },
};

const SPECIES_KEYS = ['deer', 'fox', 'raccoon', 'turkey', 'opossum', 'coyote', 'bear', 'other'];

function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  return JSON.parse(cleaned);
}

async function generate(parts) {
  const res = await ai.models.generateContent({
    model: config.geminiModel,
    contents: [{ role: 'user', parts }],
    config: { responseMimeType: 'application/json', temperature: 0.2 },
  });
  return parseJson(res.text);
}

export function fallbackIdentification(cocoLabel) {
  const f = COCO_FALLBACK[cocoLabel] ?? { species: 'Unknown animal', key: 'other' };
  return { isAnimal: true, species: f.species, speciesKey: f.key, count: 1, behavior: 'near the roadway', ai: false };
}

/** Ask Gemini what animal is in a roadside camera frame. */
export async function identifyAnimal(imageBase64, cocoLabel) {
  if (!ai) return fallbackIdentification(cocoLabel);
  const prompt = `You are the species identifier for OffGuard, a roadside wildlife camera on the
Long Island Expressway (I-495), New York. An on-device model flagged this frame as "${cocoLabel}",
but it has no deer class and is often wrong.

Identify the animal. Common here: white-tailed deer, red fox, raccoon, wild turkey, opossum, eastern coyote.
This is a hackathon demo: if the frame shows a photo, screen, toy or figurine of an animal, identify the
animal it depicts as if it were real. If there is no animal at all, set isAnimal to false.

Reply with JSON only:
{"isAnimal": boolean,
 "species": "common name, e.g. White-tailed deer",
 "speciesKey": one of ${JSON.stringify(SPECIES_KEYS)},
 "count": integer number of animals,
 "behavior": "short phrase, e.g. crossing toward the road",
 "confidence": number 0-1}`;
  try {
    const out = await generate([{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }, { text: prompt }]);
    return {
      isAnimal: out.isAnimal !== false,
      species: String(out.species || 'Unknown animal'),
      speciesKey: SPECIES_KEYS.includes(out.speciesKey) ? out.speciesKey : 'other',
      count: Math.max(1, Math.round(Number(out.count) || 1)),
      behavior: String(out.behavior || 'near the roadway'),
      aiConfidence: Number(out.confidence) || null,
      ai: true,
    };
  } catch (err) {
    console.warn('[gemini] identify failed, using COCO label:', err.message);
    return { ...fallbackIdentification(cocoLabel), aiError: err.message };
  }
}

function templateReport(stats) {
  const top = stats.bySensor.slice(0, 3);
  const peak = [...stats.byHour].sort((a, b) => b.count - a.count).slice(0, 2).map((h) => h.hour);
  return {
    headline: `Exit ${top[0].exit} (${top[0].name}) is the corridor's top crossing hotspot`,
    summary: `OffGuard sensors logged ${stats.week} crossings this week and ${stats.month} in the last 30 days. Activity peaks around ${peak.map(fmtHour).join(' and ')}, matching dawn and dusk deer movement.`,
    hotspots: top.map((s) => ({
      exit: s.exit,
      name: s.name,
      crossings: s.count,
      recommendation: s === top[0] ? 'Install a permanent flashing warning sign and lower the advisory speed at dusk.' : 'Add a seasonal deer-crossing advisory during October to December.',
    })),
    recommendations: [
      'Schedule highway patrol visibility at peak dusk hours on the top two exits.',
      'Clear brush along the shoulder near hotspot exits to improve driver sightlines.',
      'Push OffGuard commute alerts to drivers subscribed to Exits 64 to 70.',
    ],
    ai: false,
  };
}

const fmtHour = (h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;

/** Weekly briefing for DOT / wildlife officials, written by Gemini from the stats. */
export async function writeReport(stats) {
  if (!ai) return templateReport(stats);
  const prompt = `You write the weekly wildlife-crossing briefing for NYSDOT and NYSDEC officials, from
OffGuard roadside sensors on I-495 East (Long Island Expressway, Suffolk County).
Data (last 30 days unless noted), JSON:
${JSON.stringify({
  crossingsThisWeek: stats.week,
  crossingsLast30Days: stats.month,
  animalsLast30Days: stats.animalsMonth,
  bySensor: stats.bySensor,
  bySpecies: stats.bySpecies,
  byHourOfDay: stats.byHour,
})}

Be specific, use the exit numbers and numbers from the data, plain professional English, no hype.
Reply with JSON only:
{"headline": "one sentence, the single most important finding",
 "summary": "2-3 sentences",
 "hotspots": [{"exit": number, "name": "town", "crossings": number, "recommendation": "one concrete action"}] (top 3),
 "recommendations": ["3 short, concrete corridor-wide actions"]}`;
  try {
    return { ...(await generate([{ text: prompt }])), ai: true };
  } catch (err) {
    console.warn('[gemini] report failed, using template:', err.message);
    return { ...templateReport(stats), aiError: err.message };
  }
}
