export type Severity = "Extreme" | "Severe" | "Moderate" | string;

export interface InspectionMetadata {
  RunAt: string;
  DurationSeconds: number;
  APIBaseURL: string;
  AlertsRequested: number;
  AlertsFetched: number;
}

export interface AlertProperties {
  event: string;
  severity: Severity;
  areaDesc: string;
  sent: string;
  expires: string;
  headline: string | null;
  description: string | null;
  instruction: string | null;
  senderName: string;
  urgency: string;
  certainty: string;
  response: string;
  affectedZones: string[];
}

export interface Alert {
  id: string;
  type: string;
  properties: AlertProperties;
}

export interface ZoneMetadata {
  id?: string;
  type?: string;
  properties: {
    id: string;
    name: string;
    state: string;
    type: string;
    timeZone: string[];
    radarStation: string | null;
    forecastOffice: string | null;
  };
}

export interface ForecastPeriod {
  number: number;
  name: string;
  detailedForecast: string;
}

export interface ZoneForecast {
  type?: string;
  properties: {
    zone?: string;
    updated?: string;
    periods: ForecastPeriod[];
  };
}

export interface Zone {
  Metadata: ZoneMetadata;
  Forecast: ZoneForecast | null;
}

export interface InspectionOutput {
  InspectionMetadata: InspectionMetadata;
  AlertTotalCount: number;
  AlertSeverityCounts: Record<string, number>;
  ZoneTotalCount: number;
  ZoneTypeCounts: Record<string, number>;
  Alerts: Alert[];
  Zones: Zone[];
}
