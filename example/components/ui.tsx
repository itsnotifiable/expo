import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function Screen({
  children,
}: {
  readonly children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

export function Status({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.status}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function Action({
  label,
  onPress,
  disabled,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    gap: 16,
  },
  field: {
    gap: 6,
  },
  status: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c8c8c8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#111111",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
