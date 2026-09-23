import { formatWeight, fromKg, type WeightUnit } from "./weight-units";

/** One load the user recorded for a base exercise (always in kg). */
export type LoadRecord = {
  registroCargaId: string;
  ejercicioId: string;
  rutinaEjercicioId: string | null;
  cargaKg: number;
  /** Unit the user typed the load in (display always uses the current preference). */
  unidad: WeightUnit;
  fechaRegistro: string;
};

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** "2026-09-12T10:00:00Z" -> "12 sep" ("" when the date is invalid). */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getDate()} ${MONTHS_ES[date.getMonth()]}`;
}

/** Signed difference in the user's unit: "+5 kg", "-2.5 lb", "Sin cambios". */
export function formatLoadDelta(
  currentKg: number,
  baseKg: number,
  unit: WeightUnit,
): string {
  const diff = fromKg(currentKg, unit) - fromKg(baseKg, unit);
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0) {
    return "Sin cambios";
  }

  const magnitude = formatWeight(Math.abs(currentKg - baseKg), unit);
  return `${rounded > 0 ? "+" : "-"}${magnitude}`;
}

export type LoadProgressSummary = {
  latestText: string;
  latestDate: string;
  /** e.g. "+5 kg vs. anterior"; null with a single record. */
  previousDeltaText: string | null;
  /** e.g. "+10 kg desde el 12 sep"; null with fewer than 3 records. */
  firstDeltaText: string | null;
  recent: { key: string; date: string; loadText: string }[];
};

/** Summary for the progress card; null when there are no records. */
export function summarizeLoadProgress(
  records: LoadRecord[],
  unit: WeightUnit,
  recentCount = 5,
): LoadProgressSummary | null {
  const sorted = records
    .filter((record) => Number.isFinite(record.cargaKg))
    .slice()
    .sort(
      (left, right) =>
        new Date(right.fechaRegistro).getTime() -
        new Date(left.fechaRegistro).getTime(),
    );

  const [latest, previous] = sorted;
  if (!latest) {
    return null;
  }

  const first = sorted[sorted.length - 1];

  return {
    latestText: formatWeight(latest.cargaKg, unit),
    latestDate: formatShortDate(latest.fechaRegistro),
    previousDeltaText: previous
      ? `${formatLoadDelta(latest.cargaKg, previous.cargaKg, unit)} vs. anterior`
      : null,
    // With two records "since the first" would repeat "vs. previous".
    firstDeltaText:
      sorted.length > 2
        ? `${formatLoadDelta(latest.cargaKg, first.cargaKg, unit)} desde el ${formatShortDate(first.fechaRegistro)}`
        : null,
    recent: sorted.slice(0, recentCount).map((record) => ({
      key: record.registroCargaId,
      date: formatShortDate(record.fechaRegistro),
      loadText: formatWeight(record.cargaKg, unit),
    })),
  };
}
