import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NotifiableClient } from "@notifiable/react-native";
import {
  openNotificationResponse,
  parseNotificationResponse,
  subscribeToNotificationResponses,
} from "./notification-response";

const notifications = vi.hoisted(() => {
  const state: {
    missing: boolean;
    listener: ((response: unknown) => void) | null;
    last: unknown;
    addNotificationResponseReceivedListener: ReturnType<
      typeof vi.fn<(listener: (response: unknown) => void) => { remove: () => void }>
    >;
    getLastNotificationResponseAsync: ReturnType<
      typeof vi.fn<() => Promise<unknown>>
    >;
  } = {
    missing: false,
    listener: null,
    last: null,
    addNotificationResponseReceivedListener: vi.fn((listener) => {
      state.listener = listener;
      return { remove: () => undefined };
    }),
    getLastNotificationResponseAsync: vi.fn(() => Promise.resolve(state.last)),
  };

  return state;
});

vi.mock("expo-notifications", () => {
  if (notifications.missing) {
    throw new Error("expo-notifications is missing");
  }

  return {
    addNotificationResponseReceivedListener:
      notifications.addNotificationResponseReceivedListener,
    getLastNotificationResponseAsync:
      notifications.getLastNotificationResponseAsync,
  };
});

function client(
  onDeepLink?: (url: string) => void,
): NotifiableClient & { readonly clicks: string[] } {
  const clicks: string[] = [];

  return {
    clicks,
    config: {
      publicKey: "ntf_pub_test",
      ...(onDeepLink !== undefined ? { onDeepLink } : {}),
    },
    clickDelivery: (deliveryId: string) => {
      clicks.push(deliveryId);
      return Promise.resolve();
    },
  } as NotifiableClient & { readonly clicks: string[] };
}

describe("notification responses", () => {
  beforeEach(() => {
    notifications.missing = false;
    notifications.listener = null;
    notifications.last = null;
    notifications.addNotificationResponseReceivedListener.mockClear();
    notifications.getLastNotificationResponseAsync.mockClear();
  });

  it("reads the url, delivery id, and opt parameter", () => {
    expect(
      parseNotificationResponse({
        notification: {
          request: {
            identifier: "req-1",
            content: {
              data: {
                url: "https://shop.example/orders?opt=delivery_9",
              },
            },
          },
        },
      }),
    ).toEqual({
      key: "req-1",
      url: "https://shop.example/orders?opt=delivery_9",
      deliveryId: "delivery_9",
    });

    expect(
      parseNotificationResponse({
        notification: {
          request: {
            content: {
              data: { url: "/inbox", delivery_id: "delivery_2" },
            },
          },
        },
      })?.deliveryId,
    ).toBe("delivery_2");
  });

  it("records the click and opens the route once", () => {
    const opened: string[] = [];
    const current = client((url) => {
      opened.push(url);
    });
    const response = {
      notification: {
        request: {
          identifier: "req-1",
          content: {
            data: { url: "/orders", delivery_id: "delivery_1" },
          },
        },
      },
    };
    const seen = new Set<string>();

    openNotificationResponse(current, response, seen);
    openNotificationResponse(current, response, seen);

    expect(current.clicks).toEqual(["delivery_1"]);
    expect(opened).toEqual(["/orders"]);
  });

  it("ignores a listener that throws", () => {
    const current = client(() => {
      throw new Error("navigation failed");
    });

    expect(() => {
      openNotificationResponse(current, {
        notification: {
          request: {
            content: { data: { url: "/orders", delivery_id: "delivery_1" } },
          },
        },
      });
    }).not.toThrow();
  });

  it("subscribes after expo-notifications loads and ignores a missing module", async () => {
    const current = client();
    const stop = subscribeToNotificationResponses(current);

    await vi.waitFor(() => {
      expect(notifications.listener).not.toBeNull();
    });
    notifications.listener?.({
      notification: {
        request: {
          identifier: "live",
          content: { data: { delivery_id: "delivery_3" } },
        },
      },
    });
    expect(current.clicks).toEqual(["delivery_3"]);
    stop();

    notifications.missing = true;
    vi.resetModules();
    const reloaded = await import("./notification-response");
    expect(() => {
      reloaded.subscribeToNotificationResponses(current)();
    }).not.toThrow();
  });
});
