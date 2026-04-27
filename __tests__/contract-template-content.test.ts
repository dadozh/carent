import { describe, expect, it } from "vitest";
import {
  createDefaultContractTemplateDocument,
  resolveTemplateText,
  sanitizeContractTemplateDocument,
} from "@/lib/contract-template-content";

describe("contract template content", () => {
  it("creates a default template with editable blocks", () => {
    const document = createDefaultContractTemplateDocument("sr");
    expect(document.blocks.length).toBeGreaterThan(6);
    expect(document.blocks[0]?.text).toContain("Ugovor");
  });

  it("sanitizes out-of-range block values", () => {
    const document = sanitizeContractTemplateDocument({
      blocks: [
        {
          id: "a",
          text: "Hello",
          x: -10,
          y: 400,
          width: 1000,
          height: 1,
          fontSize: 99,
          align: "center",
        },
      ],
    }, "en");

    expect(document.blocks[0]).toMatchObject({
      x: 0,
      width: 92,
      height: 4,
      fontSize: 22,
      align: "center",
    });
  });

  it("replaces placeholders in template text", () => {
    expect(resolveTemplateText("Contract {{contract.number}} for {{tenant.name}}", {
      "{{contract.number}}": "1842",
      "{{tenant.name}}": "CARENT",
    })).toBe("Contract 1842 for CARENT");
  });
});
