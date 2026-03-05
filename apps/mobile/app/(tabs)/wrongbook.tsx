import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { getWrongBook, markReviewed, WrongBookEntry } from "@/services/api";

const ALL_TOPICS = "all";

export default function WrongBookScreen() {
  const [entries, setEntries] = useState<WrongBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS);

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const data = await getWrongBook("");
      setEntries(data);
    } catch {
      // Fallback sample data
      setEntries([
        {
          id: "w1",
          questionId: "q1",
          questionText:
            "Anayasa Mahkemesi kaç üyeden oluşur?",
          topicId: "anayasa",
          topicName: "Anayasa Hukuku",
          userAnswer: "B) 13",
          correctAnswer: "C) 15",
          reviewedAt: null,
          nextReviewDate: new Date().toISOString(),
        },
        {
          id: "w2",
          questionId: "q2",
          questionText: "Türkiye'nin en yüksek dağı hangisidir?",
          topicId: "cografya",
          topicName: "Coğrafya",
          userAnswer: "A) Erciyes",
          correctAnswer: "D) Ağrı Dağı",
          reviewedAt: null,
          nextReviewDate: new Date().toISOString(),
        },
        {
          id: "w3",
          questionId: "q3",
          questionText: "Kurtuluş Savaşı'nın başlangıç tarihi nedir?",
          topicId: "tarih",
          topicName: "Tarih",
          userAnswer: "C) 23 Nisan 1920",
          correctAnswer: "A) 19 Mayıs 1919",
          reviewedAt: "2024-01-10T00:00:00.000Z",
          nextReviewDate: new Date().toISOString(),
        },
        {
          id: "w4",
          questionId: "q4",
          questionText: "Cumhurbaşkanlığı kararnamesi hangi alanda çıkarılamaz?",
          topicId: "anayasa",
          topicName: "Anayasa Hukuku",
          userAnswer: "A) Ekonomi",
          correctAnswer: "B) Temel haklar",
          reviewedAt: null,
          nextReviewDate: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkReviewed(entryId: string) {
    try {
      await markReviewed("", entryId, 4);
    } catch {
      // Offline: update locally
    }
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, reviewedAt: new Date().toISOString() }
          : e,
      ),
    );
  }

  // Derive unique topics for filter
  const topics = Array.from(new Set(entries.map((e) => e.topicName)));

  const filtered =
    selectedTopic === ALL_TOPICS
      ? entries
      : entries.filter((e) => e.topicName === selectedTopic);

  // Group by topic
  const grouped = filtered.reduce<Record<string, WrongBookEntry[]>>(
    (acc, entry) => {
      const key = entry.topicName;
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    },
    {},
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Topic filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedTopic === ALL_TOPICS && styles.filterChipActive,
          ]}
          onPress={() => setSelectedTopic(ALL_TOPICS)}
        >
          <Text
            style={[
              styles.filterText,
              selectedTopic === ALL_TOPICS && styles.filterTextActive,
            ]}
          >
            Tümü ({entries.length})
          </Text>
        </TouchableOpacity>

        {topics.map((topic) => (
          <TouchableOpacity
            key={topic}
            style={[
              styles.filterChip,
              selectedTopic === topic && styles.filterChipActive,
            ]}
            onPress={() => setSelectedTopic(topic)}
          >
            <Text
              style={[
                styles.filterText,
                selectedTopic === topic && styles.filterTextActive,
              ]}
            >
              {topic} ({entries.filter((e) => e.topicName === topic).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entries grouped by topic */}
      <ScrollView style={styles.list}>
        {Object.entries(grouped).map(([topic, items]) => (
          <View key={topic} style={styles.topicGroup}>
            <Text style={styles.topicHeader}>{topic}</Text>

            {items.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <Text style={styles.questionText}>{entry.questionText}</Text>

                <View style={styles.answerRow}>
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerLabel}>Senin Cevabın</Text>
                    <Text style={styles.wrongAnswer}>{entry.userAnswer}</Text>
                  </View>
                  <View style={styles.answerBlock}>
                    <Text style={styles.answerLabel}>Doğru Cevap</Text>
                    <Text style={styles.correctAnswer}>
                      {entry.correctAnswer}
                    </Text>
                  </View>
                </View>

                {/* SRS review scheduling info */}
                <Text style={styles.reviewInfo}>
                  {entry.reviewedAt
                    ? `✅ Son inceleme: ${new Date(entry.reviewedAt).toLocaleDateString("tr-TR")}`
                    : `⏰ İnceleme bekliyor`}
                </Text>

                {!entry.reviewedAt && (
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => handleMarkReviewed(entry.id)}
                  >
                    <Text style={styles.reviewBtnText}>
                      ✅ İncelendi Olarak İşaretle
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎉</Text>
            <Text style={styles.emptyText}>
              Yanlış cevap yok! Harika gidiyorsun.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: {
    maxHeight: 56,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  filterChipActive: {
    backgroundColor: "#1e40af",
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  list: {
    flex: 1,
    padding: 16,
  },
  topicGroup: {
    marginBottom: 20,
  },
  topicHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 10,
    paddingLeft: 4,
  },
  entryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  questionText: {
    fontSize: 15,
    color: "#1e293b",
    lineHeight: 22,
    marginBottom: 12,
  },
  answerRow: {
    flexDirection: "row",
    gap: 12,
  },
  answerBlock: {
    flex: 1,
  },
  answerLabel: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  wrongAnswer: {
    fontSize: 14,
    color: "#ef4444",
    fontWeight: "600",
  },
  correctAnswer: {
    fontSize: 14,
    color: "#22c55e",
    fontWeight: "600",
  },
  reviewInfo: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 10,
  },
  reviewBtn: {
    marginTop: 10,
    backgroundColor: "#f0fdf4",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16a34a",
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
});
