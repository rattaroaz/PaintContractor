export const UPDATE_FEED_UNAVAILABLE_MESSAGE =
  "No update feed is published yet. The GitHub Release workflow must complete successfully " +
  "and publish latest.json plus signed installers. Check Actions → Release on GitHub.";

export const UNSUPPORTED_PLATFORM_MESSAGE =
  "This PC uses Windows on ARM, but the published update feed does not include a matching " +
  "windows-aarch64 installer yet. Install the ARM64 setup from GitHub Releases, or publish a " +
  "new release after the Release workflow builds both x64 and ARM64.";

export function isFeedUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("could not fetch a valid release json") ||
    lower.includes("failed to fetch") ||
    lower.includes("404") ||
    lower.includes("not found")
  );
}

export function isUnsupportedPlatformError(message: string): boolean {
  return (
    message.includes("were found in the response `platforms` object") ||
    message.includes("fallback platforms")
  );
}

export function resolveUpdateErrorMessage(raw: string): string {
  if (isUnsupportedPlatformError(raw)) {
    return UNSUPPORTED_PLATFORM_MESSAGE;
  }
  if (isFeedUnavailableError(raw)) {
    return UPDATE_FEED_UNAVAILABLE_MESSAGE;
  }
  return `Update check failed: ${raw}`;
}
