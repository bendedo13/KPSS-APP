import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { flashcardsApi } from '../api/client';
import type { Flashcard } from '@kpss/shared';

export default function WrongBookScreen(): React.JSX.Element {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    flashcardsApi
      .list()
      .then((res) => {
        if (res.success) setCards(res.data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wrong Answer Notebook</Text>
      {cards.length === 0 ? (
        <Text style={styles.empty}>No wrong answers yet. Keep it up!</Text>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.label}>Question #{item.questionId.slice(0, 8)}</Text>
              <Text style={styles.meta}>
                Next review: {new Date(item.nextReviewAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  empty: { color: '#888', textAlign: 'center', marginTop: 40 },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff3f3',
    marginBottom: 8,
  },
  label: { fontWeight: '600', fontSize: 15 },
  meta: { color: '#888', fontSize: 13, marginTop: 4 },
});
