/**
 * Minisign helpers aligned with minisign-verify (Tauri updater uses pre-hashed "ED" mode).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import blakejs from "blakejs";
import * as ed from "@noble/ed25519";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** @typedef {{ alg: Buffer, keyId: Buffer, edPub: Buffer }} MinisignPublicKey */
/** @typedef {{ alg: Buffer, keyId: Buffer, edSig: Buffer, trusted: string, globalSig: Buffer, isPrehashed: boolean }} MinisignSignature */

export function decodePubKeyText(pubContent) {
  const text = pubContent.includes("untrusted")
    ? pubContent
    : Buffer.from(pubContent, "base64").toString("utf8");
  const keyLine = text.trim().split("\n")[1];
  if (!keyLine) {
    throw new Error("Could not parse minisign public key.");
  }
  const raw = Buffer.from(keyLine, "base64");
  if (raw.length !== 42) {
    throw new Error(`Expected 42-byte minisign public key blob, got ${raw.length}.`);
  }
  return {
    alg: raw.subarray(0, 2),
    keyId: raw.subarray(2, 10),
    edPub: raw.subarray(10, 42),
  };
}

export function decodeSignatureText(signatureB64) {
  const text = Buffer.from(signatureB64, "base64").toString("utf8");
  const lines = text.trim().split("\n");
  if (lines.length < 4) {
    throw new Error("Could not parse minisign signature.");
  }
  const raw = Buffer.from(lines[1], "base64");
  if (raw.length !== 74) {
    throw new Error(`Expected 74-byte minisign signature blob, got ${raw.length}.`);
  }
  const alg = raw.subarray(0, 2);
  const isPrehashed = alg[0] === 0x45 && alg[1] === 0x44;
  return {
    alg,
    keyId: raw.subarray(2, 10),
    edSig: raw.subarray(10, 74),
    trusted: lines[2].slice("trusted comment: ".length),
    globalSig: Buffer.from(lines[3], "base64"),
    isPrehashed,
  };
}

export function loadConfiguredPubKey() {
  const conf = JSON.parse(
    readFileSync(path.join(root, "src-tauri", "tauri.conf.json"), "utf8")
  );
  const pubkey = conf?.plugins?.updater?.pubkey;
  if (typeof pubkey !== "string" || !pubkey.trim()) {
    throw new Error("plugins.updater.pubkey is missing in tauri.conf.json.");
  }
  return decodePubKeyText(pubkey.trim());
}

export async function verifyMinisignArtifact(fileBuf, signatureB64, pubContent) {
  const pk = decodePubKeyText(pubContent);
  const sig = decodeSignatureText(signatureB64);

  if (!sig.keyId.equals(pk.keyId)) {
    return { ok: false, reason: "signing key id mismatch" };
  }
  if (!sig.isPrehashed) {
    return { ok: false, reason: "legacy minisign signatures are not supported" };
  }

  const digest = blakejs.blake2b(fileBuf, null, 64);
  if (!(await ed.verifyAsync(sig.edSig, digest, pk.edPub))) {
    return { ok: false, reason: "installer signature invalid" };
  }

  const globalMsg = Buffer.concat([sig.edSig, Buffer.from(sig.trusted, "utf8")]);
  if (!(await ed.verifyAsync(sig.globalSig, globalMsg, pk.edPub))) {
    return { ok: false, reason: "trusted comment signature invalid" };
  }

  return { ok: true, reason: "ok" };
}
