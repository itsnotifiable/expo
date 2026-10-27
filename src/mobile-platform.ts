import { Platform } from "react-native";

export type MobilePlatform = "ios" | "android";

export function mobilePlatform(): MobilePlatform {
  return Platform.OS === "ios" ? "ios" : "android";
}

export function pushProviderForDevice(): "apns" | "fcm" {
  return mobilePlatform() === "ios" ? "apns" : "fcm";
}
