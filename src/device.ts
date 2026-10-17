import { NotifiableError, type DevicePort } from "@notifiable/react-native";
import type { MobilePlatform } from "./mobile-platform";

export function createExpoDevicePort(): DevicePort {
  return {
    async getProfile() {
      const reactNative = await import("react-native");
      const platform = mobilePlatform(reactNative.Platform.OS);
      const version = reactNative.Platform.Version;
      const device = await readDevice();
      const application = await readApplication();
      const options = Intl.DateTimeFormat().resolvedOptions();
      const locale = options.locale;
      const timezone = options.timeZone;

      return {
        platform,
        osVersion: device.osVersion ?? platformVersion(version),
        locale: locale.length > 0 ? locale : null,
        timezone: timezone.length > 0 ? timezone : null,
        model: device.model,
        manufacturer: device.manufacturer,
        appVersion: application.version,
        ip: null,
      };
    },
    getApplicationId: async () => {
      const application = await readApplication();

      return application.id;
    },
    copy(value: string): void {
      const text = value.trim();

      if (text.length === 0) {
        return;
      }

      void import("expo-clipboard")
        .then((clipboard) => {
          if (typeof clipboard.setStringAsync !== "function") {
            return undefined;
          }

          return clipboard.setStringAsync(text);
        })
        .catch(() => undefined);
    },
  };
}

function mobilePlatform(os: string): MobilePlatform {
  if (os === "ios" || os === "android") {
    return os;
  }

  throw new NotifiableError({
    code: "invalid_config",
    message: `Unsupported platform ${os}.`,
  });
}

function platformVersion(version: string | number | undefined): string | null {
  if (typeof version === "string" || typeof version === "number") {
    const text = String(version).trim();

    return text.length > 0 ? text : null;
  }

  return null;
}

async function readDevice(): Promise<{
  readonly model: string | null;
  readonly manufacturer: string | null;
  readonly osVersion: string | null;
}> {
  try {
    const device = await import("expo-device");

    return {
      model: clip(device.modelName, 80),
      manufacturer: clip(device.manufacturer, 80),
      osVersion: clip(device.osVersion, 40),
    };
  } catch {
    return { model: null, manufacturer: null, osVersion: null };
  }
}

async function readApplication(): Promise<{
  readonly version: string | null;
  readonly id: string | null;
}> {
  try {
    const application = await import("expo-application");

    return {
      version: clip(application.nativeApplicationVersion, 40),
      id: clip(application.applicationId, 200),
    };
  } catch {
    return { version: null, id: null };
  }
}

function clip(value: unknown, max: number): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
