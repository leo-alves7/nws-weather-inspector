import type { Severity } from "../types";

const styles: Record<string, string> = {
  Extreme: "bg-red-100 text-red-800 border border-red-300",
  Severe: "bg-orange-100 text-orange-800 border border-orange-300",
  Moderate: "bg-yellow-100 text-yellow-800 border border-yellow-300",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cls = styles[severity] ?? "bg-gray-100 text-gray-700 border border-gray-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {severity}
    </span>
  );
}
