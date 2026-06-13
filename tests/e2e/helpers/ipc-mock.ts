import { expect } from "@playwright/test";
export const INSTALL_DIALOG_HANDLERS_SCRIPT = `
  (() => {
    const w = window;
    const wait = setInterval(() => {
      if (w.__installMockHandler__) {
        w.__installMockHandler__("plugin:dialog|message", async () => "Yes");
        w.__installMockHandler__("plugin:dialog|ask", async () => true);
        w.__installMockHandler__("plugin:dialog|confirm", async () => true);
        clearInterval(wait);
      }
    }, 25);
  })();
`;

/** Assert a value read from the page eventually matches (replaces fixed sleeps). */
export async function expectEventually<T>(
  getValue: () => Promise<T>,
  expected: T,
  timeout = 5_000
): Promise<void> {
  await expect(async () => {
    expect(await getValue()).toBe(expected);
  }).toPass({ timeout });
}

export type DialogAnswer = "No" | "Yes" | "sequence";

/** Hijack invoke before React loads for company delete + confirm dialog flows. */
export function installCompanyDeleteMocks(
  seedCompany: Record<string, unknown>,
  dialogAnswer: DialogAnswer
): string {
  return `
    (() => {
      const SEED = ${JSON.stringify(seedCompany)};
      let dialogCalls = 0;
      let real = null;
      Object.defineProperty(window, "__TAURI_INTERNALS__", {
        configurable: true,
        set(v) {
          real = v;
          const wrapped = {
            ...v,
            invoke: async (cmd, args) => {
              if (cmd === "get_all_companies") return [SEED];
              if (cmd === "get_next_company_id") return 1006;
              if (cmd === "delete_company") {
                window.__deleted = true;
                return { success: true, message: "ok" };
              }
              if (cmd === "plugin:dialog|message") {
                if (${JSON.stringify(dialogAnswer)} === "sequence") {
                  dialogCalls++;
                  return dialogCalls === 1 ? "No" : "Yes";
                }
                return ${JSON.stringify(dialogAnswer)};
              }
              return real.invoke(cmd, args);
            },
          };
          Object.defineProperty(window, "__TAURI_INTERNALS__", {
            value: wrapped,
            configurable: true,
            writable: true,
          });
        },
      });
    })();
  `;
}
