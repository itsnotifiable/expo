import type { PermissionStatus, PushPort } from "@notifiable/react-native";
import { Platform } from "react-native";

const foregroundBehavior = {
  shouldShowAlert: true,
  shouldPlaySound: true,
  shouldSetBadge: true,
  shouldShowBanner: true,
  shouldShowList: true,
} as const;

let handlerInstalled = false;

export function createExpoPushPort(): PushPort {
  return {
    provider: "expo",
    allowMissingToken: true,
    getPermissionStatus: () => readPermission(false),
    requestPermission: () => readPermission(true),
    getToken: readToken,
  };
}

export async function installNotificationHandler(): Promise<void> {
  if (handlerInstalled) {
    return;
  }

  try {
    const notifications = await import("expo-notifications");
    notifications.setNotificationHandler({
      handleNotification: () => Promise.resolve(foregroundBehavior),
    });
    handlerInstalled = true;
  } catch {
    handlerInstalled = false;
  }
}

async function readPermission(request: boolean): Promise<PermissionStatus> {
  try {
    const notifications = await import("expo-notifications");
    const result = request
      ? await notifications.requestPermissionsAsync()
      : await notifications.getPermissionsAsync();

    return mapStatus(result.status);
  } catch {
    return "not_determined";
  }
}

function mapStatus(status: string): PermissionStatus {
  if (status === "granted") {
    return "granted";
  }

  if (status === "denied") {
    return "denied";
  }

  return "not_determined";
}

async function readToken(): Promise<string | null> {
  try {
    const notifications = await import("expo-notifications");
    await prepareAndroidChannel(notifications);
    const projectId = await readProjectId();
    const token = await notifications.getExpoPushTokenAsync(
      projectId === null ? {} : { projectId },
    );
    const value = token.data.trim();

    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

async function prepareAndroidChannel(notifications: {
  setNotificationChannelAsync: (
    channelId: string,
    channel: { readonly name: string; readonly importance: number },
  ) => Promise<unknown>;
  readonly AndroidImportance: { readonly DEFAULT: number };
}): Promise<void> {
  // Read Platform from the static import. import("react-native") enumerates
  // PushNotificationIOS and crashes Expo Go.
  if (Platform.OS !== "android") {
    return;
  }

  try {
    await notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    return;
  }
}

async function readProjectId(): Promise<string | null> {
  try {
    const constants = await import("expo-constants");
    const source = constants.default;
    const fromEas = text(source.easConfig?.projectId);
    const fromExtra = text(source.expoConfig?.extra?.eas?.projectId);

    return fromEas ?? fromExtra;
  } catch {
    return null;
  }
}

function text(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}
