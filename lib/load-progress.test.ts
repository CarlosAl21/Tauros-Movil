import {
  formatLoadDelta,
  formatShortDate,
  summarizeLoadProgress,
  type LoadRecord,
} from "./load-progress";

const record = (id: string, cargaKg: number, fechaRegistro: string): LoadRecord => ({
  registroCargaId: id,
  ejercicioId: "ex-1",
  rutinaEjercicioId: null,
  cargaKg,
  unidad: "kg",
  fechaRegistro,
});

describe("load-progress", () => {
  it("formats short Spanish dates", () => {
    expect(formatShortDate("2026-09-12T12:00:00")).toBe("12 sep");
    expect(formatShortDate("2026-01-03T12:00:00")).toBe("3 ene");
    expect(formatShortDate("not a date")).toBe("");
  });

  it("formats signed deltas in the user's unit", () => {
    expect(formatLoadDelta(25, 20, "kg")).toBe("+5 kg");
    expect(formatLoadDelta(17.5, 20, "kg")).toBe("-2.5 kg");
    expect(formatLoadDelta(20, 20, "kg")).toBe("Sin cambios");
    expect(formatLoadDelta(25, 20, "lb")).toBe("+11 lb");
    expect(formatLoadDelta(20.01, 20, "kg")).toBe("Sin cambios");
  });

  it("returns null without records", () => {
    expect(summarizeLoadProgress([], "kg")).toBeNull();
  });

  it("summarizes a single record without deltas", () => {
    const summary = summarizeLoadProgress(
      [record("a", 20, "2026-09-12T12:00:00")],
      "kg",
    );
    expect(summary).toMatchObject({
      latestText: "20 kg",
      latestDate: "12 sep",
      previousDeltaText: null,
      firstDeltaText: null,
    });
    expect(summary?.recent).toHaveLength(1);
  });

  it("orders newest first and computes deltas", () => {
    const summary = summarizeLoadProgress(
      [
        record("a", 20, "2026-09-01T12:00:00"),
        record("c", 30, "2026-09-20T12:00:00"),
        record("b", 25, "2026-09-10T12:00:00"),
      ],
      "kg",
    );
    expect(summary?.latestText).toBe("30 kg");
    expect(summary?.previousDeltaText).toBe("+5 kg vs. anterior");
    expect(summary?.firstDeltaText).toBe("+10 kg desde el 1 sep");
    expect(summary?.recent.map((item) => item.key)).toEqual(["c", "b", "a"]);
  });

  it("limits the recent list", () => {
    const records = Array.from({ length: 8 }, (_, index) =>
      record(`r${index}`, 20 + index, `2026-09-${10 + index}T12:00:00`),
    );
    expect(summarizeLoadProgress(records, "kg")?.recent).toHaveLength(5);
  });
});
