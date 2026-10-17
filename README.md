# Notifiable - Expo SDK

`@notifiable/expo` registers an Expo app with [Notifiable](https://notifiable.sh), asks for notification permission, and saves the Expo push token. From the same hook you can identify the person using the app, list their inbox, record that they opened or tapped a notification, and send events.

Import from `@notifiable/expo`. The package owns `expo-notifications`. There is no `push` prop.

## Install

```bash
npx expo install @notifiable/expo expo-notifications expo-constants @react-native-async-storage/async-storage
```

The package needs `react` 18 or newer and `react-native` 0.73 or newer, inside an Expo app. AsyncStorage keeps the subscriber on the device between launches. If the app already has another store, pass it as `storage` and skip AsyncStorage.

`expo-device`, `expo-application`, and `expo-clipboard` are optional. When they are installed, the development sheet can read this app's bundle id or package name and copy it. Connect still succeeds when they are missing.

Add the plugin to `app.json`, then create a new development build. A running build does not pick up plugin changes until the next prebuild.

```json
{
  "expo": {
    "plugins": ["@notifiable/expo"],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

The plugin applies `expo-notifications` and keeps `@notifiable/react-native` native modules out of the Expo build. It adds that package to `autolinking.exclude`. When `react-native.config.js` is absent, prebuild writes one that sets the package's iOS and Android platforms to `null`. Leave that file in place if you already have one, and exclude `@notifiable/react-native` yourself.

## Configure

Wrap the app in `NotifiableProvider`. It connects on mount. Permission is asked when you call it from a button, or when the dashboard asks for the prompt.

```tsx
import { NotifiableProvider, useNotifiable } from "@notifiable/expo";

function App() {
  return (
    <NotifiableProvider
      publicKey="ntf_pub_..."
      projectId="your-eas-project-id"
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

| Prop | What you pass |
| --- | --- |
| `publicKey` | The key from the Notifiable dashboard. Required unless you pass `client`. |
| `projectId` | The EAS project id from `extra.eas.projectId`. The SDK sends it to `getExpoPushTokenAsync`. |
| `deepLinks` | Screens Notifiable can link to. Each one is `{ path, label }`. Saved when connect succeeds. |
| `onDeepLink` | Called with a notification url when someone taps a notification or a development preview. |
| `storage` | Your own `getItem` / `setItem` / `removeItem` store. Omit it to use AsyncStorage. |
| `logger` | Optional `debug`, `info`, `warn`, and `error` callbacks. |
| `device` | Optional replacement for the Expo device profile. Omit it. |
| `client` | A client you already built with `createNotifiable`. The provider starts that client and ignores `publicKey` and `projectId`. |
| `children` | The app tree. `useNotifiable()` works anywhere under this provider. |

### Public key

Create the key in the Notifiable dashboard and pass it as `publicKey`. A blank key throws `invalid_config` before the app connects.

Use the **development** key while you build, including on the iOS simulator and the Android emulator. Use the **production** key in the build you ship. The key is what switches the app between those two modes. Keep the two keys in the matching build config and pass the one for the current build.

The same install is remembered on the device. Opening the app again updates that subscriber. Permission can stay denied or undecided. The subscriber still exists.

### Project id

A real Expo push token needs a development or production build and an EAS project id. Expo Go can grant notification permission and still return no token.

Put the id in `extra.eas.projectId`, and pass the same string as `projectId` on `NotifiableProvider`. A development build keeps the id from the native manifest, which stays empty until the next prebuild. The `projectId` prop is what `getExpoPushTokenAsync` uses, so the token can be created without rebuilding after you add the id.

Connect still succeeds when Expo returns no token. The subscriber is saved without `provider` and `token`.

### Deep links

Pass the routes Notifiable may attach to a notification. Each item is a path and a label:

```tsx
deepLinks={[
  { path: "/orders", label: "Orders" },
  { path: "/inbox", label: "Inbox" },
]}
```

Connect posts that list and stores the saved routes on `deepLinks`. `onDeepLink` receives the notification url. Open that path with your navigator. With Expo Router:

```tsx
onDeepLink={(url) => {
  const path = new URL(url, "https://notifiable.invalid").pathname;
  router.push(path);
}}
```

## Permission and the Expo token

The SDK reads and requests permission through `expo-notifications`. It asks for alert, badge, and sound. On Android it creates a default notification channel before reading the token.

Ask in either of these ways.

**From a button.** Call `requestPermission()` after a short explanation.

```tsx
function EnableNotifications() {
  const { requestPermission } = useNotifiable();

  return (
    <Button
      title="Enable notifications"
      onPress={() => {
        void requestPermission();
      }}
    />
  );
}
```

**From the dashboard.** Ask this subscriber for permission in Notifiable. The next time the app connects, the system prompt opens on its own. Connect does not ask when the dashboard has not requested it.

iOS and Android show the system prompt once. A later call while permission is still undecided shows that prompt. A later call after a denial opens Settings.

`permission` becomes `"granted"` only when Expo returns a push token. The save then sends `provider: "expo"` and that token. When the operating system allows notifications and Expo returns no token, `permission` stays `"not_determined"` and the subscriber is saved without a token. That is the Expo Go case, and the case of a build that has no EAS project id. An explicit `requestPermission()` in that situation throws `missing_token` with the Expo error, so the button does not look idle.

## Notification taps

The provider installs a foreground handler that shows the alert, plays the sound, and sets the badge. It listens for notification taps, including the last response that launched the app.

A tap reads `data.url` and a delivery id from `data.delivery_id`, `data.deliveryId`, or the `opt` query parameter on the url. When a delivery id is present, the SDK calls `clickDelivery`. When a url is present and `onDeepLink` was passed, the SDK calls `onDeepLink` with that url. The same response is handled once. If `expo-notifications` fails to load, the listener is skipped and the rest of the app still runs.

## Development and production

| | Development key | Production key |
| --- | --- | --- |
| First launch | A sheet asks you to show or hide the Notifiable mark | No sheet |
| On screen | A draggable mark. Tap it to compare this app's bundle id or package name with the dashboard | Nothing from Notifiable is drawn over the app |
| Notifications | After permission is granted, a notification you send from the dashboard appears as a toast at the top of the screen | Expo displays the notification |
| Diagnostics | Failed SDK calls can be shared with Notifiable. The switch starts on | Nothing is sent |

### See a notification while you build

A development key polls for new notifications while the app is in the foreground, and only after `permission` is `"granted"`. Until then it does not poll. Send one from the dashboard and it shows at the top of the screen. The toast is a recent unread alert from the last 8 seconds. It records the open. A tap records a click when the notification has a delivery, then calls `onDeepLink` with the url.

The poll runs about every 5 seconds. A rate limit slows it. An invalid key or a missing subscriber stops it until the subscriber changes. Hiding the mark does not stop the poll. Leaving the foreground pauses it.

The mark's sheet compares the dashboard bundle id or package with the identifier of the app you are running. A match shows a green check. A mismatch shows what to paste into the dashboard, with a copy button when `expo-clipboard` is installed. Share SDK diagnostics, on that same sheet, reports a failed SDK call once per launch. Turn it off to stop sending. [Learn what is collected](https://notifiable.sh/sdk-diagnostics).

A production key skips the sheet, the mark, and these previews. People receive notifications through Expo.

The Command N shortcut that shows the mark again belongs to the React Native package's native module. The Expo plugin keeps that module out of the build, so Command N is not available in an Expo app.

## useNotifiable

Call `useNotifiable()` in any component under `NotifiableProvider`. It throws `missing_provider` outside that tree. The values update when the subscriber, permission, or last error changes.

```tsx
function Home() {
  const notifiable = useNotifiable();

  if (!notifiable.ready) {
    return <Text>Connecting…</Text>;
  }

  return <Text>{notifiable.subscriber?.id}</Text>;
}
```

Wait until `ready` is true before `identify`, `inbox`, `notification`, `openNotification`, `clickDelivery`, or `track`. Those calls need the subscriber created at connect.

### State

**`ready`** is true after connect has saved the subscriber.

**`permission`** is `"granted"`, `"denied"`, or `"not_determined"`. `"granted"` means Expo returned a push token.

**`subscriber`** is the person and device Notifiable stored. It is `null` until connect finishes. `subscriber.id` is the id in the dashboard. `subscriber.provider` is `"expo"` after a token is saved, or `null` when there is no token. `subscriber.externalId` is set after `identify`. `subscriber.anonymousId` is set until you identify them with an email or an external id.

**`clientConfig`** is the app record from the dashboard: name, icon, and whether this key is `development` or `production`. It is `null` until connect finishes.

**`deepLinks`** is the list of routes saved for this app. It is `null` until that save finishes.

**`devIndicator`** is `"enabled"`, `"disabled"`, or `null` if the person has not chosen yet. It remembers whether the development mark is shown.

**`diagnostics`** is `"enabled"`, `"disabled"`, or `null`. It remembers whether development failures are shared. A missing choice means sharing is on.

**`error`** is the last `NotifiableError`, or `null`. Read `error.code` and `error.message`.

**`config`** is the public key and the other options this client was created with. `config.push.provider` is `"expo"`.

### `start()`

Connects, or does nothing when the app is already connected. The provider calls this on mount, so most screens never call it. Call it yourself when you built the client with `createNotifiable` and are not using the provider, or when you want to retry after `error` is set.

```tsx
await notifiable.start();
```

### `requestPermission()`

Shows the system permission prompt, then saves the result. Use it from a button. The returned value is the new permission.

```tsx
const permission = await notifiable.requestPermission();
```

When permission is already denied, this opens Settings and returns `"denied"`. When the system grants permission and Expo returns no token, it throws `missing_token`.

The same prompt also opens on connect when the dashboard has asked for it. You do not call this function for that case.

### `identify(input)`

Attaches a real person to this device. Call it after your app knows who signed in.

```tsx
const subscriber = await notifiable.identify({
  email: "ada@example.com",
  externalId: "user_123",
  firstName: "Ada",
  lastName: "Lovelace",
});
```

`email`, `externalId`, `firstName`, and `lastName` are all optional, and at least an email or an external id should be set. A blank email or a blank external id is rejected. After an email or an external id is saved, the subscriber is no longer anonymous.

### `inbox(query?)`

Returns one page of this subscriber's notifications. Each page has 20 items. Use it for an inbox screen.

```tsx
const page = await notifiable.inbox();
const unread = await notifiable.inbox({ page: 1, opened: false });
```

`page` chooses the page number. `opened` keeps only opened or only unopened notifications. Leave a field out to skip that filter.

The result is `{ notifications, page, perPage, total }`. Each notification has `id`, `title`, `body`, `url`, `imageUrl`, `data`, `opened`, `openedAt`, `createdAt`, and `deliveryId`.

### `notification(id)`

Loads one notification by id. Use it when a screen opens from a known notification id.

```tsx
const item = await notifiable.notification(id);
```

### `openNotification(id)`

Tells Notifiable this subscriber opened that notification. Call it when your inbox marks an item as read.

```tsx
await notifiable.openNotification(id);
```

A development toast already does this when the preview is shown.

### `clickDelivery(deliveryId)`

Tells Notifiable the person tapped that delivery. `deliveryId` is `notification.deliveryId`. Call it when they follow the notification from your own inbox, in addition to navigating.

```tsx
if (item.deliveryId) {
  await notifiable.clickDelivery(item.deliveryId);
}
```

A notification tap and a development toast already do this when the notification includes a delivery id.

### `track(name, properties?)`

Records an event for the connected subscriber. You do not pass the subscriber id.

```tsx
const event = await notifiable.track("order.shipped", {
  order: "1001",
  express: true,
});
```

`name` is required. `properties` is optional: up to 20 keys, and each value is a string, a number, a boolean, or `null`. The result is `{ id, name, subscriberId }`.

### `setDevIndicator(enabled)`

Shows or hides the development mark and remembers the choice on this device. The first-launch sheet calls this for you. Call it when your own settings screen should control the mark.

```tsx
await notifiable.setDevIndicator(true);
```

A production key does not draw the mark.

### `setDiagnostics(enabled)`

Turns sharing of development failures on or off and remembers the choice. The switch on the development sheet calls this for you.

```tsx
await notifiable.setDiagnostics(false);
```

A production key does not send these reports.

## createNotifiable

Build a client when the provider should not create one. Pass that client to `NotifiableProvider` so the notification listener and the automatic `start()` still run.

```tsx
import { createNotifiable, NotifiableProvider } from "@notifiable/expo";

const client = createNotifiable({
  publicKey: "ntf_pub_...",
  projectId: "your-eas-project-id",
  deepLinks: [{ path: "/orders", label: "Orders" }],
  onDeepLink: (url) => {
    // Open this route.
  },
});
```

`createNotifiable` trims `publicKey` and throws `invalid_config` when it is blank. It always attaches the Expo push port and the Expo device port. `ExpoNotifiableConfig` is the React Native config without `push`, plus optional `projectId`.

## Errors

Failed calls throw `NotifiableError`. `error.code` on the hook is the same code as the last failure.

| Code | What happened |
| --- | --- |
| `invalid_config` | The public key is blank, or the app is running on a platform other than iOS or Android. |
| `missing_provider` | `useNotifiable()` is outside `NotifiableProvider`. |
| `invalid_public_key` | Notifiable rejected the key. |
| `network` | The request did not succeed. |
| `validation_failed` | A value was rejected, such as a blank email. |
| `subscriber_not_found` | Connect has not finished, or the subscriber no longer exists. |
| `subscriber_limit` | The project cannot add another subscriber. |
| `rate_limited` | Too many requests. Wait and try again. |
| `missing_token` | Permission is granted and Expo returned no push token. Connect still saves the subscriber with `not_determined`. An explicit permission request throws this error. |
| `missing_storage` | AsyncStorage is not installed and `storage` was not passed. |
| `not_implemented` | The called behavior is not available in this SDK. |

## For agents

Use this section when wiring `@notifiable/expo` into an app.

- Import `NotifiableProvider`, `useNotifiable`, `createNotifiable`, and the types from `@notifiable/expo`. Leave `@notifiable/react-native` out of the app.
- Add the `@notifiable/expo` config plugin and install `expo-notifications`, `expo-constants`, and AsyncStorage with `npx expo install`.
- Put the EAS project id in `extra.eas.projectId` and pass that same string as `projectId`.
- Mount one `NotifiableProvider` around the navigator. Pass `publicKey`, `projectId`, `deepLinks`, and `onDeepLink`. Leave `push` out of the props.
- Call `useNotifiable()` only under that provider. Wait for `ready` before `identify`, `inbox`, `notification`, `openNotification`, `clickDelivery`, or `track`.
- Call `requestPermission()` from a button. After a denial, the next call opens Settings. Treat `"granted"` as "Expo returned a token." Treat a granted system dialog with no token as `"not_determined"`.
- In `onDeepLink`, open the notification path with the app's navigator. The SDK already records the delivery click for a notification tap.
- Use the development key for local builds and the production key for the store build. Development toasts and the development poll run only while `permission` is `"granted"`.
- A missing Expo token, a missing optional Expo module, or a failed notification listener still leaves the provider mounted and the subscriber saved.
