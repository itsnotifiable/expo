import {
  NotifiableError,
  createNotifiable as createNativeNotifiable,
  type NotifiableClient,
  type NotifiableConfig,
} from "@notifiable/react-native";
import { createExpoDevicePort } from "./device";
import { createExpoPushPort } from "./push";

export type ExpoNotifiableConfig = Omit<NotifiableConfig, "push">;

export function createNotifiable(
  config: ExpoNotifiableConfig,
): NotifiableClient {
  const publicKey = config.publicKey.trim();

  if (publicKey.length === 0) {
    throw new NotifiableError({
      code: "invalid_config",
      message: "publicKey is required",
    });
  }

  return createNativeNotifiable({
    publicKey,
    push: createExpoPushPort(),
    device: config.device ?? createExpoDevicePort(),
    ...(config.logger !== undefined ? { logger: config.logger } : {}),
    ...(config.storage !== undefined ? { storage: config.storage } : {}),
    ...(config.deepLinks !== undefined ? { deepLinks: config.deepLinks } : {}),
    ...(config.onDeepLink !== undefined
      ? { onDeepLink: config.onDeepLink }
      : {}),
  });
}
