/**
 * Tauri plugin integration tests.
 *
 * These exercise the real `@tauri-apps/plugin-dialog` package against our
 * mocked IPC layer. The plugin internally calls
 * `invoke('plugin:dialog|<cmd>', payload)` -- the harness records those calls
 * and returns scripted responses, so we can verify that our app code talks to
 * the plugin correctly without launching a real Tauri runtime.
 */
import { ask, confirm, message, open, save } from "@tauri-apps/plugin-dialog";
import { describe, expect, it } from "vitest";
import { confirmDelete } from "../../src/utils/confirm";
import { getInvokeCallsFor, mockInvoke } from "../helpers/tauri-mock";

describe("plugin-dialog confirm/ask/message", () => {
  it("confirmDelete invokes plugin:dialog|message with the warning payload", async () => {
    mockInvoke("plugin:dialog|message", async (args) => {
      expect(args).toMatchObject({
        message: "Are you sure?",
        title: "Confirm delete",
        kind: "warning",
      });
      // The plugin serializes custom labels as OkCancelCustom: [okLabel, cancelLabel].
      expect((args as { buttons: unknown }).buttons).toBeDefined();
      return "Yes";
    });

    expect(await confirmDelete()).toBe(true);
  });

  it("confirmDelete returns false when the user cancels", async () => {
    mockInvoke("plugin:dialog|message", async () => "No");
    expect(await confirmDelete()).toBe(false);
  });

  it("plugin-dialog confirm() returns true when okLabel matches", async () => {
    mockInvoke("plugin:dialog|message", async () => "Ok");
    expect(await confirm("Really?")).toBe(true);
    expect(getInvokeCallsFor("plugin:dialog|message")).toHaveLength(1);
  });

  it("plugin-dialog ask() forwards title and message", async () => {
    mockInvoke("plugin:dialog|message", async (args) => {
      expect(args).toMatchObject({ message: "Continue?", title: "Hello" });
      return "Yes";
    });
    expect(await ask("Continue?", { title: "Hello" })).toBe(true);
  });

  it("plugin-dialog message() routes through plugin:dialog|message", async () => {
    mockInvoke("plugin:dialog|message", async () => null);
    await message("Saved.");
    expect(getInvokeCallsFor("plugin:dialog|message")).toHaveLength(1);
  });
});

describe("plugin-dialog open/save (file dialogs)", () => {
  it("save returns the chosen path", async () => {
    mockInvoke("plugin:dialog|save", async () => "C:/tmp/out.xlsx");
    const path = await save({
      title: "Save",
      defaultPath: "out.xlsx",
      filters: [{ name: "Excel", extensions: ["xlsx"] }],
    });
    expect(path).toBe("C:/tmp/out.xlsx");
    const calls = getInvokeCallsFor("plugin:dialog|save");
    expect(calls[0]).toMatchObject({
      options: expect.objectContaining({
        title: "Save",
        defaultPath: "out.xlsx",
      }),
    });
  });

  it("save returns null when cancelled", async () => {
    mockInvoke("plugin:dialog|save", async () => null);
    expect(await save({ title: "Save" })).toBeNull();
  });

  it("open returns the selected file path", async () => {
    mockInvoke("plugin:dialog|open", async () => "C:/imports/data.csv");
    const result = await open({ multiple: false });
    expect(result).toBe("C:/imports/data.csv");
  });
});
