import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionStatus } from "@notifiable/react-native";
import { linking, Platform } from "../test/react-native-stub";

const notifications = vi.hoisted(() => ({
  missing: false,
  getPermissionsAsync: vi.fn<
    () => Promise<{ status: string; canAskAgain?: boolean }>
  >(),
  requestPermissionsAsync: vi.fn<() => Promise<{ status: string }>>(),
  getDevicePushTokenAsync: vi.fn<() => Promise<{ data: string; type?: string }>>(),
  setNotificationChannelAsync: vi.fn(() => Promise.resolve(null)),
  setNotificationHandler: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({
    remove: () => undefined,
  })),
  getLastNotificationResponseAsync: vi.fn(() => Promise.resolve(null)),
  AndroidImportance: { DEFAULT: 3 },
}));

vi.mock("expo-notifications", () => {
  if (notifications.missing) {
    throw new Error("expo-notifications is missing");
  }

  return notifications;
});

vi.mock("expo-application", () => ({
  applicationId: "sh.notifiable.example",
}));

describe("createExpoPushPort", () => {
  beforeEach(async () => {
    notifications.missing = false;
    notifications.getPermissionsAsync.mockReset();
    notifications.requestPermissionsAsync.mockReset();
    notifications.getDevicePushTokenAsync.mockReset();
    notifications.setNotificationChannelAsync.mockReset();
    notifications.setNotificationChannelAsync.mockResolvedValue(null);
    notifications.setNotificationHandler.mockReset();
    linking.settingsOpened = 0;
    linking.lastIntent = null;
    linking.lastIntentExtras = null;
    Platform.OS = "ios";
    const loaded = await import("./push");
    while (loaded.takePendingSettingsRecheck()) {
      // Drain any leftover Settings recheck flag from a prior test.
    }
  });

  afterEach(() => {
    Platform.OS = "ios";
  });

  it("maps Expo permission statuses", async () => {
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();
    const cases: readonly [string, PermissionStatus][] = [
      ["granted", "granted"],
      ["denied", "denied"],
      ["undetermined", "not_determined"],
    ];

    for (const [status, expected] of cases) {
      notifications.getPermissionsAsync.mockResolvedValue({ status });
      notifications.requestPermissionsAsync.mockResolvedValue({ status });

      if (status === "granted") {
        notifications.getDevicePushTokenAsync.mockResolvedValue({
          data: "apns-device-token",
          type: "ios",
        });
      }

      await expect(push.getPermissionStatus?.()).resolves.toBe(expected);
      await expect(push.requestPermission()).resolves.toBe(expected);
    }

    expect(linking.settingsOpened).toBe(0);
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledWith({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  });

  it("opens Settings only when denied and canAskAgain is false", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      status: "denied",
      canAskAgain: false,
    });
    const { createExpoPushPort, takePendingSettingsRecheck } =
      await import("./push");
    const push = createExpoPushPort();

    await expect(push.requestPermission()).resolves.toBe("denied");
    expect(linking.settingsOpened).toBe(1);
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(takePendingSettingsRecheck()).toBe(true);
    expect(takePendingSettingsRecheck()).toBe(false);
  });

  it("opens Android app notification settings on permanent deny", async () => {
    Platform.OS = "android";
    linking.lastIntent = null;
    linking.lastIntentExtras = null;
    notifications.getPermissionsAsync.mockResolvedValue({
      status: "denied",
      canAskAgain: false,
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.requestPermission()).resolves.toBe("denied");
    expect(linking.lastIntent).toBe(
      "android.settings.APP_NOTIFICATION_SETTINGS",
    );
    expect(linking.lastIntentExtras).toEqual([
      {
        key: "android.provider.extra.APP_PACKAGE",
        value: "sh.notifiable.example",
      },
    ]);
  });

  it("requests permission when denied but canAskAgain is true", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({
      status: "denied",
      canAskAgain: true,
    });
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: "denied",
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.requestPermission()).resolves.toBe("denied");
    expect(linking.settingsOpened).toBe(0);
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledOnce();
  });

  it("creates the Android channel before reading or requesting permission", async () => {
    Platform.OS = "android";
    const order: string[] = [];
    notifications.setNotificationChannelAsync.mockImplementation(() => {
      order.push("channel");
      return Promise.resolve(null);
    });
    notifications.getPermissionsAsync.mockImplementation(() => {
      order.push("getPermissions");
      return Promise.resolve({ status: "undetermined" });
    });
    notifications.requestPermissionsAsync.mockImplementation(() => {
      order.push("requestPermissions");
      return Promise.resolve({ status: "denied" });
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getPermissionStatus?.()).resolves.toBe("not_determined");
    expect(order).toEqual(["channel", "getPermissions"]);

    order.length = 0;
    await expect(push.requestPermission()).resolves.toBe("denied");
    expect(order).toEqual([
      "channel",
      "getPermissions",
      "requestPermissions",
    ]);
    expect(notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "default",
      {
        name: "Default",
        importance: notifications.AndroidImportance.DEFAULT,
      },
    );
  });

  it("sends the captured device token after permission is already granted", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notifications.getDevicePushTokenAsync.mockResolvedValueOnce({
      data: "apns-device-token",
      type: "ios",
    });
    notifications.getDevicePushTokenAsync.mockRejectedValue(
      new Error("registration replaced"),
    );
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.requestPermission()).resolves.toBe("granted");
    await expect(push.getToken()).resolves.toBe("apns-device-token");
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.getDevicePushTokenAsync).toHaveBeenCalledOnce();
  });

  it("does not report granted when the device token is missing", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    notifications.getDevicePushTokenAsync.mockRejectedValue(
      new Error("no token"),
    );
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getPermissionStatus?.()).resolves.toBe("not_determined");
    await expect(push.requestPermission()).rejects.toMatchObject({
      code: "missing_token",
      message: "no token",
    });
    await expect(push.getToken()).resolves.toBeNull();
  });

  it("returns not_determined when permission cannot be read", async () => {
    notifications.getPermissionsAsync.mockRejectedValue(new Error("unavailable"));
    notifications.requestPermissionsAsync.mockRejectedValue(
      new Error("unavailable"),
    );
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getPermissionStatus?.()).resolves.toBe("not_determined");
    await expect(push.requestPermission()).resolves.toBe("not_determined");
  });

  it("returns the native device push token with an apns provider on iOS", async () => {
    Platform.OS = "ios";
    notifications.getDevicePushTokenAsync.mockResolvedValue({
      data: " apns-device-token ",
      type: "ios",
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getToken()).resolves.toBe("apns-device-token");
    expect(notifications.getDevicePushTokenAsync).toHaveBeenCalledOnce();
    expect(push.allowMissingToken).toBe(true);
    expect(push.provider).toBe("apns");
  });

  it("uses an fcm provider on Android", async () => {
    Platform.OS = "android";
    notifications.getDevicePushTokenAsync.mockResolvedValue({
      data: "fcm-device-token",
      type: "android",
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getToken()).resolves.toBe("fcm-device-token");
    expect(push.provider).toBe("fcm");
  });

  it("returns null when the token cannot be created", async () => {
    notifications.getDevicePushTokenAsync.mockRejectedValue(
      new Error("Firebase not configured"),
    );
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getToken()).resolves.toBeNull();
  });

  it("returns not_determined when expo-notifications is missing", async () => {
    notifications.missing = true;
    vi.resetModules();
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getPermissionStatus?.()).resolves.toBe("not_determined");
    await expect(push.getToken()).resolves.toBeNull();
  });

  it("installs the foreground handler once", async () => {
    vi.resetModules();
    notifications.missing = false;
    const { installNotificationHandler } = await import("./push");

    await installNotificationHandler();
    await installNotificationHandler();

    expect(notifications.setNotificationHandler).toHaveBeenCalledOnce();
  });
});
