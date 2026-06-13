const repo = process.env.GITHUB_REPOSITORY ?? "rattaroaz/PaintContractor";
const tag = process.env.RELEASE_TAG ?? process.env.GITHUB_REF_NAME;
const expectedPlatforms = (process.env.EXPECT_PLATFORMS ?? "windows-x86_64,windows-x86_64-nsis")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const fetchAttempts = Number.parseInt(process.env.VALIDATE_FETCH_ATTEMPTS ?? "5", 10);
const fetchDelayMs = Number.parseInt(process.env.VALIDATE_FETCH_DELAY_MS ?? "3000", 10);

if (!tag) {
  console.error("RELEASE_TAG or GITHUB_REF_NAME must be set.");
  process.exit(1);
}

function encodeReleaseAssetUrl(repo, tag, assetPath) {
  const encodedName = assetPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://github.com/${repo}/releases/download/${tag}/${encodedName}`;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchLatestJson(latestUrl) {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= fetchAttempts; attempt++) {
    const response = await fetch(latestUrl, {
      redirect: "follow",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    lastStatus = response.status;
    if (response.ok) {
      return response.json();
    }
    if (attempt < fetchAttempts) {
      console.warn(
        `latest.json not ready (${response.status}); retry ${attempt}/${fetchAttempts} in ${fetchDelayMs}ms`
      );
      await sleep(fetchDelayMs);
    }
  }
  console.error(`latest.json is not reachable (${lastStatus}): ${latestUrl}`);
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
const latest = await fetchLatestJson(latestUrl);

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
    console.error(
      `Present platforms: ${Object.keys(latest.platforms).sort().join(", ") || "(none)"}`
    );
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

  let reachable = false;
  let lastError = null;
  const urlCandidates = [entry.url];
  try {
    const parsed = new URL(entry.url);
    const rawName = decodeURIComponent(parsed.pathname.split("/").pop() ?? "");
    const dottedName = rawName.replace(/ /g, ".");
    if (dottedName !== rawName) {
      urlCandidates.push(encodeReleaseAssetUrl(repo, tag, dottedName));
    }
  } catch {
    // keep original url only
  }

  for (const candidate of urlCandidates) {
    try {
      await assertReachable(candidate);
      reachable = true;
      if (candidate !== entry.url) {
        console.warn(
          `Platform ${platform}: live URL differs from latest.json; asset reachable at ${candidate}`
        );
      }
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!reachable) {
    console.error(lastError instanceof Error ? lastError.message : String(lastError));
    process.exit(1);
  }
}

console.log(`latest.json OK for ${tag}: ${expectedPlatforms.join(", ")}`);
