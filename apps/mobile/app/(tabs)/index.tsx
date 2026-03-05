import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getDailyTasks, DailyTask } from "@/services/api";

export default function DashboardScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Summary stats (would come from API in production)
  const questionsAnswered = 42;
  const accuracy = 78;

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      // TODO: replace with real auth token from secure storage
      const data = await getDailyTasks("");
      setTasks(data);
    } catch {
      // Fallback sample data for skeleton
      setTasks([
        {
          id: "1",
          title: "Flashcard tekrarı yap",
          type: "flashcard_review",
          completed: false,
          target: 20,
          current: 8,
        },
        {
          id: "2",
          title: "Mini test çöz",
          type: "mini_test",
          completed: false,
          target: 1,
          current: 0,
        },
        {
          id: "3",
          title: "Yanlış defteriyle çalış",
          type: "wrong_book_review",
          completed: true,
          target: 10,
          current: 10,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      {/* Greeting */}
      <View style={styles.greetingCard}>
        <Text style={styles.greeting}>Merhaba! 👋</Text>
        <Text style={styles.subtitle}>Bugün çalışmaya hazır mısın?</Text>
      </View>

      {/* Today's Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bugünün Özeti</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{questionsAnswered}</Text>
            <Text style={styles.statLabel}>Soru Çözüldü</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>%{accuracy}</Text>
            <Text style={styles.statLabel}>Doğruluk</Text>
          </View>
        </View>
      </View>

      {/* Daily Tasks */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Günlük Görevler</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#1e40af" />
        ) : (
          tasks.map((task) => (
            <View key={task.id} style={styles.taskRow}>
              <Text style={styles.taskCheck}>
                {task.completed ? "✅" : "⬜"}
              </Text>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskProgress}>
                  {task.current}/{task.target}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#1e40af" }]}
          onPress={() => router.push("/(tabs)/minitest")}
        >
          <Text style={styles.actionIcon}>✍️</Text>
          <Text style={styles.actionText}>Test Başlat</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#7c3aed" }]}
          onPress={() => router.push("/(tabs)/flashcards")}
        >
          <Text style={styles.actionIcon}>🃏</Text>
          <Text style={styles.actionText}>Kartları İncele</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: "#dc2626" }]}
          onPress={() => router.push("/(tabs)/wrongbook")}
        >
          <Text style={styles.actionIcon}>📕</Text>
          <Text style={styles.actionText}>Yanlış Defteri</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
  },
  greetingCard: {
    backgroundColor: "#1e40af",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 16,
    color: "#bfdbfe",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e40af",
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  taskCheck: {
    fontSize: 20,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  taskTitle: {
    fontSize: 15,
    color: "#334155",
  },
  taskProgress: {
    fontSize: 14,
    color: "#94a3b8",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginHorizontal: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
