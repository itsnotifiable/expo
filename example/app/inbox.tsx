import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { useNotifiable, type SubscriberNotification } from "@notifiable/expo";
import { Action, Screen } from "../components/ui";

export default function InboxScreen() {
  const notifiable = useNotifiable();
  const loadInbox = notifiable.inbox;
  const openNotification = notifiable.openNotification;
  const [pageNumber, setPageNumber] = useState(1);
  const [items, setItems] = useState<readonly SubscriberNotification[]>([]);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasNext = pageNumber * perPage < total;

  useEffect(() => {
    let cancelled = false;

    void loadInbox({ page: pageNumber })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setItems(result.notifications);
        setPerPage(result.perPage);
        setTotal(result.total);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "The inbox could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [loadInbox, pageNumber]);

  return (
    <Screen>
      <Text style={styles.title}>Inbox</Text>
      <Text style={styles.value}>/inbox</Text>
      {error !== null ? <Text style={styles.subtitle}>{error}</Text> : null}
      {items.length === 0 && error === null ? (
        <Text style={styles.subtitle}>No notifications yet.</Text>
      ) : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => {
            void openNotification(item.id);
          }}
        >
          <Text style={styles.label}>{item.title}</Text>
          <Text style={styles.value}>{item.body}</Text>
        </Pressable>
      ))}
      {pageNumber > 1 ? (
        <Action
          label="Previous page"
          disabled={false}
          onPress={() => {
            setPageNumber((current) => current - 1);
          }}
        />
      ) : null}
      {hasNext ? (
        <Action
          label="Next page"
          disabled={false}
          onPress={() => {
            setPageNumber((current) => current + 1);
          }}
        />
      ) : null}
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
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 16,
  },
});
