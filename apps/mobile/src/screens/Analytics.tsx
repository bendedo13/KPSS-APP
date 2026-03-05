import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

const { width } = Dimensions.get('window');

interface TopicHeatmap {
  topic: string;
  total_attempted: number;
  total_correct: number;
  accuracy_percent: number;
  error_count: number;
}

interface TimeManagement {
  total_tests: number;
  avg_time_per_question: number;
  avg_actual_time: number;
  time_efficiency_percent: number;
  questions_under_time: number;
  questions_over_time: number;
}

interface Analytics {
  heatmap: TopicHeatmap[];
  difficulty_breakdown: any[];
  time_management: TimeManagement;
  progress_trends: any[];
  weak_topics: TopicHeatmap[];
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'time' | 'recommendations'>('heatmap');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [analyticsRes, recommendRes] = await Promise.all([
        apiClient.get('/analytics'),
        apiClient.get('/analytics/recommendations'),
      ]);

      setAnalytics(analyticsRes.data);
      setRecommendations(recommendRes.data.recommendations || []);
    } catch (error) {
      Alert.alert('Hata', 'Analitik veriler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return '#4CAF50';
    if (accuracy >= 60) return '#FF9800';
    return '#F44336';
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Detaylı Analiz</Text>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {(['heatmap', 'time', 'recommendations'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === 'heatmap'
                  ? '🔥 Hata Isısı'
                  : tab === 'time'
                  ? '⏱️ Zaman'
                  : '💡 Tavsiye'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Heatmap Tab */}
        {activeTab === 'heatmap' && analytics && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Konu Başına Başarı Oranı</Text>
              <Text style={styles.cardSubtitle}>
                Düşük başarı oranı = daha fazla çalışma gerekli
              </Text>

              {analytics.heatmap.length === 0 ? (
                <Text style={styles.emptyText}>Henüz veri yok</Text>
              ) : (
                <View style={styles.topicsList}>
                  {analytics.heatmap.map((topic, idx) => (
                    <View key={idx} style={styles.topicItem}>
                      <View style={styles.topicInfo}>
                        <Text style={styles.topicName}>{topic.topic}</Text>
                        <Text style={styles.topicStats}>
                          {topic.total_correct} / {topic.total_attempted} soru
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.accuracyBar,
                          {
                            width: `${(topic.accuracy_percent / 100) * 60}%`,
                            backgroundColor: getAccuracyColor(topic.accuracy_percent),
                          },
                        ]}
                      />
                      <Text style={styles.accuracyPercent}>
                        {topic.accuracy_percent}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Weak Topics */}
            {analytics.weak_topics.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🚨 Çalışması Gereken Konular</Text>
                {analytics.weak_topics.map((topic, idx) => (
                  <View key={idx} style={styles.weakTopicItem}>
                    <View style={styles.weakTopicHeader}>
                      <Text style={styles.weakTopicName}>{topic.topic}</Text>
                      <Text style={styles.weakTopicAccuracy}>
                        {topic.accuracy_percent}%
                      </Text>
                    </View>
                    <Text style={styles.weakTopicError}>
                      ❌ {topic.error_count} hata yapıldı
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Difficulty Breakdown */}
            {analytics.difficulty_breakdown.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Zorluk Seviyesi Analizi</Text>
                {analytics.difficulty_breakdown.map((diff: any, idx: number) => (
                  <View key={idx} style={styles.difficultyItem}>
                    <View style={styles.difficultyHeader}>
                      <Text style={styles.difficultyLabel}>
                        {diff.difficulty === 'easy'
                          ? '🟢 Kolay'
                          : diff.difficulty === 'medium'
                          ? '🟡 Orta'
                          : '🔴 Zor'}
                      </Text>
                      <Text style={styles.difficultyAccuracy}>
                        {diff.accuracy_percent}%
                      </Text>
                    </View>
                    <Text style={styles.difficultyStats}>
                      {diff.total_correct}/{diff.total_attempted} | Ort. Süre:{' '}
                      {Math.round(diff.avg_time_seconds)}sn
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Time Management Tab */}
        {activeTab === 'time' && analytics && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>⏱️ Zaman Yönetimi</Text>

              <View style={styles.timeMetricsGrid}>
                <View style={styles.timeMetric}>
                  <Text style={styles.timeLabel}>Yapılan Testler</Text>
                  <Text style={styles.timeValue}>
                    {analytics.time_management.total_tests}
                  </Text>
                </View>

                <View style={styles.timeMetric}>
                  <Text style={styles.timeLabel}>Ort. Soru Süresi</Text>
                  <Text style={styles.timeValue}>
                    {analytics.time_management.avg_time_per_question}s
                  </Text>
                </View>

                <View style={styles.timeMetric}>
                  <Text style={styles.timeLabel}>Planlanan Süre</Text>
                  <Text style={styles.timeValue}>
                    {analytics.time_management.avg_actual_time}s
                  </Text>
                </View>

                <View style={styles.timeMetric}>
                  <Text style={styles.timeLabel}>Zaman Verimliliği</Text>
                  <Text style={styles.timeValue}>
                    {analytics.time_management.time_efficiency_percent}%
                  </Text>
                </View>
              </View>

              <View style={styles.timeProgressContainer}>
                <Text style={styles.timeProgressLabel}>Zaman İçinde Tamamlanan</Text>
                <View style={styles.timeProgressBar}>
                  <View
                    style={[
                      styles.timeProgressFill,
                      {
                        width: `${
                          (analytics.time_management.questions_under_time /
                            (analytics.time_management.questions_under_time +
                              analytics.time_management.questions_over_time)) *
                          100
                        }%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.timeProgressStats}>
                  <View style={styles.timeStat}>
                    <View style={[styles.timeStatColor, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.timeStatText}>
                      {analytics.time_management.questions_under_time} zamanında
                    </Text>
                  </View>
                  <View style={styles.timeStat}>
                    <View style={[styles.timeStatColor, { backgroundColor: '#F44336' }]} />
                    <Text style={styles.timeStatText}>
                      {analytics.time_management.questions_over_time} geç
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.timeAdvice}>
                {analytics.time_management.time_efficiency_percent >= 80 ? (
                  <Text style={styles.adviceText}>
                    ✨ Zaman yönetimi mükemmel! Bu hızla devam et.
                  </Text>
                ) : analytics.time_management.time_efficiency_percent >= 60 ? (
                  <Text style={styles.adviceText}>
                    ⚡ Biraz daha hızlı çöz. Pratik yaparak hızlanabilirsin.
                  </Text>
                ) : (
                  <Text style={styles.adviceText}>
                    📚 Daha fazla pratik yaparak hızını artır.
                  </Text>
                )}
              </View>
            </View>

            {/* Progress Trends */}
            {analytics.progress_trends.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Son 30 Günlük İlerleme</Text>
                <View style={styles.trendsContainer}>
                  {analytics.progress_trends.slice(-7).map((trend: any, idx: number) => (
                    <View key={idx} style={styles.trendItem}>
                      <View
                        style={[
                          styles.trendBar,
                          {
                            height: Math.max(20, trend.accuracy_percent),
                            backgroundColor: getAccuracyColor(trend.accuracy_percent),
                          },
                        ]}
                      />
                      <Text style={styles.trendLabel}>
                        {new Date(trend.date).toLocaleDateString('tr-TR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text style={styles.trendPercent}>{trend.accuracy_percent}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>💡 Kişiselleştirilmiş Tavsiyeler</Text>

              {recommendations.length === 0 ? (
                <Text style={styles.emptyText}>Tavsiye yok - devam ettir!</Text>
              ) : (
                <View style={styles.recommendationsList}>
                  {recommendations.map((rec, idx) => (
                    <View key={idx} style={styles.recommendationItem}>
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Özet İstatistikler</Text>

              {analytics && (
                <View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Toplam Çalışılan Konu</Text>
                    <Text style={styles.statValue}>{analytics.heatmap.length}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Ortalama Başarı</Text>
                    <Text style={styles.statValue}>
                      {analytics.heatmap.length > 0
                        ? Math.round(
                            analytics.heatmap.reduce(
                              (sum, t) => sum + t.accuracy_percent,
                              0
                            ) / analytics.heatmap.length
                          )
                        : 0}
                      %
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Çalışması Gereken</Text>
                    <Text style={styles.statValue}>{analytics.weak_topics.length}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Refresh Button */}
        <TouchableOpacity style={styles.refreshButton} onPress={fetchAnalytics}>
          <Text style={styles.refreshButtonText}>🔄 Yenile</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#0066cc',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  topicsList: {
    gap: 12,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topicInfo: {
    flex: 1,
  },
  topicName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  topicStats: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  accuracyBar: {
    height: 8,
    borderRadius: 4,
    minWidth: 20,
  },
  accuracyPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    minWidth: 35,
    textAlign: 'right',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  weakTopicItem: {
    backgroundColor: '#fff5f5',
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  weakTopicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weakTopicName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  weakTopicAccuracy: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F44336',
  },
  weakTopicError: {
    fontSize: 12,
    color: '#F44336',
  },
  difficultyItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  difficultyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  difficultyLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  difficultyAccuracy: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066cc',
  },
  difficultyStats: {
    fontSize: 11,
    color: '#999',
  },
  timeMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  timeMetric: {
    width: (width - 64) / 2,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  timeProgressContainer: {
    marginTop: 12,
  },
  timeProgressLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  timeProgressBar: {
    height: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  timeProgressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  timeProgressStats: {
    flexDirection: 'row',
    gap: 16,
  },
  timeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeStatColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeStatText: {
    fontSize: 11,
    color: '#666',
  },
  timeAdvice: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  adviceText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '500',
    textAlign: 'center',
  },
  trendsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingVertical: 12,
  },
  trendItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  trendBar: {
    width: 24,
    borderRadius: 4,
  },
  trendLabel: {
    fontSize: 10,
    color: '#999',
  },
  trendPercent: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  recommendationsList: {
    gap: 8,
  },
  recommendationItem: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0066cc',
    padding: 12,
    borderRadius: 6,
  },
  recommendationText: {
    fontSize: 12,
    color: '#333',
    lineHeight: 18,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066cc',
  },
  refreshButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
