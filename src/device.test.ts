import { describe, expect, it, vi } from "vitest";
import { createExpoDevicePort } from "./device";

vi.mock("expo-device", () => {
  throw new Error("expo-device is missing");
});

vi.mock("expo-application", () => {
  throw new Error("expo-application is missing");
});

vi.mock("expo-clipboard", () => {
  throw new Error("expo-clipboard is missing");
});

describe("createExpoDevicePort", () => {
  it("still builds a profile when Expo device modules are missing", async () => {
    const device = createExpoDevicePort();

    await expect(device.getProfile()).resolves.toMatchObject({
      platform: "ios",
      osVersion: "18.0",
      model: null,
      manufacturer: null,
      appVersion: null,
    });
    await expect(device.getApplicationId?.()).resolves.toBeNull();
    expect(() => {
      device.copy?.("sh.notifiable.example");
    }).not.toThrow();
  });
});
