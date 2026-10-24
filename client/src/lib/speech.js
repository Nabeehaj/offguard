// Spoken alerts for drivers (Web Speech API, built into the browser).
let lastSpoken = { text: '', at: 0 };

export function speak(text, { force = false } = {}) {
  if (!('speechSynthesis' in window)) return;
  const now = Date.now();
  if (!force && text === lastSpoken.text && now - lastSpoken.at < 20000) return;
  lastSpoken = { text, at: now };
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.02;
  u.pitch = 0.95;
  const voice = window.speechSynthesis.getVoices().find((v) => /en-US/i.test(v.lang) && /Google|Natural|Samantha|Aria/i.test(v.name));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

/** Two-tone chime before a spoken alert, like a crossing bell. */
export function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 660, 880].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.21);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* audio blocked until the user interacts; speech still works */
  }
}
