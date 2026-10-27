# @notifiable/expo

Register an Expo app with [Notifiable](https://notifiable.sh): connect with a public key, ask for notification permission, save the native APNs or FCM device token, identify the user, list their inbox, record opens and taps, and track events.

Import only from `@notifiable/expo`. The package owns `expo-notifications` for permission, channels, and taps. There is no `push` prop. Notifiable’s backend sends via FCM and APNs only — this package does **not** use Expo push tokens.

## Install

```bash
npx expo install @notifiable/expo expo-notifications @react-native-async-storage/async-storage
```

Peers: `react` ≥ 18, `react-native` ≥ 0.73, inside an Expo app. AsyncStorage keeps the subscriber between launches. Optional: `expo-device`, `expo-application`, `expo-clipboard` (better development sheet).

Add the config plugin, then create a new development build (plugin changes need a prebuild):

```json
{
  "expo": {
    "plugins": ["@notifiable/expo"],
    "android": {
      "googleServicesFile": "./google-services.json",
      "package": "your.app.package"
    },
    "ios": {
      "bundleIdentifier": "your.app.bundle"
    }
  }
}
```

The plugin applies `expo-notifications` (APNs entitlement) and excludes `@notifiable/react-native` native modules from the Expo build. If `react-native.config.js` already exists, exclude `@notifiable/react-native` yourself.

### Device tokens and credentials

- **Token:** `getDevicePushTokenAsync` — native APNs (iOS) or FCM (Android). `provider` is `"apns"` or `"fcm"`.
- **Android:** Include `google-services.json` so the app can obtain an FCM registration token. Permission alone does not require it; the token does.
- **Sending:** Upload FCM / APNs **server** credentials in the Notifiable dashboard. Do not rely on EAS FCM upload for Notifiable delivery (that path is for Expo’s push service).
- **Builds:** Use a development or production build. Expo Go is not a reliable way to test real device tokens for your app id.

## Integrate

Wrap the app in `NotifiableProvider`. It connects on mount. Permission is asked when you call `requestPermission()`, or when the dashboard requests the prompt.

```tsx
import { NotifiableProvider, useNotifiable } from "@notifiable/expo";

function App() {
  return (
    <NotifiableProvider
      publicKey="ntf_pub_..."
      deepLinks={[
        { path: "/orders", label: "Orders" },
        { path: "/inbox", label: "Inbox" },
      ]}
      onDeepLink={(url) => {
        // Open this route in your navigator.
      }}
    >
      <Home />
    </NotifiableProvider>
  );
}
```

| Prop | Required | Description |
| --- | --- | --- |
| `publicKey` | yes* | Key from the Notifiable dashboard. Development key while building; production key for the store build. |
| `deepLinks` | no | Routes Notifiable can link to: `{ path, label }`. |
| `onDeepLink` | no | Called with a notification url on tap (including cold start). |
| `storage` | no | Custom `{ getItem, setItem, removeItem }`. Defaults to AsyncStorage. |
| `logger` | no | `debug` / `info` / `warn` / `error` callbacks. |
| `client` | no | Existing client from `createNotifiable`. Ignores `publicKey`. |

\*Required unless you pass `client`.

### Deep links (Expo Router)

```tsx
onDeepLink={(url) => {
  const path = new URL(url, "https://notifiable.invalid").pathname;
  router.push(path);
}}
```

### Permission

```tsx
function EnableNotifications() {
  const { requestPermission } = useNotifiable();
  return (
    <Button title="Enable notifications" onPress={() => void requestPermission()} />
  );
}
```

`permission` is `"granted"` only when a native device token is available. After a denial, a later `requestPermission()` opens Settings. An explicit `requestPermission()` that gets OS grant but no device token throws `missing_token`. Connect still succeeds without a token (`not_determined`).

### Notification taps

The provider shows foreground alerts and listens for taps (including the response that launched the app). On tap it reads `data.url` and a delivery id, calls `clickDelivery` when present, then `onDeepLink` when a url is present.

## useNotifiable

Call under `NotifiableProvider`. Throws `missing_provider` outside that tree. Wait until `ready` before identify / inbox / track APIs.

```tsx
const notifiable = useNotifiable();
if (!notifiable.ready) return <Text>Connecting…</Text>;
```

### State

| Field | Meaning |
| --- | --- |
| `ready` | Connect finished and the subscriber was saved. |
| `permission` | `"granted"` only when a device token was returned; else `"denied"` / `"not_determined"`. |
| `subscriber` | Device/person record, or `null` until connect. `provider` is `"apns"` or `"fcm"` after a token is saved. |
| `clientConfig` | Dashboard app record, or `null`. |
| `deepLinks` | Saved routes, or `null`. |
| `devIndicator` / `diagnostics` | Development mark and crash-sharing choices. |
| `error` | Last `NotifiableError`, or `null`. |
| `config` | Options used to create this client (`config.push.provider` is `"apns"` or `"fcm"`). |

### Methods

**`start()`** — Connects. Provider calls this on mount.

**`requestPermission()`** — System prompt, then save. Returns the new permission.

**`identify(input)`** — Attach a signed-in user (`email` and/or `externalId`).

```tsx
await notifiable.identify({
  email: "ada@example.com",
  externalId: "user_123",
  firstName: "Ada",
  lastName: "Lovelace",
});
```

**`inbox(query?)`** — Page of notifications (20 per page). Optional `{ page, opened }`.

**`notification(id)`** / **`openNotification(id)`** / **`clickDelivery(deliveryId)`** — Load, mark opened, record tap.

**`track(name, properties?)`** — Event for the connected subscriber (≤20 keys; string / number / boolean / `null`).

```tsx
await notifiable.track("order.shipped", { order: "1001", express: true });
```

**`setDevIndicator(enabled)`** / **`setDiagnostics(enabled)`** — Development mark and diagnostics. No-ops for a production key.

### createNotifiable

```tsx
import { createNotifiable, NotifiableProvider } from "@notifiable/expo";

const client = createNotifiable({
  publicKey: "ntf_pub_...",
  deepLinks: [{ path: "/orders", label: "Orders" }],
  onDeepLink: (url) => { /* navigate */ },
});
```

Always attaches the Expo push and device ports. Pass the client to `NotifiableProvider` so listeners and `start()` still run.

## Development vs production

| | Development key | Production key |
| --- | --- | --- |
| First launch | Sheet to show/hide the Notifiable mark | No sheet |
| On screen | Draggable mark (bundle id / package check) | Nothing overlaid |
| Notifications | Dashboard sends appear as top toasts while foreground + granted | System / `expo-notifications` displays them |
| Diagnostics | Failed SDK calls can be shared | Nothing sent |

⌘N is not available in Expo builds (the React Native native shortcut module is excluded).

## Errors

| Code | Meaning |
| --- | --- |
| `invalid_config` | Blank public key, or not iOS/Android. |
| `missing_provider` | `useNotifiable()` outside the provider. |
| `invalid_public_key` | Key rejected. |
| `network` | Request failed. |
| `validation_failed` | Rejected value. |
| `subscriber_not_found` | Connect not finished, or subscriber gone. |
| `subscriber_limit` | Project cannot add another subscriber. |
| `rate_limited` | Too many requests. |
| `missing_token` | Granted OS permission but no device token (explicit request throws; connect still saves as `not_determined`). |
| `missing_storage` | No AsyncStorage and no `storage` prop. |
| `not_implemented` | Behavior not available in this SDK. |

## For AI agents

### Rules

1. Import `NotifiableProvider`, `useNotifiable`, `createNotifiable`, and types from `@notifiable/expo` only. Do not import `@notifiable/react-native` in the app.
2. Add the `@notifiable/expo` config plugin. Install `expo-notifications` and AsyncStorage with `npx expo install`.
3. For Android FCM tokens, set `android.googleServicesFile` to `google-services.json`. Put FCM/APNs **server** credentials in the Notifiable dashboard, not EAS push credentials.
4. Mount one `NotifiableProvider` around the navigator. Pass `publicKey`, `deepLinks`, and `onDeepLink`. Never pass a `push` prop or `projectId`.
5. Wait for `ready` before identify / inbox / track APIs. Call `requestPermission()` from a button.
6. Treat `"granted"` as “a native device token was returned.” A system grant with no token stays `"not_determined"`.
7. In `onDeepLink`, navigate with the app’s router. The SDK already records delivery clicks for notification taps.
8. Do not invent hosts, env names, or CORS settings. Use the development key locally and the production key for store builds.

### Integration prompt

Copy this into a coding agent when wiring the SDK into an existing Expo app:

```text
Integrate @notifiable/expo into this Expo project.

1. Run npx expo install @notifiable/expo expo-notifications @react-native-async-storage/async-storage.
2. Add "@notifiable/expo" to expo.plugins in app.json / app.config. For Android, set android.googleServicesFile to google-services.json when FCM tokens are required.
3. Find the root layout (e.g. app/_layout.tsx). Wrap the navigator in NotifiableProvider from @notifiable/expo.
4. Pass publicKey from env (development key for debug, production key for release), deepLinks for main screens, and onDeepLink that navigates with Expo Router or the app’s navigator.
5. Do not pass a push prop or projectId. Do not import @notifiable/react-native. Do not use Expo push tokens — the SDK registers native APNs/FCM device tokens.
6. After sign-in, when ready is true, call identify({ email, externalId }).
7. Add an “Enable notifications” control that calls requestPermission().
8. If there is an inbox UI, use inbox(), openNotification(id), and clickDelivery(deliveryId) for custom list interactions. Notification taps are already handled by the provider.
9. Remind that a new development build / prebuild is needed after adding the plugin, and that Notifiable needs FCM/APNs server credentials in the dashboard. Keep changes minimal and match existing patterns.
```
