import "react-native-gesture-handler";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NotifiableProvider } from "@notifiable/expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConnectScreen } from "../components/connect-screen";
import { SessionProvider, usePublicKey } from "../components/session";
import { deepLinks, routeFor } from "../lib/routes";

export default function RootLayout() {
  const session = usePublicKey();

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {session.publicKey === null ? (
        <ConnectScreen onConnect={session.connect} />
      ) : (
        <SessionProvider disconnect={session.disconnect}>
          <NotifiableProvider
            publicKey={session.publicKey}
            deepLinks={deepLinks}
            onDeepLink={(url) => {
              const path = routeFor(url);

              if (path !== null) {
                router.push(path);
              }
            }}
          >
            <Stack screenOptions={{ headerShown: false }} />
          </NotifiableProvider>
        </SessionProvider>
      )}
    </SafeAreaProvider>
  );
}
