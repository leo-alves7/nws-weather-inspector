import { useEffect } from "react";
import type { Alert } from "../types";
import { SeverityBadge } from "./SeverityBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function AlertDrawer({ alert, onClose }: { alert: Alert | null; onClose: () => void }) {
  useEffect(() => {
    if (!alert) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [alert, onClose]);

  return (
    <>
      {alert && <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ${alert ? "translate-x-0" : "translate-x-full"}`}>
        {alert && (
          <>
            <div className="flex items-start justify-between p-5 border-b border-gray-200 bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge severity={alert.properties.severity} />
                  <span className="text-xs text-gray-500">{alert.properties.event}</span>
                </div>
                <h2 className="text-base font-semibold text-slate-900 leading-snug">
                  {alert.properties.areaDesc}
                </h2>
              </div>
              <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-700 text-xl font-bold shrink-0" aria-label="Close">
                &times;
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {alert.properties.headline && (
                <p className="text-sm font-medium text-slate-800 bg-blue-50 border border-blue-200 rounded p-3">
                  {alert.properties.headline}
                </p>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-gray-500">Sent</span><p className="text-slate-800 font-medium">{formatDate(alert.properties.sent)}</p></div>
                <div><span className="text-gray-500">Expires</span><p className="text-slate-800 font-medium">{formatDate(alert.properties.expires)}</p></div>
                <div><span className="text-gray-500">Urgency</span><p className="text-slate-800 font-medium">{alert.properties.urgency}</p></div>
                <div><span className="text-gray-500">Certainty</span><p className="text-slate-800 font-medium">{alert.properties.certainty}</p></div>
                <div><span className="text-gray-500">Issued by</span><p className="text-slate-800 font-medium">{alert.properties.senderName}</p></div>
                <div><span className="text-gray-500">Response</span><p className="text-slate-800 font-medium">{alert.properties.response}</p></div>
              </div>
              {alert.properties.description && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Description</p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans bg-gray-50 rounded p-3 border border-gray-200">{alert.properties.description}</pre>
                </div>
              )}
              {alert.properties.instruction && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Instructions</p>
                  <p className="text-sm text-slate-700 bg-green-50 border border-green-200 rounded p-3">{alert.properties.instruction}</p>
                </div>
              )}
              {alert.properties.affectedZones.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Affected Zones ({alert.properties.affectedZones.length})</p>
                  <ul className="text-xs text-slate-600 space-y-0.5">
                    {alert.properties.affectedZones.map((z) => (
                      <li key={z} className="font-mono">{z.split("/zones/")[1] ?? z}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
