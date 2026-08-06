import { describe, expect, it } from "vitest";
import { addJarvisBaseUnits, formatJarvisBaseUnits, parseJarvisBaseUnits, parseJarvisDecimal, subtractJarvisBaseUnits } from "../packages/token-core/src/amounts.js";
import { TOKEN } from "../packages/token-core/src/constants.js";

describe("exact JARVIS token amount functions", () => {
  it("converts decimal JARVIS without floating point", () => {
    expect(parseJarvisDecimal("1")).toBe(1_000_000n);
    expect(parseJarvisDecimal("1.000001")).toBe(1_000_001n);
    expect(formatJarvisBaseUnits("1000001")).toBe("1.000001");
    expect(formatJarvisBaseUnits("1000000", false)).toBe("1.000000");
    expect(parseJarvisBaseUnits(TOKEN.maximumBaseUnits.toString())).toBe(TOKEN.maximumBaseUnits);
  });

  it("rejects precision loss and non-canonical decimal forms", () => {
    for (const value of ["1.0000001", "01", ".5", "1.", "1e6", "-1", "+1"]) expect(() => parseJarvisDecimal(value)).toThrow();
    expect(() => parseJarvisDecimal("18440000001")).toThrow(/maximum supply/);
  });

  it("guards arithmetic overflow and underflow", () => {
    expect(addJarvisBaseUnits("40", "2")).toBe(42n);
    expect(subtractJarvisBaseUnits("42", "2")).toBe(40n);
    expect(() => addJarvisBaseUnits(TOKEN.maximumBaseUnits, 1n)).toThrow(/maximum supply/);
    expect(() => subtractJarvisBaseUnits("1", "2")).toThrow(/negative/);
  });
});
