import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const withNotifiable = require("../app.plugin.cjs") as (config: {
  readonly name?: string;
  readonly autolinking?: { readonly exclude?: readonly string[] };
}) => {
  readonly autolinking?: { readonly exclude?: readonly string[] };
};

describe("config plugin", () => {
  it("excludes the React Native native modules", () => {
    const config = withNotifiable({
      name: "Example",
      autolinking: { exclude: ["expo-random"] },
    });

    expect(config.autolinking?.exclude).toEqual([
      "expo-random",
      "@notifiable/react-native",
    ]);
  });

  it("keeps an existing exclusion", () => {
    const config = withNotifiable({
      name: "Example",
      autolinking: { exclude: ["@notifiable/react-native"] },
    });

    expect(config.autolinking?.exclude).toEqual(["@notifiable/react-native"]);
  });

  it("loads from app.plugin.js", () => {
    const loaded = require("../app.plugin.js") as {
      default?: typeof withNotifiable;
    };
    const plugin = loaded.default ?? (loaded as unknown as typeof withNotifiable);

    expect(typeof plugin).toBe("function");
  });
});
