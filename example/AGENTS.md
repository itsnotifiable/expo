# Notifiable Expo example

This is an Expo Router app. Routes live in `app/`. `app/_layout.tsx` connects with `NotifiableProvider` from `@notifiable/expo` after a public key is entered. Do not pass a `push` prop.

`/` is the subscriber screen. `/about`, `/delivery`, and `/inbox` are the deep links the SDK saves. A notification tap opens that route with Expo Router.

Install extra packages with `npx expo install`. The config plugins are `expo-router` and `@notifiable/expo`.
