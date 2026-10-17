import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Action, Field, Screen } from "./ui";

export function ConnectScreen({
  onConnect,
}: {
  readonly onConnect: (publicKey: string) => void;
}) {
  const [publicKey, setPublicKey] = useState("");
  const canConnect = publicKey.trim().length > 0;

  return (
    <Screen>
      <Text style={styles.title}>Notifiable</Text>
      <Text style={styles.subtitle}>
        Enter the public key from the Notifiable dashboard. This Expo app
        connects to Notifiable. A missing push token does not stop connect.
      </Text>
      <Field
        label="Public key"
        value={publicKey}
        onChangeText={setPublicKey}
        placeholder="ntf_pub_..."
      />
      <Action
        label="Connect"
        disabled={!canConnect}
        onPress={() => {
          onConnect(publicKey);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
});
