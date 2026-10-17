import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { Action, Screen } from "../components/ui";
import { pages } from "../lib/routes";

const page = pages[1];

export default function DeliveryScreen() {
  return (
    <Screen>
      <Text style={styles.title}>{page.label}</Text>
      <Text style={styles.value}>{page.path}</Text>
      <Text style={styles.subtitle}>{page.body}</Text>
      <Action
        label="Back"
        disabled={false}
        onPress={() => {
          router.back();
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
  value: {
    fontSize: 16,
  },
});
