import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { apiClient, DailyTask } from '../../services/api';

export default function DashboardScreen() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await apiClient.getDailyTasks();
      setTasks(data.tasks);
      setDate(data.date);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(taskId: string) {
    try {
      await apiClient.completeTask(taskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  }

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Günlük Görevler</Text>
      {date && <Text style={styles.dateText}>{new Date(date).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>}

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.progressText}>{completedCount}/{tasks.length} tamamlandı ({progressPercent}%)</Text>

      {loading ? (
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      ) : (
        tasks.map((task) => (
          <TouchableOpacity
            key={task.id}
            style={[styles.taskCard, task.is_completed && styles.taskCompleted]}
            onPress={() => !task.is_completed && completeTask(task.id)}
          >
            <Text style={styles.taskTitle}>{task.is_completed ? '✓ ' : ''}{task.title}</Text>
            <Text style={styles.taskDesc}>{task.description}</Text>
            <Text style={styles.taskProgress}>{task.completed_count}/{task.target_count}</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 },
  dateText: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginVertical: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#1e40af', borderRadius: 4 },
  progressText: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  loadingText: { textAlign: 'center', color: '#6b7280', marginTop: 32 },
  taskCard: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  taskCompleted: { opacity: 0.6 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  taskDesc: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  taskProgress: { fontSize: 12, color: '#1e40af', fontWeight: '500' },
});
