import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionStatus } from "@notifiable/react-native";
import { linking } from "../test/react-native-stub";

const notifications = vi.hoisted(() => ({
  missing: false,
  getPermissionsAsync: vi.fn<() => Promise<{ status: string }>>(),
  requestPermissionsAsync: vi.fn<() => Promise<{ status: string }>>(),
  getExpoPushTokenAsync: vi.fn<
    (options?: { projectId?: string }) => Promise<{ data: string }>
  >(),
  setNotificationChannelAsync: vi.fn(() => Promise.resolve(null)),
  setNotificationHandler: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({
    remove: () => undefined,
  })),
  getLastNotificationResponseAsync: vi.fn(() => Promise.resolve(null)),
  AndroidImportance: { DEFAULT: 3 },
}));

const constants = vi.hoisted(() => {
  const state: { projectId: string | null } = { projectId: "project-1" };
  return state;
});

vi.mock("expo-notifications", () => {
  if (notifications.missing) {
    throw new Error("expo-notifications is missing");
  }

  return notifications;
});

vi.mock("expo-application", () => ({
  applicationId: "sh.notifiable.example",
}));

vi.mock("expo-constants", () => ({
  default: {
    get easConfig() {
      return constants.projectId === null
        ? null
        : { projectId: constants.projectId };
    },
    expoConfig: null,
  },
}));

describe("createExpoPushPort", () => {
  beforeEach(() => {
    notifications.missing = false;
    notifications.getPermissionsAsync.mockReset();
    notifications.requestPermissionsAsync.mockReset();
    notifications.getExpoPushTokenAsync.mockReset();
    notifications.setNotificationHandler.mockReset();
    constants.projectId = "project-1";
    linking.settingsOpened = 0;
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
        notifications.getExpoPushTokenAsync.mockResolvedValue({
          data: "ExponentPushToken[abc]",
        });
      }

      await expect(push.getPermissionStatus?.()).resolves.toBe(expected);
      await expect(push.requestPermission()).resolves.toBe(expected);
    }

    expect(linking.settingsOpened).toBe(1);
    expect(notifications.requestPermissionsAsync).toHaveBeenCalledWith({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  });

  it("sends the captured Expo token after permission is already granted", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notifications.getExpoPushTokenAsync.mockResolvedValueOnce({
      data: "ExponentPushToken[abc]",
    });
    notifications.getExpoPushTokenAsync.mockRejectedValue(
      new Error("registration replaced"),
    );
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.requestPermission()).resolves.toBe("granted");
    await expect(push.getToken()).resolves.toBe("ExponentPushToken[abc]");
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledOnce();
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-1",
      applicationId: "sh.notifiable.example",
    });
  });

  it("does not report granted when the Expo token is missing", async () => {
    notifications.getPermissionsAsync.mockResolvedValue({ status: "granted" });
    notifications.requestPermissionsAsync.mockResolvedValue({
      status: "granted",
    });
    notifications.getExpoPushTokenAsync.mockRejectedValue(
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

  it("returns the Expo push token", async () => {
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      data: " ExponentPushToken[abc] ",
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort();

    await expect(push.getToken()).resolves.toBe("ExponentPushToken[abc]");
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-1",
      applicationId: "sh.notifiable.example",
    });
    expect(push.allowMissingToken).toBe(true);
    expect(push.provider).toBe("expo");
  });

  it("uses a configured project id when the manifest has none", async () => {
    constants.projectId = null;
    notifications.getExpoPushTokenAsync.mockResolvedValue({
      data: "ExponentPushToken[abc]",
    });
    const { createExpoPushPort } = await import("./push");
    const push = createExpoPushPort("  project-from-config  ");

    await expect(push.getToken()).resolves.toBe("ExponentPushToken[abc]");
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: "project-from-config",
      applicationId: "sh.notifiable.example",
    });
  });

  it("returns null when the token cannot be created", async () => {
    constants.projectId = null;
    notifications.getExpoPushTokenAsync.mockRejectedValue(
      new Error("no project id"),
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
