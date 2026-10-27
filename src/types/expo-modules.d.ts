declare module "expo-notifications" {
  export interface NotificationPermissions {
    readonly status: string;
    readonly canAskAgain?: boolean;
    readonly granted?: boolean;
  }

  export interface DevicePushToken {
    readonly data: string;
    readonly type?: string;
  }

  export interface NotificationSubscription {
    remove(): void;
  }

  export function getPermissionsAsync(): Promise<NotificationPermissions>;
  export function requestPermissionsAsync(permissions?: {
    readonly ios?: {
      readonly allowAlert?: boolean;
      readonly allowBadge?: boolean;
      readonly allowSound?: boolean;
    };
  }): Promise<NotificationPermissions>;
  export function getDevicePushTokenAsync(): Promise<DevicePushToken>;
  export function setNotificationChannelAsync(
    channelId: string,
    channel: { readonly name: string; readonly importance: number },
  ): Promise<unknown>;
  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      readonly shouldShowAlert: boolean;
      readonly shouldPlaySound: boolean;
      readonly shouldSetBadge: boolean;
      readonly shouldShowBanner: boolean;
      readonly shouldShowList: boolean;
    }>;
  }): void;
  export function addNotificationResponseReceivedListener(
    listener: (response: unknown) => void,
  ): NotificationSubscription;
  export function getLastNotificationResponseAsync(): Promise<unknown>;
  export const AndroidImportance: { readonly DEFAULT: number };
}

declare module "expo-device" {
  export const modelName: string | null;
  export const manufacturer: string | null;
  export const osVersion: string | null;
}

declare module "expo-application" {
  export const nativeApplicationVersion: string | null;
  export const applicationId: string | null;
}

declare module "expo-clipboard" {
  export function setStringAsync(text: string): Promise<boolean>;
}
