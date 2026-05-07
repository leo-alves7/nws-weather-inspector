import type { Zone } from "../types";
import { ZoneCard } from "./ZoneCard";

export function ZoneList({ zones }: { zones: Zone[] }) {
  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Zones ({zones.length})</h2>
      {zones.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
          No zones fetched. Zones are only collected for <strong>Extreme</strong> and <strong>Severe</strong> alerts.
          If all current alerts are Moderate, this section will be empty.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {zones.map((zone, i) => (
            <ZoneCard key={zone.Metadata.properties?.id ?? i} zone={zone} />
          ))}
        </div>
      )}
    </div>
  );
}
