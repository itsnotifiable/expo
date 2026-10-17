import path from "node:path";
import { defineConfig } from "vitest/config";

const root = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@notifiable/react-native": path.resolve(root, "../react-native/src/index.ts"),
      "react-native": path.resolve(root, "test/react-native-stub.ts"),
    },
  },
});
