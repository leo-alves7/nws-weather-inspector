const severityOrder = ["Extreme", "Severe", "Moderate"];
const severityColors: Record<string, string> = {
  Extreme: "bg-red-500",
  Severe: "bg-orange-400",
  Moderate: "bg-yellow-400",
};

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function SeverityBar({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return <span className="text-3xl font-bold text-slate-900">0</span>;
  return (
    <div>
      <div className="flex rounded overflow-hidden h-3 mt-1 mb-2">
        {severityOrder.filter((s) => counts[s]).map((s) => (
          <div key={s} className={severityColors[s] ?? "bg-gray-400"} style={{ width: `${(counts[s] / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {severityOrder.filter((s) => counts[s]).map((s) => (
          <span key={s} className="text-slate-700">
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${severityColors[s]}`} />
            {s}: <strong>{counts[s]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

function ZoneTypeList({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <span className="text-3xl font-bold text-slate-900">0</span>;
  return (
    <div>
      <div className="text-3xl font-bold text-slate-900 mb-1">
        {Object.values(counts).reduce((a, b) => a + b, 0)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        {entries.map(([type, count]) => (
          <span key={type}>{type}: <strong>{count}</strong></span>
        ))}
      </div>
    </div>
  );
}

export function SummaryCards({
  alertTotal, alertSeverityCounts, zoneTotal, zoneTypeCounts,
}: {
  alertTotal: number;
  alertSeverityCounts: Record<string, number>;
  zoneTotal: number;
  zoneTypeCounts: Record<string, number>;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Total Alerts" value={alertTotal} />
      <StatCard label="Alerts by Severity" value={<SeverityBar counts={alertSeverityCounts} />} />
      <StatCard label="Total Zones" value={zoneTotal} />
      <StatCard label="Zones by Type" value={<ZoneTypeList counts={zoneTypeCounts} />} />
    </div>
  );
}
