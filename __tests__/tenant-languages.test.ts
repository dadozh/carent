import { describe, expect, it } from "vitest";
import { getInitialLocale, resolveContractLocale } from "@/lib/i18n-config";

describe("tenant language settings", () => {
  it("clamps a stored UI locale to the tenant default when it is not enabled", () => {
    expect(getInitialLocale("sr", ["de", "en"], "de")).toBe("de");
  });

  it("keeps a stored UI locale when it is enabled", () => {
    expect(getInitialLocale("bs", ["en", "bs"], "en")).toBe("bs");
  });

  it("falls back to the default contract language when lang is unsupported by the tenant", () => {
    expect(resolveContractLocale("hr", ["en", "sr"], "sr")).toBe("sr");
  });

  it("uses the requested contract language when it is enabled", () => {
    expect(resolveContractLocale("de", ["de", "en"], "en")).toBe("de");
  });
});
