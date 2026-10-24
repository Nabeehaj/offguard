import { useEffect, useState } from 'react';
import { Loader2, Printer, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api.js';
import { dayLabel } from '../lib/format.js';
import { Panel } from '../components/Panel.jsx';
import { HourChart, SpeciesBars } from '../components/Charts.jsx';

export function Report() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = (refresh = false) => {
    setLoading(true);
    setError(null);
    api
      .get(`/api/report${refresh ? '?refresh=1' : ''}`)
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => load(), []);

  const stats = report?.stats;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <p className="font-mono text-xs tracking-widest text-brass">FOR NYSDOT & NYSDEC · WEEKLY BRIEFING</p>
          <h1 className="font-display text-4xl font-black tracking-wide text-bone uppercase">Wildlife Report</h1>
          {report && <p className="text-sm text-steel-400">I-495 East, Suffolk corridor · generated {dayLabel(report.generatedAt)}</p>}
        </div>
        <div className="ml-auto flex gap-2 print:hidden">
          <button className="btn-steel" onClick={() => load(true)} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Regenerate
          </button>
          <button className="btn-steel" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </button>
        </div>
      </div>

      {loading && !report && (
        <Panel>
          <div className="flex items-center gap-3 py-10 text-steel-300">
            <Loader2 className="size-5 animate-spin text-brass" /> Gemini is reading 30 days of sensor data…
          </div>
        </Panel>
      )}
      {error && <p className="text-signal">{error}</p>}

      {report && (
        <div className="grid gap-4">
          <Panel>
            <div className="flex items-start gap-3 px-2 pt-2">
              <span className={`chip shrink-0 ${report.ai ? 'border-brass/50 text-brass' : ''}`}>
                {report.ai ? (
                  <>
                    <Sparkles className="size-3" /> WRITTEN BY GEMINI
                  </>
                ) : (
                  'TEMPLATE'
                )}
              </span>
            </div>
            <h2 className="mt-3 px-2 font-display text-3xl leading-tight font-extrabold text-bone">{report.headline}</h2>
            <p className="mt-2 max-w-3xl px-2 pb-2 text-steel-300">{report.summary}</p>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ['Crossings this week', stats.week],
              ['Crossings, 30 days', stats.month],
              ['Animals counted, 30 days', stats.animalsMonth],
            ].map(([label, value]) => (
              <Panel key={label}>
                <div className="led text-4xl font-bold">{value}</div>
                <div className="panel-title mt-1 text-[11px]">{label}</div>
              </Panel>
            ))}
          </div>

          <Panel title="Hotspots & recommended actions" bodyClass="p-0">
            <ol className="divide-y divide-steel-700/60">
              {report.hotspots?.map((h, i) => (
                <li key={h.exit} className="flex gap-4 px-6 py-4">
                  <span className="font-stencil text-4xl font-black text-signal">{i + 1}</span>
                  <div>
                    <div className="font-display text-xl font-bold text-bone uppercase">
                      Exit {h.exit} · {h.name}
                      <span className="ml-2 font-mono text-sm text-steel-400 normal-case">{h.crossings} crossings</span>
                    </div>
                    <p className="text-steel-300">{h.recommendation}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="When animals cross">
              <HourChart byHour={stats.byHour} />
            </Panel>
            <Panel title="What's crossing">
              <SpeciesBars bySpecies={stats.bySpecies} />
            </Panel>
          </div>

          <Panel title="Corridor-wide recommendations">
            <ul className="space-y-2">
              {report.recommendations?.map((r) => (
                <li key={r} className="flex gap-3 text-steel-200">
                  <span className="mt-2 size-2 shrink-0 rotate-45 bg-amber" />
                  {r}
                </li>
              ))}
            </ul>
          </Panel>
          <p className="text-center text-xs text-steel-500">Based on OffGuard sensor data. History before today is simulated for this prototype.</p>
        </div>
      )}
    </main>
  );
}
