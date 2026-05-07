import { useState, useMemo } from "react";
import type { Alert } from "../types";
import { SeverityBadge } from "./SeverityBadge";

type SortKey = "severity" | "event" | "sent" | "expires";
type SortDir = "asc" | "desc";

const severityRank: Record<string, number> = { Extreme: 0, Severe: 1, Moderate: 2 };
const ALL_SEVERITIES = ["Extreme", "Severe", "Moderate"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AlertsTable({ alerts, onSelectAlert }: { alerts: Alert[]; onSelectAlert: (alert: Alert) => void }) {
  const [search, setSearch] = useState("");
  const [selectedSeverities, setSelectedSeverities] = useState<Set<string>>(new Set(ALL_SEVERITIES));
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSeverity(s: string) {
    setSelectedSeverities((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); }
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alerts
      .filter((a) => selectedSeverities.has(a.properties.severity) && (!q || a.properties.event.toLowerCase().includes(q) || a.properties.areaDesc.toLowerCase().includes(q)))
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "severity") cmp = (severityRank[a.properties.severity] ?? 99) - (severityRank[b.properties.severity] ?? 99);
        else if (sortKey === "event") cmp = a.properties.event.localeCompare(b.properties.event);
        else if (sortKey === "sent") cmp = a.properties.sent.localeCompare(b.properties.sent);
        else if (sortKey === "expires") cmp = a.properties.expires.localeCompare(b.properties.expires);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [alerts, search, selectedSeverities, sortKey, sortDir]);

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <input type="search" placeholder="Search event or area..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500 font-medium">Severity:</span>
          {ALL_SEVERITIES.map((s) => (
            <label key={s} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={selectedSeverities.has(s)} onChange={() => toggleSeverity(s)} className="accent-blue-500" />
              {s}
            </label>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} of {alerts.length} alerts</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-800 text-slate-300 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("severity")}>Severity <SortIndicator col="severity" /></th>
              <th className="px-4 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("event")}>Event <SortIndicator col="event" /></th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Issued by</th>
              <th className="px-4 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("sent")}>Sent <SortIndicator col="sent" /></th>
              <th className="px-4 py-3 cursor-pointer hover:text-white select-none" onClick={() => handleSort("expires")}>Expires <SortIndicator col="expires" /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No alerts match the current filters.</td></tr>
            ) : (
              filtered.map((alert) => (
                <tr key={alert.id} onClick={() => onSelectAlert(alert)} className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3"><SeverityBadge severity={alert.properties.severity} /></td>
                  <td className="px-4 py-3 font-medium text-slate-800">{alert.properties.event}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{alert.properties.areaDesc}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{alert.properties.senderName}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(alert.properties.sent)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(alert.properties.expires)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
