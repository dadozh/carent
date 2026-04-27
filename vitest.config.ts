import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  Object.assign(process.env, env);

  return {
    test: {
      environment: "node",
      globals: true,
      exclude: ["dist/**", "node_modules/**"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "server-only": path.resolve(__dirname, "__mocks__/server-only.ts"),
      },
    },
  };
});
