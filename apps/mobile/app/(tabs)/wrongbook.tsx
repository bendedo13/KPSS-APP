import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface WrongQuestion {
  question_id: string;
  text: string;
  wrong_count: number;
  last_seen_at: string;
}

export default function WrongBookScreen() {
  const [wrongs, setWrongs] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ wrongs: WrongQuestion[] }>('/wrong-book')
      .then(d => setWrongs(d.wrongs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Text style={{ padding: 20 }}>Yükleniyor...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yanlışlarım ({wrongs.length})</Text>
      <FlatList
        data={wrongs}
        keyExtractor={item => item.question_id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.questionText}>{item.text}</Text>
            <Text style={styles.meta}>Yanlış sayısı: {item.wrong_count} | Son görülme: {new Date(item.last_seen_at).toLocaleDateString('tr-TR')}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Henüz yanlışın yok! 🎉</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  card: { backgroundColor: '#fff', margin: 8, borderRadius: 8, padding: 14, elevation: 2 },
  questionText: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 12, color: '#888', marginTop: 6 },
  empty: { textAlign: 'center', padding: 32, fontSize: 16, color: '#666' },
});
