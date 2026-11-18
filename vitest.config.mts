import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests (Vitest). Domain classes, validation at business logic lang ang sinusubok;
 * walang tinatawag na totoong Firebase o Cloudinary (fake repositories ang gamit).
 */
export default defineConfig({
  resolve: {
    // Binabasa ang "@/*" → "src/*" mula sa tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // Sadyang nag-e-error ang "server-only" kapag in-import sa labas ng React Server Components.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
