import {
  NotifiableError,
  createNotifiable as createNativeNotifiable,
  type NotifiableClient,
  type NotifiableConfig,
} from "@notifiable/react-native";
import { createExpoDevicePort } from "./device";
import { createExpoPushPort } from "./push";

export type ExpoNotifiableConfig = Omit<NotifiableConfig, "push"> & {
  /**
   * EAS project id sent to Expo when creating the push token. A development
   * build keeps the id from the native manifest, which stays empty until the
   * next prebuild. Pass the id from `extra.eas.projectId` so the token can be
   * created without rebuilding.
   */
  readonly projectId?: string;
};

export function createNotifiable(
  config: ExpoNotifiableConfig,
): NotifiableClient {
  const publicKey = config.publicKey.trim();
  const projectId = config.projectId?.trim() ?? "";

  if (publicKey.length === 0) {
    throw new NotifiableError({
      code: "invalid_config",
      message: "publicKey is required",
    });
  }

  return createNativeNotifiable({
    publicKey,
    push: createExpoPushPort(projectId.length > 0 ? projectId : undefined),
    device: config.device ?? createExpoDevicePort(),
    ...(config.logger !== undefined ? { logger: config.logger } : {}),
    ...(config.storage !== undefined ? { storage: config.storage } : {}),
    ...(config.deepLinks !== undefined ? { deepLinks: config.deepLinks } : {}),
    ...(config.onDeepLink !== undefined
      ? { onDeepLink: config.onDeepLink }
      : {}),
  });
}
