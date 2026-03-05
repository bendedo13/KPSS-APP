import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface LearningPlan {
  id: string;
  plan_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  planned_questions_count: number;
  planned_minutes: number;
  completed_questions_count: number;
  completed_minutes: number;
  completion_percent: number;
  status: string;
}

interface WeeklySummary {
  total_planned: number;
  total_completed: number;
  average_completion: number;
  days_completed: number;
}

export default function LearningPlanScreen() {
  const insets = useSafeAreaInsets();
  const [goalId, setGoalId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<LearningPlan | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalAndPlan();
  }, []);

  const fetchGoalAndPlan = async () => {
    try {
      setLoading(true);
      // Get user's goal
      const goalResponse = await apiClient.get('/goals');
      const gid = goalResponse.data.id;
      setGoalId(gid);

      // Get current daily plan
      try {
        const planResponse = await apiClient.get(`/plans/${gid}/current?type=daily`);
        setCurrentPlan(planResponse.data);
      } catch {
        setCurrentPlan(null);
      }

      // Get weekly summary
      const summaryResponse = await apiClient.get(`/plans/${gid}/weekly-summary`);
      setWeeklySummary(summaryResponse.data);
    } catch (error) {
      Alert.alert('Hata', 'Plan alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewPlan = async () => {
    if (!goalId) return;

    try {
      const response = await apiClient.post(`/goals/${goalId}/generate-plan`);
      setCurrentPlan(response.data.plan || response.data);
      Alert.alert('Başarı', "Bugünün öğrenme planı oluşturuldu!");
    } catch (error) {
      Alert.alert('Hata', 'Plan oluşturulamadı');
    }
  };

  const handleCompletePlan = async () => {
    if (!currentPlan) return;

    try {
      const response = await apiClient.post(`/plans/${currentPlan.id}/complete`, {
        completed_questions_count: currentPlan.planned_questions_count,
        completed_minutes: currentPlan.planned_minutes,
      });
      setCurrentPlan(response.data);
      Alert.alert('🎉 Başarı!', 'Bugünün planını tamamladınız!');
    } catch (error) {
      Alert.alert('Hata', 'Plan güncellenemedi');
    }
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
        <Text style={styles.title}>Günlük Öğrenme Planı</Text>

        {/* Daily Plan */}
        {currentPlan ? (
          <View style={styles.card}>
            <View style={styles.planHeader}>
              <Text style={styles.planDate}>
                {new Date(currentPlan.start_date).toLocaleDateString('tr-TR')}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  currentPlan.status === 'completed' && styles.statusBadgeCompleted,
                ]}
              >
                <Text style={styles.statusText}>
                  {currentPlan.status === 'completed' ? '✓ Tamamlandı' : '📅 Devam Ediyor'}
                </Text>
              </View>
            </View>

            <View style={styles.planContent}>
              <View style={styles.planItem}>
                <Text style={styles.planLabel}>Planlanan Sorular:</Text>
                <Text style={styles.planValue}>{currentPlan.planned_questions_count}</Text>
              </View>
              <View style={styles.planItem}>
                <Text style={styles.planLabel}>Tamamlanan Sorular:</Text>
                <Text style={styles.planValue}>{currentPlan.completed_questions_count}</Text>
              </View>

              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>Soru İlerlemesi</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${
                          currentPlan.planned_questions_count > 0
                            ? (currentPlan.completed_questions_count /
                                currentPlan.planned_questions_count) *
                              100
                            : 0
                        }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressPercent}>{currentPlan.completion_percent}%</Text>
              </View>

              <View style={styles.planItem}>
                <Text style={styles.planLabel}>Planlanan Süre:</Text>
                <Text style={styles.planValue}>{currentPlan.planned_minutes} dk</Text>
              </View>
              <View style={styles.planItem}>
                <Text style={styles.planLabel}>Harcanan Süre:</Text>
                <Text style={styles.planValue}>{currentPlan.completed_minutes} dk</Text>
              </View>
            </View>

            {currentPlan.status !== 'completed' && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCompletePlan}
              >
                <Text style={styles.primaryButtonText}>Planı Tamamla ✓</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyText}>Bugün için plan oluşturulmamış.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGenerateNewPlan}
            >
              <Text style={styles.primaryButtonText}>Plan Oluştur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weekly Summary */}
        {weeklySummary && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Haftalık Özet</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Toplam Soru</Text>
                <Text style={styles.summaryValue}>{weeklySummary.total_completed}</Text>
                <Text style={styles.summarySubtext}>
                  / {weeklySummary.total_planned} planlanan
                </Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Başarı Oranı</Text>
                <Text style={styles.summaryValue}>{weeklySummary.average_completion}%</Text>
                <Text style={styles.summarySubtext}>ortalama</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Çalışma Günü</Text>
                <Text style={styles.summaryValue}>{weeklySummary.days_completed}</Text>
                <Text style={styles.summarySubtext}>/ 7 gün</Text>
              </View>
            </View>

            <View style={styles.motivationBox}>
              {weeklySummary.average_completion >= 80 ? (
                <Text style={styles.motivationText}>
                  🌟 Harika ilerleme! Böyle devam et!
                </Text>
              ) : weeklySummary.average_completion >= 60 ? (
                <Text style={styles.motivationText}>
                  💪 İyi gidişat! Biraz daha çabala!
                </Text>
              ) : (
                <Text style={styles.motivationText}>
                  📈 Hedeflerin için günlük çalışmaya başla!
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={fetchGoalAndPlan}
        >
          <Text style={styles.secondaryButtonText}>Yenile</Text>
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
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#fff3cd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusBadgeCompleted: {
    backgroundColor: '#d4edda',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#856404',
  },
  planContent: {
    gap: 12,
  },
  planItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  planValue: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
  progressContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  progressLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressPercent: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  summarySubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  motivationBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: 13,
    color: '#0066cc',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
    textAlign: 'center',
  },
});
