import { useEffect, useState } from "react";
import { fetchInspectionData } from "./api";
import type { Alert, InspectionOutput } from "./types";
import { MetadataBar } from "./components/MetadataBar";
import { SummaryCards } from "./components/SummaryCards";
import { AlertsTable } from "./components/AlertsTable";
import { AlertDrawer } from "./components/AlertDrawer";
import { ZoneList } from "./components/ZoneList";

export default function App() {
  const [data, setData] = useState<InspectionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  useEffect(() => {
    fetchInspectionData()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-red-200 rounded-xl shadow p-8 max-w-md text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            Could not load inspection data
          </h1>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <p className="text-xs text-gray-400">
            Make sure you ran <code className="bg-gray-100 px-1 rounded">python inspector.py</code> first,
            then <code className="bg-gray-100 px-1 rounded">python server.py</code>.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MetadataBar meta={data.InspectionMetadata} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <SummaryCards
          alertTotal={data.AlertTotalCount}
          alertSeverityCounts={data.AlertSeverityCounts}
          zoneTotal={data.ZoneTotalCount}
          zoneTypeCounts={data.ZoneTypeCounts}
        />
        <div className="mb-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Alerts ({data.AlertTotalCount})
          </h2>
          <AlertsTable alerts={data.Alerts} onSelectAlert={setSelectedAlert} />
        </div>
        <ZoneList zones={data.Zones} />
      </main>
      <AlertDrawer alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
    </div>
  );
}
