import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useNotifiable } from "@notifiable/expo";
import { useSession } from "../components/session";
import { Action, Field, Screen, Status } from "../components/ui";
import { pages } from "../lib/routes";

export default function SubscriberScreen() {
  const notifiable = useNotifiable();
  const { disconnect } = useSession();
  const [email, setEmail] = useState("");
  const [externalId, setExternalId] = useState("");
  const [busy, setBusy] = useState(false);
  const subscriber = notifiable.subscriber;

  async function run(task: () => Promise<unknown>) {
    setBusy(true);

    try {
      await task();
    } catch {
      return;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>Subscriber</Text>
      <Status label="Ready" value={notifiable.ready ? "yes" : "no"} />
      <Status label="Permission" value={notifiable.permission} />
      <Status label="Subscriber" value={subscriber?.id ?? "waiting"} />
      <Status label="Anonymous id" value={subscriber?.anonymousId ?? "none"} />
      <Status
        label="Deep links"
        value={
          notifiable.deepLinks === null
            ? "waiting"
            : notifiable.deepLinks.map((link) => link.path).join(", ")
        }
      />
      <Status
        label="Error"
        value={
          notifiable.error === null
            ? "none"
            : `${notifiable.error.code}: ${notifiable.error.message}`
        }
      />
      {busy ? <ActivityIndicator /> : null}
      <Action
        label="Request permission"
        disabled={busy}
        onPress={() => {
          void run(() => notifiable.requestPermission());
        }}
      />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="ada@example.com"
      />
      <Field
        label="External id"
        value={externalId}
        onChangeText={setExternalId}
        placeholder="user_123"
      />
      <Action
        label="Identify"
        disabled={busy || email.trim().length === 0}
        onPress={() => {
          const id = externalId.trim();
          void run(() =>
            notifiable.identify({
              email,
              ...(id.length > 0 ? { externalId: id } : {}),
            }),
          );
        }}
      />
      <Action
        label="Track order shipped"
        disabled={busy || subscriber === null}
        onPress={() => {
          void run(() => notifiable.track("order.shipped", { order: "1001" }));
        }}
      />
      {pages.map((page) => (
        <Action
          key={page.path}
          label={page.label}
          disabled={busy}
          onPress={() => {
            router.push(page.path);
          }}
        />
      ))}
      <Action label="Disconnect" onPress={disconnect} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "600",
  },
});
