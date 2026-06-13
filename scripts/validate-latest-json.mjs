const repo = process.env.GITHUB_REPOSITORY ?? "rattaroaz/PaintContractor";
const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
const expectedPlatforms = (process.env.EXPECT_PLATFORMS ?? "windows-x86_64,windows-x86_64-nsis")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (!tag) {
  console.error("RELEASE_TAG or GITHUB_REF_NAME must be set.");
  process.exit(1);
}

async function assertReachable(url) {
  let response = await fetch(url, { method: "HEAD", redirect: "follow" });
  if (response.status === 405 || response.status === 403) {
    response = await fetch(url, { method: "GET", redirect: "follow" });
  }
  if (!response.ok) {
    throw new Error(`Asset URL is not reachable (${response.status}): ${url}`);
  }
}

const latestUrl = `https://github.com/${repo}/releases/download/${tag}/latest.json`;
const response = await fetch(latestUrl, { redirect: "follow" });
if (!response.ok) {
  console.error(`latest.json is not reachable (${response.status}): ${latestUrl}`);
  process.exit(1);
}

const latest = await response.json();
if (latest.version !== tag.replace(/^v/, "")) {
  console.error(`latest.json version ${latest.version} does not match tag ${tag}.`);
  process.exit(1);
}

if (!latest.platforms || typeof latest.platforms !== "object") {
  console.error("latest.json is missing a platforms object.");
  process.exit(1);
}

for (const platform of expectedPlatforms) {
  const entry = latest.platforms[platform];
  if (!entry) {
    console.error(`latest.json is missing platform ${platform}.`);
    process.exit(1);
  }
  if (!entry.signature || typeof entry.signature !== "string") {
    console.error(`latest.json platform ${platform} is missing a signature.`);
    process.exit(1);
  }
  if (!entry.url || typeof entry.url !== "string") {
    console.error(`latest.json platform ${platform} is missing a URL.`);
    process.exit(1);
  }
  await assertReachable(entry.url);
}

console.log(
  `latest.json OK for ${tag}: ${expectedPlatforms.join(", ")}`
);
