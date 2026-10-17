import React, { useEffect, useMemo, type ReactNode } from "react";
import {
  NotifiableError,
  NotifiableProvider as NativeProvider,
  type NotifiableClient,
  type NotifiableProviderProps as NativeProviderProps,
} from "@notifiable/react-native";
import { createNotifiable } from "./create-notifiable";
import { subscribeToNotificationResponses } from "./notification-response";
import { installNotificationHandler } from "./push";

export type NotifiableProviderProps = Omit<NativeProviderProps, "push"> & {
  readonly projectId?: string;
};

export function NotifiableProvider({
  children,
  client,
  publicKey,
  projectId,
  logger,
  storage,
  device,
  deepLinks,
  onDeepLink,
}: NotifiableProviderProps): React.JSX.Element {
  const resolved = useMemo(() => {
    if (client !== undefined) {
      return client;
    }

    const key = publicKey?.trim() ?? "";

    if (key.length === 0) {
      throw new NotifiableError({
        code: "invalid_config",
        message: "NotifiableProvider requires a client or publicKey.",
      });
    }

    return createNotifiable({
      publicKey: key,
      ...(projectId !== undefined ? { projectId } : {}),
      ...(logger !== undefined ? { logger } : {}),
      ...(storage !== undefined ? { storage } : {}),
      ...(device !== undefined ? { device } : {}),
      ...(deepLinks !== undefined ? { deepLinks } : {}),
      ...(onDeepLink !== undefined ? { onDeepLink } : {}),
    });
  }, [
    client,
    publicKey,
    projectId,
    logger,
    storage,
    device,
    deepLinks,
    onDeepLink,
  ]);

  return (
    <NativeProvider client={resolved}>
      <NotificationBridge client={resolved}>{children}</NotificationBridge>
    </NativeProvider>
  );
}

function NotificationBridge({
  client,
  children,
}: {
  readonly client: NotifiableClient;
  readonly children: ReactNode;
}): React.JSX.Element {
  useEffect(() => {
    void installNotificationHandler();

    return subscribeToNotificationResponses(client);
  }, [client]);

  return <>{children}</>;
}
