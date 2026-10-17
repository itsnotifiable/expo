import { describe, expect, it, vi } from "vitest";
import { createNotifiable } from "./create-notifiable";

vi.mock("expo-device", () => ({
  modelName: "iPhone17,1",
  manufacturer: "Apple",
  osVersion: "18.0",
}));

vi.mock("expo-application", () => ({
  nativeApplicationVersion: "1.4.0",
  applicationId: "sh.notifiable.example",
}));

vi.mock("expo-clipboard", () => ({
  setStringAsync: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("expo-notifications", () => ({
  getPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  requestPermissionsAsync: () => Promise.resolve({ status: "granted" }),
  getExpoPushTokenAsync: () => Promise.reject(new Error("no token")),
  setNotificationChannelAsync: () => Promise.resolve(null),
  setNotificationHandler: () => undefined,
  addNotificationResponseReceivedListener: () => ({
    remove: () => undefined,
  }),
  getLastNotificationResponseAsync: () => Promise.resolve(null),
  AndroidImportance: { DEFAULT: 3 },
}));

vi.mock("expo-constants", () => ({
  default: { easConfig: null, expoConfig: null },
}));

describe("createNotifiable", () => {
  it("connects when the Expo token cannot be created", async () => {
    const saves: unknown[] = [];
    vi.stubGlobal("fetch", (url: string, init?: { body?: string }) => {
      if (url.endsWith("/v1/sdk/client-config")) {
        return Promise.resolve(envelope({ environment: "development" }));
      }

      if (init?.body !== undefined) {
        saves.push(JSON.parse(init.body));
      }

      return Promise.resolve(
        envelope({
          id: "sub_1",
          environment: "development",
          platform: "ios",
          permission: "granted",
          prompt_permission: false,
          sdk: "react-native",
          provider: null,
          device_id: "device",
          anonymous_id: "anon",
        }),
      );
    });

    try {
      const client = createNotifiable({
        publicKey: " ntf_pub_test ",
        storage: {
          getItem: () => Promise.resolve(null),
          setItem: () => Promise.resolve(),
          removeItem: () => Promise.resolve(),
        },
      });

      await client.start();

      expect(client.getSnapshot()).toMatchObject({
        ready: true,
        permission: "not_determined",
        error: null,
        subscriber: { id: "sub_1" },
      });
      expect(saves[0]).toMatchObject({
        permission: "not_determined",
        platform: "ios",
        device_model: "iPhone17,1",
        app_version: "1.4.0",
      });
      expect(saves[0]).not.toHaveProperty("token");
      expect(saves[0]).not.toHaveProperty("provider");
      await expect(client.config.device?.getApplicationId?.()).resolves.toBe(
        "sh.notifiable.example",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

function envelope(data: unknown): {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: "success", data }),
  };
}
