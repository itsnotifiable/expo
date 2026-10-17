import {
  NotifiableError,
  type PermissionStatus,
  type PushPort,
} from "@notifiable/react-native";
import { Linking, Platform } from "react-native";

const foregroundBehavior = {
  shouldShowAlert: true,
  shouldPlaySound: true,
  shouldSetBadge: true,
  shouldShowBanner: true,
  shouldShowList: true,
} as const;

const permissionRequest = {
  ios: {
    allowAlert: true,
    allowBadge: true,
    allowSound: true,
  },
} as const;

interface TokenStore {
  cachedToken: string | null;
  lastTokenError: unknown;
}

interface ExpoNotifications {
  getPermissionsAsync: () => Promise<{
    readonly status: string;
    readonly canAskAgain?: boolean;
  }>;
  requestPermissionsAsync: (permissions?: {
    readonly ios?: {
      readonly allowAlert?: boolean;
      readonly allowBadge?: boolean;
      readonly allowSound?: boolean;
    };
  }) => Promise<{ readonly status: string }>;
  getExpoPushTokenAsync: (options?: {
    readonly projectId?: string;
    readonly applicationId?: string;
  }) => Promise<{ readonly data: string }>;
  setNotificationChannelAsync: (
    channelId: string,
    channel: { readonly name: string; readonly importance: number },
  ) => Promise<unknown>;
  readonly AndroidImportance: { readonly DEFAULT: number };
}

let handlerInstalled = false;

export function createExpoPushPort(projectId?: string): PushPort {
  const store: TokenStore = { cachedToken: null, lastTokenError: null };
  const configuredProjectId = text(projectId);

  return {
    provider: "expo",
    allowMissingToken: true,
    getPermissionStatus: () =>
      readPermission(false, store, configuredProjectId),
    requestPermission: () => readPermission(true, store, configuredProjectId),
    getToken: () => readToken(false, store, configuredProjectId),
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

async function readPermission(
  request: boolean,
  store: TokenStore,
  configuredProjectId: string | null,
): Promise<PermissionStatus> {
  try {
    const notifications = await import("expo-notifications");
    const current = await notifications.getPermissionsAsync();
    const currentStatus = mapStatus(current.status);

    // iOS and Android show the system prompt once. A later tap cannot ask
    // again after a denial, so open Settings instead of a no-op request.
    if (request && currentStatus === "denied") {
      await openNotificationSettings();
      return "denied";
    }

    const result =
      request && currentStatus !== "granted"
        ? await notifications.requestPermissionsAsync(permissionRequest)
        : current;
    const status = mapStatus(result.status);

    if (status !== "granted") {
      return status;
    }

    const token = await readToken(true, store, configuredProjectId);

    if (token !== null) {
      return "granted";
    }

    // Startup still connects when Expo Go or a simulator has no token.
    // An explicit request surfaces the failure instead of looking idle.
    if (request) {
      throw new NotifiableError({
        code: "missing_token",
        message: tokenFailureMessage(store),
      });
    }

    return "not_determined";
  } catch (error) {
    if (error instanceof NotifiableError) {
      throw error;
    }

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

async function readToken(
  refresh: boolean,
  store: TokenStore,
  configuredProjectId: string | null,
): Promise<string | null> {
  if (!refresh && store.cachedToken !== null) {
    return store.cachedToken;
  }

  try {
    const notifications = await import("expo-notifications");
    await prepareAndroidChannel(notifications);
    const projectId = await readProjectId(configuredProjectId);
    const applicationId = await readApplicationId();
    const value = await fetchExpoToken(
      notifications,
      projectId,
      applicationId,
      store,
    );

    if (value !== null) {
      store.cachedToken = value;
      store.lastTokenError = null;
      return value;
    }
  } catch (error) {
    store.lastTokenError = error;
  }

  return store.cachedToken;
}

async function fetchExpoToken(
  notifications: Pick<ExpoNotifications, "getExpoPushTokenAsync">,
  projectId: string | null,
  applicationId: string | null,
  store: TokenStore,
): Promise<string | null> {
  const options = {
    ...(projectId !== null ? { projectId } : {}),
    ...(applicationId !== null ? { applicationId } : {}),
  };
  let attempt = 0;

  while (attempt < 3) {
    try {
      const token = await notifications.getExpoPushTokenAsync(options);
      const value = token.data.trim();

      return value.length > 0 ? value : null;
    } catch (error) {
      store.lastTokenError = error;
      attempt += 1;

      if (attempt >= 3 || !shouldRetry(error)) {
        return null;
      }

      await pause(retryDelay(attempt));
    }
  }

  return null;
}

function shouldRetry(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";

  return !message.includes("projectId") && !message.includes("applicationId");
}

function retryDelay(attempt: number): number {
  if (process.env.VITEST === "true") {
    return 0;
  }

  return attempt * 400;
}

function pause(ms: number): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function tokenFailureMessage(store: TokenStore): string {
  if (store.lastTokenError instanceof Error) {
    const message = store.lastTokenError.message.trim();

    if (message.length > 0) {
      return message;
    }
  }

  return "Push permission is granted, but no Expo push token was returned.";
}

async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    return;
  }
}

async function prepareAndroidChannel(
  notifications: Pick<
    ExpoNotifications,
    "setNotificationChannelAsync" | "AndroidImportance"
  >,
): Promise<void> {
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

async function readProjectId(
  configuredProjectId: string | null,
): Promise<string | null> {
  if (configuredProjectId !== null) {
    return configuredProjectId;
  }

  try {
    const constants = await import("expo-constants");
    const source = constantsSource(constants);
    const fromEas = text(source.easConfig?.projectId);
    const fromExtra = text(source.expoConfig?.extra?.eas?.projectId);
    const fromManifest = text(source.manifest?.extra?.eas?.projectId);
    const fromManifest2 = text(source.manifest2?.extra?.eas?.projectId);
    const fromClient = text(
      source.manifest2?.extra?.expoClient?.extra?.eas?.projectId,
    );

    return fromEas ?? fromExtra ?? fromManifest ?? fromManifest2 ?? fromClient;
  } catch {
    return null;
  }
}

function constantsSource(
  mod: { readonly default?: ConstantsShape } & ConstantsShape,
): ConstantsShape {
  if (mod.default !== undefined) {
    return mod.default;
  }

  return mod;
}

interface ConstantsShape {
  readonly easConfig?: { readonly projectId?: string } | null;
  readonly expoConfig?: {
    readonly extra?: {
      readonly eas?: { readonly projectId?: string };
    };
  } | null;
  readonly manifest?: {
    readonly extra?: {
      readonly eas?: { readonly projectId?: string };
    };
  } | null;
  readonly manifest2?: {
    readonly extra?: {
      readonly eas?: { readonly projectId?: string };
      readonly expoClient?: {
        readonly extra?: {
          readonly eas?: { readonly projectId?: string };
        };
      };
    };
  } | null;
}

async function readApplicationId(): Promise<string | null> {
  try {
    const application = await import("expo-application");

    return text(application.applicationId ?? undefined);
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
