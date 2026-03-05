import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface Solution {
  question_id: number;
  short_explanation: string;
  long_explanation: string;
  key_points: string[];
  similar_questions: number[];
  video_url: string | null;
}

interface SolutionDetailScreenProps {
  route: { params: { questionId: number } };
}

export default function SolutionDetailScreen({ route }: SolutionDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { questionId } = route.params;
  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSolution();
  }, [questionId]);

  const fetchSolution = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/questions/${questionId}/solution`);
      setSolution(response.data);
    } catch {
      Alert.alert('Hata', 'Çözüm yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={[styles.container, { paddingTop: insets.top }]}><ActivityIndicator /></View>;

  if (!solution) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Çözüm bulunamadı</Text>
      </View>
    );
  }

  const handleVideoPress = () => {
    if (solution.video_url) {
      Linking.openURL(solution.video_url).catch(() => Alert.alert('Hata', 'Video açılamadı'));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📚 Çözüm Açıklaması</Text>

        {/* Short Explanation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Doğru Cevap</Text>
          <Text style={styles.shortExplanation}>{solution.short_explanation}</Text>
        </View>

        {/* Video Link */}
        {solution.video_url && (
          <TouchableOpacity style={styles.videoButton} onPress={handleVideoPress}>
            <Text style={styles.videoButtonText}>▶ Video Anlatımı İzle</Text>
          </TouchableOpacity>
        )}

        {/* Detailed Explanation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detaylı Açıklama</Text>
          <Text style={styles.longExplanation}>{solution.long_explanation}</Text>
        </View>

        {/* Key Points */}
        {solution.key_points.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🎯 Önemli Noktalar</Text>
            {solution.key_points.map((point, idx) => (
              <View key={idx} style={styles.keyPointItem}>
                <Text style={styles.bulletPoint}>•</Text>
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Similar Questions */}
        {solution.similar_questions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📖 Benzer Sorular (Pratik İçin)</Text>
            <Text style={styles.similarInfo}>Konuşan aynı konular üzerinde pratik yapmak için benzer soruları çöz</Text>
            <View style={styles.similarQuestionsContainer}>
              {solution.similar_questions.map((qId) => (
                <TouchableOpacity key={qId} style={styles.similarQuestionTag}>
                  <Text style={styles.similarQuestionText}>Soru #{qId}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Practice Button */}
        <TouchableOpacity style={styles.practiceButton}>
          <Text style={styles.practiceButtonText}>🎓 Bu Konuda Pratik Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  errorText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 32 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0066cc', marginBottom: 8 },
  shortExplanation: { fontSize: 16, fontWeight: '500', color: '#333', lineHeight: 24 },
  longExplanation: { fontSize: 14, color: '#555', lineHeight: 22 },
  keyPointItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  bulletPoint: { fontSize: 16, color: '#0066cc', fontWeight: 'bold' },
  keyPointText: { fontSize: 13, color: '#555', flex: 1, flexWrap: 'wrap' },
  videoButton: { backgroundColor: '#e8f4f8', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 12, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#0066cc' },
  videoButtonText: { fontSize: 14, fontWeight: '600', color: '#0066cc' },
  similarInfo: { fontSize: 12, color: '#999', marginBottom: 8 },
  similarQuestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  similarQuestionTag: { backgroundColor: '#f0f0f0', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#ddd' },
  similarQuestionText: { fontSize: 12, color: '#333', fontWeight: '500' },
  practiceButton: { backgroundColor: '#0066cc', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  practiceButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },
});
