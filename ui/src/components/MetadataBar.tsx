import type { InspectionMetadata } from "../types";

function isStale(runAt: string): boolean {
  return Date.now() - new Date(runAt).getTime() > 60 * 60 * 1000;
}

export function MetadataBar({ meta }: { meta: InspectionMetadata }) {
  const runDate = new Date(meta.RunAt).toLocaleString();
  const stale = isStale(meta.RunAt);

  return (
    <div className="sticky top-0 z-20 bg-slate-900 text-slate-300 text-sm px-6 py-2 flex items-center gap-4">
      <span className="font-semibold text-white">NWS Weather Inspector</span>
      <span className="text-slate-400">|</span>
      <span>Last run: {runDate}</span>
      <span className="text-slate-400">|</span>
      <span>{meta.DurationSeconds}s</span>
      <span className="text-slate-400">|</span>
      <span>
        {meta.AlertsFetched} / {meta.AlertsRequested} alerts fetched
      </span>
      {stale && (
        <span className="ml-auto bg-yellow-500 text-yellow-950 text-xs font-semibold px-2 py-0.5 rounded">
          Data is over 1 hour old - re-run inspector.py to refresh
        </span>
      )}
    </div>
  );
}
