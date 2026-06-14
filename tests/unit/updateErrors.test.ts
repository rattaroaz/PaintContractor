import { describe, expect, it } from "vitest";
import {
  isFeedUnavailableError,
  isSignatureVerificationError,
  isUnsupportedPlatformError,
  resolveUpdateErrorMessage,
  SIGNATURE_VERIFICATION_MESSAGE,
  UPDATE_FEED_UNAVAILABLE_MESSAGE,
  UNSUPPORTED_PLATFORM_MESSAGE,
} from "../../src/services/updateErrors";

describe("isFeedUnavailableError", () => {
  const positives = [
    "Could not fetch a valid release JSON from the remote",
    "failed to fetch latest.json",
    "HTTP 404 Not Found",
    "release not found on GitHub",
    "NOT FOUND",
  ];

  it.each(positives)("detects feed errors: %s", (message) => {
    expect(isFeedUnavailableError(message)).toBe(true);
  });

  it.each([
    "network down",
    "signature verification failed",
    "were found in the response `platforms` object",
  ])("does not classify unrelated errors: %s", (message) => {
    expect(isFeedUnavailableError(message)).toBe(false);
  });
});

describe("isUnsupportedPlatformError", () => {
  it("detects missing platform entries", () => {
    expect(
      isUnsupportedPlatformError(
        'None of the fallback platforms `["windows-aarch64"]` were found in the response `platforms` object'
      )
    ).toBe(true);
  });

  it("detects fallback platform wording", () => {
    expect(isUnsupportedPlatformError("fallback platforms missing")).toBe(true);
  });

  it("ignores generic fetch failures", () => {
    expect(isUnsupportedPlatformError("failed to fetch")).toBe(false);
  });
});

describe("isSignatureVerificationError", () => {
  it.each([
    "The signature verification failed",
    "signature verify error",
    "The signature was created with a different key than the one provided",
  ])("detects signature failures: %s", (message) => {
    expect(isSignatureVerificationError(message)).toBe(true);
  });
});

describe("resolveUpdateErrorMessage", () => {
  it("returns feed guidance for missing release JSON", () => {
    expect(
      resolveUpdateErrorMessage("Could not fetch a valid release JSON")
    ).toBe(UPDATE_FEED_UNAVAILABLE_MESSAGE);
  });

  it("returns ARM64 guidance for unsupported platform", () => {
    expect(
      resolveUpdateErrorMessage("fallback platforms `windows-aarch64`")
    ).toBe(UNSUPPORTED_PLATFORM_MESSAGE);
  });

  it("returns signing guidance for signature verification failures", () => {
    expect(resolveUpdateErrorMessage("The signature verification failed")).toBe(
      SIGNATURE_VERIFICATION_MESSAGE
    );
  });

  it("returns signing guidance for signing key mismatch failures", () => {
    expect(
      resolveUpdateErrorMessage(
        "The signature was created with a different key than the one provided"
      )
    ).toBe(SIGNATURE_VERIFICATION_MESSAGE);
  });

  it("wraps unknown errors", () => {
    expect(resolveUpdateErrorMessage("network down")).toBe(
      "Update check failed: network down"
    );
  });

  it("prefers platform guidance when both platform and not-found cues appear", () => {
    expect(
      resolveUpdateErrorMessage(
        'None of the fallback platforms `["windows-aarch64"]` were found in the response `platforms` object'
      )
    ).toBe(UNSUPPORTED_PLATFORM_MESSAGE);
  });
});
