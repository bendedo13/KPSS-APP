import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { apiClient, WrongBookEntry } from '../../services/api';

export default function WrongBookScreen() {
  const [wrongs, setWrongs] = useState<WrongBookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getWrongBook()
      .then((data) => setWrongs(data.wrongs ?? []))
      .catch((err) => console.error('Failed to load wrong book:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={styles.centered}><Text>Yükleniyor...</Text></View>;
  }

  if (wrongs.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🎉</Text>
        <Text style={styles.emptyText}>Yanlış defteriniz boş!</Text>
        <Text style={styles.emptySubtext}>Harika gidiyorsunuz.</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={wrongs}
      keyExtractor={(item) => item.question_id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.questionText}>{item.text}</Text>
          <View style={styles.row}>
            <View style={styles.wrong}>
              <Text style={styles.label}>Senin cevabın</Text>
              <Text style={styles.wrongAnswer}>{item.selected_option}</Text>
            </View>
            <View style={styles.correct}>
              <Text style={styles.label}>Doğru cevap</Text>
              <Text style={styles.correctAnswer}>{item.correct_option}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {item.review_count}× görüldü · {item.topic ?? ''} · {item.last_seen_at ? new Date(item.last_seen_at).toLocaleDateString('tr-TR') : ''}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#1e40af' },
  emptySubtext: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  card: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  questionText: { fontSize: 15, color: '#111827', marginBottom: 12, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  wrong: { flex: 1, backgroundColor: '#fef2f2', borderRadius: 6, padding: 10 },
  correct: { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 6, padding: 10 },
  label: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  wrongAnswer: { fontSize: 18, fontWeight: 'bold', color: '#ef4444', textAlign: 'center' },
  correctAnswer: { fontSize: 18, fontWeight: 'bold', color: '#22c55e', textAlign: 'center' },
  meta: { fontSize: 12, color: '#9ca3af' },
});
