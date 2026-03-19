/**
 * Clash-Kite prepare script
 *
 * Downloads mihomo binary and GeoIP data files for the current platform.
 * Runs automatically via the npm `prepare` lifecycle hook after `npm install`.
 *
 * Usage:
 *   node scripts/prepare.mjs            # auto-detect platform & arch
 *   node scripts/prepare.mjs --arm64    # override arch
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { execSync } from "child_process";
import { pipeline } from "stream/promises";

const cwd = process.cwd();
const platform = process.platform;
let arch = process.arch;

// Allow arch override via CLI arg
const cliArch = process.argv.slice(2).find((a) => a.startsWith("--"));
if (cliArch) arch = cliArch.replace("--", "");

// ==================== mihomo binary ====================

const MIHOMO_VERSION_URL =
  "https://github.com/MetaCubeX/mihomo/releases/latest/download/version.txt";
const MIHOMO_URL_PREFIX =
  "https://github.com/MetaCubeX/mihomo/releases/download";

const MIHOMO_MAP = {
  "win32-x64": "mihomo-windows-amd64-compatible",
  "win32-ia32": "mihomo-windows-386",
  "win32-arm64": "mihomo-windows-arm64",
  "darwin-x64": "mihomo-darwin-amd64-compatible",
  "darwin-arm64": "mihomo-darwin-arm64",
  "linux-x64": "mihomo-linux-amd64-compatible",
  "linux-arm64": "mihomo-linux-arm64",
};

// ==================== GeoIP / GeoSite data ====================

const GEO_FILES = [
  {
    name: "country.mmdb",
    url: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/country-lite.mmdb",
  },
  {
    name: "geoip.metadb",
    url: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.metadb",
  },
  {
    name: "geosite.dat",
    url: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",
  },
  {
    name: "geoip.dat",
    url: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat",
  },
];

// ==================== Helpers ====================

const SIDECAR_DIR = path.join(cwd, "src-tauri", "resources", "sidecar");
const FILES_DIR = path.join(cwd, "src-tauri", "resources", "files");
const TEMP_DIR = path.join(cwd, "node_modules", ".prepare-temp");

async function downloadFile(url, dest, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`  Downloading: ${url}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);
      const resp = await fetch(url, {
        headers: { "User-Agent": "clash-kite-prepare" },
        redirect: "follow",
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      const buf = await resp.arrayBuffer();
      fs.writeFileSync(dest, new Uint8Array(buf));
      console.log(
        `  Saved: ${dest} (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`,
      );
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  Retry in 2s... (${err.message})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function getLatestVersion() {
  console.log("[mihomo] Fetching latest version...");
  const resp = await fetch(MIHOMO_VERSION_URL, {
    headers: { "User-Agent": "clash-kite-prepare" },
    redirect: "follow",
  });
  const text = await resp.text();
  const version = text.trim();
  console.log(`[mihomo] Latest version: ${version}`);
  return version;
}

// ==================== Resolve mihomo ====================

async function resolveMihomo() {
  const key = `${platform}-${arch}`;
  const mihomoName = MIHOMO_MAP[key];
  if (!mihomoName) {
    throw new Error(`Unsupported platform: ${key}`);
  }

  const isWin = platform === "win32";
  const targetFile = isWin ? "mihomo.exe" : "mihomo";
  const targetPath = path.join(SIDECAR_DIR, targetFile);

  // Skip if already exists
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1000) {
    console.log(`[mihomo] Binary already exists at ${targetPath}, skipping.`);
    return;
  }

  const version = await getLatestVersion();
  const ext = isWin ? "zip" : "gz";
  const zipName = `${mihomoName}-${version}.${ext}`;
  const downloadURL = `${MIHOMO_URL_PREFIX}/${version}/${zipName}`;

  fs.mkdirSync(SIDECAR_DIR, { recursive: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  const tempZip = path.join(TEMP_DIR, zipName);

  console.log(`[mihomo] Downloading ${key} binary...`);
  await downloadFile(downloadURL, tempZip);

  if (ext === "zip") {
    // Windows: use PowerShell to extract
    const tempExtract = path.join(TEMP_DIR, "mihomo-extract");
    fs.mkdirSync(tempExtract, { recursive: true });
    execSync(
      `powershell -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`,
    );
    // Find the exe inside
    const files = fs.readdirSync(tempExtract);
    const exe = files.find((f) => f.endsWith(".exe"));
    if (!exe) throw new Error("mihomo.exe not found in zip");
    fs.copyFileSync(path.join(tempExtract, exe), targetPath);
    fs.rmSync(tempExtract, { recursive: true });
  } else {
    // macOS/Linux: gunzip
    const tempExe = path.join(TEMP_DIR, "mihomo-temp");
    await pipeline(
      fs.createReadStream(tempZip),
      zlib.createGunzip(),
      fs.createWriteStream(tempExe),
    );
    fs.copyFileSync(tempExe, targetPath);
    fs.rmSync(tempExe);
    // Set executable permission
    execSync(`chmod 755 "${targetPath}"`);
  }

  console.log(`[mihomo] Binary ready: ${targetPath}`);

  // Cleanup temp
  try {
    fs.rmSync(tempZip);
  } catch {}
}

// ==================== Resolve GeoIP files ====================

async function resolveGeoFiles() {
  fs.mkdirSync(FILES_DIR, { recursive: true });

  for (const { name, url } of GEO_FILES) {
    const targetPath = path.join(FILES_DIR, name);
    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 1000) {
      console.log(`[geo] ${name} already exists, skipping.`);
      continue;
    }
    try {
      console.log(`[geo] Downloading ${name}...`);
      await downloadFile(url, targetPath);
    } catch (err) {
      console.error(`[geo] Failed to download ${name}: ${err.message}`);
    }
  }
}

// ==================== Main ====================

async function main() {
  console.log(`\n=== Clash-Kite Prepare (${platform}-${arch}) ===\n`);

  try {
    await resolveMihomo();
  } catch (err) {
    console.error(`[ERROR] mihomo download failed: ${err.message}`);
    console.error(
      "  Please manually download mihomo from https://github.com/MetaCubeX/mihomo/releases",
    );
    console.error(`  and place it in ${SIDECAR_DIR}/`);
  }

  try {
    await resolveGeoFiles();
  } catch (err) {
    console.error(`[ERROR] GeoIP data download failed: ${err.message}`);
    console.error("  The app will still work but GeoIP features may be limited.");
  }

  // Cleanup temp dir
  try {
    fs.rmSync(TEMP_DIR, { recursive: true });
  } catch {}

  console.log("\n=== Prepare complete ===\n");
}

main();
