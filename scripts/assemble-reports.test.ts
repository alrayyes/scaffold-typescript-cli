import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assembleReports, renderIndex } from "./assemble-reports";

describe("renderIndex", () => {
  test("links each entry and escapes the text", () => {
    const html = renderIndex("a <b>", [{ label: "x & y", href: "x.xml" }]);
    expect(html).toContain("<title>a &lt;b&gt;</title>");
    expect(html).toContain('<a href="x.xml">x &amp; y</a>');
  });
});

describe("assembleReports", () => {
  let root: string;
  let out: string;

  const write = (path: string, body = "x") => {
    const file = join(root, path);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, body);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "reports-in-"));
    out = join(mkdtempSync(join(tmpdir(), "reports-out-")), "reports");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(join(out, ".."), { recursive: true, force: true });
  });

  const writeInputs = () => {
    write("junit/unit.xml", "<testsuites/>");
    write("coverage/lcov.info", "TN:");
    write("coverage/coverage.xml", "<coverage/>");
    write("coverage/html/index.html", "<html/>");
  };

  test("lays the reports out the way the catalogue links them", async () => {
    writeInputs();
    await assembleReports({ root, out, title: "my-repo" });
    for (const path of [
      "index.html",
      "tests/index.html",
      "tests/unit.xml",
      "coverage/index.html",
      "coverage/coverage.xml",
      "coverage/lcov.info",
    ]) {
      expect(existsSync(join(out, path))).toBe(true);
    }
    expect(readFileSync(join(out, "index.html"), "utf8")).toContain("my-repo reports");
  });

  test("refuses to run when an input is missing", async () => {
    writeInputs();
    rmSync(join(root, "coverage/coverage.xml"));
    await expect(assembleReports({ root, out, title: "my-repo" })).rejects.toThrow(
      "missing report input: coverage/coverage.xml",
    );
    expect(existsSync(out)).toBe(false);
  });
});
