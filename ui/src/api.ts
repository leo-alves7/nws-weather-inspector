import type { InspectionOutput } from "./types";

export async function fetchInspectionData(): Promise<InspectionOutput> {
  const res = await fetch("/api/data");
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(
      (detail as { detail?: string }).detail ?? `HTTP ${res.status}`
    );
  }
  return res.json() as Promise<InspectionOutput>;
}
