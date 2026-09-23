import {
  formatCarga,
  formatWeight,
  fromKg,
  KG_PER_LB,
  parseCargaKg,
  parseWeightInput,
  toKg,
  toWeightInput,
} from "./weight-units";

describe("weight-units", () => {
  it("uses the exact international pound", () => {
    expect(KG_PER_LB).toBe(0.45359237);
  });

  it("converts to kg rounded to 2 decimals", () => {
    expect(toKg(72.5, "kg")).toBe(72.5);
    expect(toKg(72.456, "kg")).toBe(72.46);
    expect(toKg(100, "lb")).toBe(45.36);
    expect(toKg(45, "lb")).toBe(20.41);
  });

  it("converts from kg", () => {
    expect(fromKg(20, "kg")).toBe(20);
    expect(fromKg(KG_PER_LB * 10, "lb")).toBeCloseTo(10, 10);
  });

  it("formats with 1 decimal and no trailing .0", () => {
    expect(formatWeight(72, "kg")).toBe("72 kg");
    expect(formatWeight(72.46, "kg")).toBe("72.5 kg");
    expect(formatWeight(20, "lb")).toBe("44.1 lb");
    expect(formatWeight(toKg(45, "lb"), "lb")).toBe("45 lb");
  });

  it("round-trips a value typed in lb", () => {
    for (const lb of [5, 12.5, 45, 135, 225.5]) {
      expect(formatWeight(toKg(lb, "lb"), "lb")).toBe(`${lb} lb`);
    }
  });

  it("builds input prefill values", () => {
    expect(toWeightInput(0, "kg")).toBe("");
    expect(toWeightInput(72.35, "kg")).toBe("72.35");
    expect(toWeightInput(72, "kg")).toBe("72");
    expect(toWeightInput(20, "lb")).toBe("44.1");
  });

  it("parses typed values with comma or dot", () => {
    expect(parseWeightInput("72,5")).toBe(72.5);
    expect(parseWeightInput(" 72.5 ")).toBe(72.5);
    expect(parseWeightInput("80")).toBe(80);
    expect(parseWeightInput("")).toBeNull();
    expect(parseWeightInput("0")).toBeNull();
    expect(parseWeightInput("-3")).toBeNull();
    expect(parseWeightInput("7a")).toBeNull();
    expect(parseWeightInput("1.2.3")).toBeNull();
  });

  it("parses only plain numeric carga strings", () => {
    expect(parseCargaKg("20")).toBe(20);
    expect(parseCargaKg("20 kg")).toBe(20);
    expect(parseCargaKg("22,5kg")).toBe(22.5);
    expect(parseCargaKg("20 KG")).toBe(20);
    expect(parseCargaKg("20-25")).toBeNull();
    expect(parseCargaKg("20 lb")).toBeNull();
    expect(parseCargaKg("RPE 8")).toBeNull();
    expect(parseCargaKg("")).toBeNull();
    expect(parseCargaKg(null)).toBeNull();
  });

  it("formats carga: converted when numeric, raw otherwise", () => {
    expect(formatCarga("20", "kg")).toBe("20 kg");
    expect(formatCarga("20 kg", "lb")).toBe("44.1 lb");
    expect(formatCarga("20-25", "lb")).toBe("20-25");
    expect(formatCarga("  Peso corporal ", "lb")).toBe("Peso corporal");
    expect(formatCarga(undefined, "kg")).toBe("");
  });
});
