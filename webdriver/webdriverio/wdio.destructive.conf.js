import { createWdioConfig } from "./wdio.shared.js";

export const config = createWdioConfig({
  autoConfirm: true,
  specGlobs: ["./test/specs/destructive/company-delete.spec.js"],
});
