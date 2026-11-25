import { describe, it, expect } from "vitest";
import { template, generate, safeLink } from "./model";
describe("website output", () => {
  it("escapes visitor text", () => {
    const s = template("Personal introduction");
    s.sections[0].elements[0].text = "<script>alert(1)</script>";
    expect(generate(s).html).not.toContain("<script>");
  });
  it("rejects executable links", () => {
    expect(safeLink("javascript:alert(1)")).toBe("#");
  });
  it("preserves anchors", () => {
    expect(safeLink("#section")).toBe("#section");
  });
  it("exports standalone responsive HTML", () => {
    const r = generate(template("Project showcase"));
    expect(r.document).toContain("<!doctype html>");
    expect(r.css).toContain("@media");
    expect(r.document).not.toContain("react");
  });
});

describe("style and link boundaries", () => {
  it("keeps section anchors inside the exported page", () => {
    const s = template("Event invitation");
    s.sections[1].elements.find(({ type }) => type === "link")!.href =
      "#" + s.sections[0].id;
    const out = generate(s).html;
    expect(out).not.toContain('target="_blank"');
    expect(out).toContain('href="#' + s.sections[0].id + '"');
  });
  it("clamps unsupported colors and sizes", () => {
    const s = template("Personal introduction");
    s.sections[0].elements[0].size = 900;
    s.sections[0].elements[0].color = "red; } </style><script>";
    const out = generate(s);
    expect(out.css).toContain("80px");
    expect(out.css).not.toContain("<script>");
  });
});
