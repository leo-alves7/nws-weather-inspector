import { useState } from "react";
import type { Zone } from "../types";

export function ZoneCard({ zone }: { zone: Zone }) {
  const [expanded, setExpanded] = useState(false);
  const props = zone.Metadata.properties;
  const periods = zone.Forecast?.properties.periods ?? [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-slate-900">{props.name}</p>
          <p className="text-xs text-gray-500">{props.state} &middot; {props.id}</p>
        </div>
        <span className="shrink-0 text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-2 py-0.5 font-medium">{props.type}</span>
      </div>
      {props.timeZone.length > 0 && <p className="text-xs text-gray-400 mb-3">{props.timeZone[0]}</p>}
      {periods.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No forecast available</p>
      ) : (
        <div>
          <div className="space-y-2">
            {periods.slice(0, expanded ? periods.length : 2).map((p) => (
              <div key={p.number} className="text-sm">
                <p className="font-medium text-slate-700">{p.name}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{p.detailedForecast}</p>
              </div>
            ))}
          </div>
          {periods.length > 2 && (
            <button onClick={() => setExpanded((e) => !e)} className="mt-2 text-xs text-blue-600 hover:underline">
              {expanded ? "Show less" : `Show all ${periods.length} periods`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
