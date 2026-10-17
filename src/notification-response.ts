import type { NotifiableClient } from "@notifiable/react-native";

interface ParsedResponse {
  readonly key: string;
  readonly url: string | null;
  readonly deliveryId: string | null;
}

export function openNotificationResponse(
  client: NotifiableClient,
  response: unknown,
  seen: Set<string> = new Set(),
): void {
  try {
    const parsed = parseNotificationResponse(response);

    if (parsed === null || seen.has(parsed.key)) {
      return;
    }

    seen.add(parsed.key);

    if (parsed.deliveryId !== null) {
      void client.clickDelivery(parsed.deliveryId).catch(() => undefined);
    }

    const openDeepLink = client.config.onDeepLink;

    if (parsed.url !== null && openDeepLink !== undefined) {
      openDeepLink(parsed.url);
    }
  } catch {
    return;
  }
}

export function subscribeToNotificationResponses(
  client: NotifiableClient,
): () => void {
  const state: {
    active: boolean;
    remove: () => void;
    seen: Set<string>;
  } = {
    active: true,
    remove: () => undefined,
    seen: new Set(),
  };

  void loadResponses(client, state);

  return () => {
    state.active = false;
    state.remove();
  };
}

async function loadResponses(
  client: NotifiableClient,
  state: { active: boolean; remove: () => void; seen: Set<string> },
): Promise<void> {
  try {
    const notifications = await import("expo-notifications");

    if (!state.active) {
      return;
    }

    const subscription = notifications.addNotificationResponseReceivedListener(
      (response) => {
        openNotificationResponse(client, response, state.seen);
      },
    );
    state.remove = () => {
      subscription.remove();
    };
    const last = await notifications.getLastNotificationResponseAsync();

    if (isActive(state)) {
      openNotificationResponse(client, last, state.seen);
    }
  } catch {
    return;
  }
}

function isActive(state: { readonly active: boolean }): boolean {
  return state.active;
}

export function parseNotificationResponse(
  response: unknown,
): ParsedResponse | null {
  const content = readPath(response, [
    "notification",
    "request",
    "content",
  ]);
  const data = readRecord(content, "data");
  const url = text(data?.url);
  const deliveryId =
    text(data?.delivery_id) ?? text(data?.deliveryId) ?? deliveryIdFromUrl(url);
  const identifier = text(
    readPath(response, ["notification", "request", "identifier"]),
  );

  if (url === null && deliveryId === null) {
    return null;
  }

  return {
    key: identifier ?? `${url ?? ""}:${deliveryId ?? ""}`,
    url,
    deliveryId,
  };
}

function deliveryIdFromUrl(url: string | null): string | null {
  if (url === null) {
    return null;
  }

  try {
    const opt = new URL(url, "https://notifiable.invalid").searchParams.get(
      "opt",
    );

    return opt !== null && opt.length > 0 ? opt : null;
  } catch {
    return null;
  }
}

function readPath(value: unknown, path: readonly string[]): unknown {
  let current = value;

  for (const key of path) {
    current = readField(current, key);

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

function readRecord(
  value: unknown,
  key: string,
): Record<string, unknown> | null {
  const field = readField(value, key);

  return isRecord(field) ? field : null;
}

function readField(value: unknown, key: string): unknown {
  if (!isRecord(value)) {
    return undefined;
  }

  return value[key];
}

function text(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
