# Notifiable - Expo SDK

`@notifiable/expo` registers an Expo app with [Notifiable](https://notifiable.sh). Permission and the Expo push token are handled inside the package. Import from `@notifiable/expo`.

## Install

```bash
npx expo install @notifiable/expo expo-notifications expo-constants @react-native-async-storage/async-storage
```

`expo-device`, `expo-application`, and `expo-clipboard` are optional. When they are installed, the development sheet can read this app's identifier and copy it. If they are missing, connect still succeeds.

Add the plugin to `app.json`:

```json
{
  "expo": {
    "plugins": ["@notifiable/expo"]
  }
}
```

The plugin applies `expo-notifications` and keeps the React Native package's native modules out of the Expo build. A real Expo push token needs a development or production build and an EAS project id. Expo Go, a simulator, or a missing project id still connects the subscriber and leaves the token off.

## Configure

```tsx
import { NotifiableProvider, useNotifiable } from "@notifiable/expo";

function App() {
  return (
    <NotifiableProvider
      publicKey="ntf_pub_..."
      deepLinks={[{ path: "/orders", label: "Orders" }]}
      onDeepLink={(url) => {
        // Open this route.
      }}
    >
      <Home />
    </NotifiableProvider>
  );
}
```

`useNotifiable()` is the same hook as `@notifiable/react-native`: `ready`, `permission`, `requestPermission`, `identify`, `inbox`, and `track`. Do not pass a `push` prop.
# expo
