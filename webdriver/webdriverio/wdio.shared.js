import fs from "fs";
import os from "os";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

const DEFAULT_SUITE = [
  "./test/specs/smoke-navigation.spec.js",
  "./test/specs/home-company-info.spec.js",
  "./test/specs/add-company.spec.js",
  "./test/specs/job-catalog.spec.js",
  "./test/specs/contacts-company.spec.js",
  "./test/specs/finance-pages.spec.js",
  "./test/specs/create-invoice.spec.js",
];

export function createWdioConfig({ autoConfirm = false, specGlobs } = {}) {
  let tauriDriver;
  let exit = false;
  let testDbPath = "";

  const appBinary = () => {
    const base = path.join(
      repoRoot,
      "src-tauri",
      "target",
      "debug",
      "paint-contractor"
    );
    return process.platform === "win32" ? `${base}.exe` : base;
  };

  const tauriDriverBin = () => {
    if (process.env.TAURI_DRIVER) return process.env.TAURI_DRIVER;
    const name =
      process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver";
    return path.join(os.homedir(), ".cargo", "bin", name);
  };

  const nativeDriverPath = () => {
    if (process.env.MSEDGEDRIVER) return process.env.MSEDGEDRIVER;
    if (process.env.WEBKITWEBDRIVER) return process.env.WEBKITWEBDRIVER;
    const winName = "msedgedriver.exe";
    const linuxName = "WebKitWebDriver";
    const file = process.platform === "win32" ? winName : linuxName;
    const candidates = [
      path.join(repoRoot, "webdriver", "drivers", file),
      path.join(repoRoot, file),
      path.join(__dirname, file),
      path.join(os.homedir(), ".cargo", "bin", file),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
    return file;
  };

  const tauriDriverArgs = () => {
    const native = nativeDriverPath();
    return native.includes(path.sep) || native.includes("/")
      ? ["--native-driver", native]
      : [];
  };

  return {
    host: "127.0.0.1",
    port: 4444,
    specs: specGlobs ? [specGlobs] : [DEFAULT_SUITE],
    maxInstances: 1,
    capabilities: [
      {
        maxInstances: 1,
        "tauri:options": {
          application: appBinary(),
        },
      },
    ],
    reporters: ["spec"],
    framework: "mocha",
    mochaOpts: {
      ui: "bdd",
      timeout: 120_000,
    },

    onPrepare: () => {
      const dbDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "paint-contractor-wdio-")
      );
      testDbPath = path.join(dbDir, "app.db");
      process.env.PAINT_CONTRACTOR_DB_PATH = testDbPath;
      console.log("[webdriver] test database:", testDbPath);

      const buildEnv = {
        ...process.env,
        PAINT_CONTRACTOR_DB_PATH: testDbPath,
      };
      if (autoConfirm) {
        buildEnv.VITE_AUTO_CONFIRM = "1";
      }

      const result = spawnSync(
        "npm",
        ["run", "tauri", "build", "--", "--debug", "--no-bundle"],
        {
          cwd: repoRoot,
          stdio: "inherit",
          shell: true,
          env: buildEnv,
        }
      );
      if (result.status !== 0) {
        throw new Error("tauri debug build failed");
      }
      if (!fs.existsSync(appBinary())) {
        throw new Error(`binary missing after build: ${appBinary()}`);
      }
    },

    beforeSession: () => {
      process.env.PAINT_CONTRACTOR_DB_PATH = testDbPath;
      const driver = tauriDriverBin();
      if (!fs.existsSync(driver)) {
        throw new Error(
          `tauri-driver not found at ${driver}. Run: cargo install tauri-driver --locked`
        );
      }
      const cargoBin = path.join(os.homedir(), ".cargo", "bin");
      const pathEnv = process.env.PATH?.includes(cargoBin)
        ? process.env.PATH
        : `${cargoBin}${path.delimiter}${process.env.PATH ?? ""}`;
      tauriDriver = spawn(driver, tauriDriverArgs(), {
        stdio: [null, process.stdout, process.stderr],
        env: {
          ...process.env,
          PATH: pathEnv,
          PAINT_CONTRACTOR_DB_PATH: testDbPath,
        },
      });
      tauriDriver.on("error", (error) => {
        console.error("tauri-driver error:", error);
        process.exit(1);
      });
      tauriDriver.on("exit", (code) => {
        if (!exit) {
          console.error("tauri-driver exited with code:", code);
          process.exit(1);
        }
      });
    },

    afterSession: () => {
      closeTauriDriver();
    },
  };

  function closeTauriDriver() {
    exit = true;
    tauriDriver?.kill();
  }

  function onShutdown(fn) {
    const cleanup = () => {
      try {
        fn();
      } finally {
        process.exit();
      }
    };
    process.on("exit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
    process.on("SIGHUP", cleanup);
    if (process.platform === "win32") {
      process.on("SIGBREAK", cleanup);
    }
  }

  onShutdown(() => {
    closeTauriDriver();
  });
}
