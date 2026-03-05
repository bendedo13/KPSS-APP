import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { apiClient } from '../../services/api';

interface DailyTask {
  id: string;
  title: string;
  description: string;
  task_type: string;
  status?: string;
}

export default function DashboardScreen() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ tasks: DailyTask[] }>('/daily-tasks')
      .then(data => setTasks(data.tasks))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Günlük Görevler</Text>
      {loading && <Text>Yükleniyor...</Text>}
      {tasks.map(task => (
        <View key={task.id} style={[styles.card, task.status === 'completed' && styles.completed]}>
          <Text style={styles.taskTitle}>{task.title}</Text>
          <Text style={styles.taskDesc}>{task.description}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 12, elevation: 2 },
  completed: { opacity: 0.5 },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  taskDesc: { fontSize: 14, color: '#666', marginTop: 4 },
});
