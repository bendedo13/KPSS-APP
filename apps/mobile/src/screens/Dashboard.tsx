import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { testsApi } from '../api/client';
import type { Test } from '@kpss/shared';

export default function DashboardScreen(): React.JSX.Element {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    testsApi
      .list()
      .then((res) => {
        if (res.success) setTests(res.data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent Tests</Text>
      <FlatList
        data={tests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.topic}>{item.topic ?? 'Mixed'}</Text>
            <Text style={styles.score}>Score: {item.score ?? '—'}%</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  card: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  topic: { fontSize: 16, fontWeight: '600' },
  score: { fontSize: 14, color: '#555', marginTop: 4 },
});
