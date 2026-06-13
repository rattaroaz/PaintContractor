import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import pkg from "../../package.json";

const TAURI_CONF = JSON.parse(
  readFileSync(resolve("src-tauri/tauri.conf.json"), "utf8")
);

describe("Tauri updater configuration contract", () => {
  it("enables updater artifacts in the bundle", () => {
    expect(TAURI_CONF.bundle.createUpdaterArtifacts).toBe(true);
  });

  it("ships a minisign public key", () => {
    const pubkey = TAURI_CONF.plugins?.updater?.pubkey;
    expect(typeof pubkey).toBe("string");
    expect(pubkey.length).toBeGreaterThan(40);
  });

  it("points at the PaintContractor GitHub latest.json endpoint", () => {
    const endpoints: string[] = TAURI_CONF.plugins?.updater?.endpoints ?? [];
    expect(endpoints.length).toBeGreaterThan(0);
    expect(endpoints[0]).toMatch(/rattaroaz\/PaintContractor\/releases\/latest\/download\/latest\.json/);
  });

  it("uses passive Windows install mode", () => {
    expect(TAURI_CONF.plugins?.updater?.windows?.installMode).toBe("passive");
  });

  it("keeps app version aligned with package.json for updater comparisons", () => {
    expect(TAURI_CONF.version).toBe(pkg.version);
  });
});
