/**
 * Weight unit conversion. Every weight is stored and sent in kilograms; the
 * user's unit (kg or lb) only changes what is displayed and how typed values
 * are interpreted.
 */
export type WeightUnit = "kg" | "lb";

export const DEFAULT_WEIGHT_UNIT: WeightUnit = "kg";
export const KG_PER_LB = 0.45359237;

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** "72.50" -> "72.5", "72.00" -> "72". */
function trimNumber(value: number, decimals: number) {
  return String(Number(roundTo(value, decimals).toFixed(decimals)));
}

export function isWeightUnit(value: unknown): value is WeightUnit {
  return value === "kg" || value === "lb";
}

/** Value typed/shown in `unit` -> kilograms, rounded to 2 decimals. */
export function toKg(value: number, unit: WeightUnit): number {
  return roundTo(unit === "lb" ? value * KG_PER_LB : value, 2);
}

/** Kilograms -> `unit` (unrounded; use the formatters for display). */
export function fromKg(valueKg: number, unit: WeightUnit): number {
  return unit === "lb" ? valueKg / KG_PER_LB : valueKg;
}

/** Display text, e.g. "72.5 kg" / "159.8 lb" (1 decimal, no trailing ".0"). */
export function formatWeight(valueKg: number, unit: WeightUnit): string {
  return `${trimNumber(fromKg(valueKg, unit), 1)} ${unit}`;
}

/** Prefill for an input field in `unit` ("" when there is no weight). */
export function toWeightInput(valueKg: number, unit: WeightUnit): string {
  if (!Number.isFinite(valueKg) || valueKg <= 0) {
    return "";
  }

  // kg keeps both stored decimals so re-saving an untouched value is lossless.
  return trimNumber(fromKg(valueKg, unit), unit === "kg" ? 2 : 1);
}

/** Parses a typed weight ("72,5" or "72.5"); null unless a number > 0. */
export function parseWeightInput(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(normalized)) {
    return null;
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Coach `carga` is free text. Only a plain number, optionally followed by
 * "kg", is a weight in kilograms; anything else ("20-25", "RPE 8") is null.
 */
export function parseCargaKg(carga: string | null | undefined): number | null {
  const match = String(carga ?? "")
    .trim()
    .match(/^(\d+(?:[.,]\d+)?)\s*(?:kgs?)?$/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Coach `carga` for display: converted when numeric, raw text otherwise. */
export function formatCarga(
  carga: string | null | undefined,
  unit: WeightUnit,
): string {
  const valueKg = parseCargaKg(carga);
  if (valueKg !== null) {
    return formatWeight(valueKg, unit);
  }

  return String(carga ?? "").trim();
}
