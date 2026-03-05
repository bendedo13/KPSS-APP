import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

interface LearningGoal {
  id: string;
  target_score: number;
  target_date: string;
  focus_topics: string[];
  difficulty_preference: string;
  daily_goal_minutes: number;
  current_estimated_score: number | null;
  current_progress_percent: number | null;
  status: string;
}

export default function LearningGoalScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [targetScore, setTargetScore] = useState('100');
  const [targetDate, setTargetDate] = useState('');
  const [focusTopics, setFocusTopics] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');
  const [dailyMinutes, setDailyMinutes] = useState('60');

  useEffect(() => {
    fetchGoal();
  }, []);

  const fetchGoal = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/goals');
      setGoal(response.data);
    } catch (error) {
      if ((error as any)?.status === 404) {
        setGoal(null);
      } else {
        Alert.alert('Hata', 'Hedef alınamadı');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    try {
      if (!targetScore || !targetDate) {
        Alert.alert('Hata', 'Tüm alanları doldurunuz');
        return;
      }

      const topicsArray = focusTopics
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t);

      const response = await apiClient.post('/goals', {
        target_score: parseInt(targetScore),
        target_date: targetDate,
        focus_topics: topicsArray,
        difficulty_preference: difficulty,
        daily_goal_minutes: parseInt(dailyMinutes),
      });

      setGoal(response.data);
      setModalVisible(false);
      Alert.alert('Başarı', 'Öğrenme hedefi oluşturuldu!');
    } catch (error) {
      Alert.alert('Hata', 'Hedef oluşturulamadı');
    }
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Öğrenme Hedefi Belirle</Text>
          <Text style={styles.description}>
            Hedefini belirle, sistemi seni rehber etsin. Adaptif öğrenme planını başlat!
          </Text>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.primaryButtonText}>Hedef Oluştur</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal animationType="slide" transparent={true} visible={modalVisible}>
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Yeni Öğrenme Hedefi</Text>

              <Text style={styles.label}>Hedef Puan (0-120)</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                keyboardType="number-pad"
                value={targetScore}
                onChangeText={setTargetScore}
              />

              <Text style={styles.label}>Sınav Tarihi (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-12-31"
                value={targetDate}
                onChangeText={setTargetDate}
              />

              <Text style={styles.label}>Günlük Çalışma Süresi (dakika)</Text>
              <TextInput
                style={styles.input}
                placeholder="60"
                keyboardType="number-pad"
                value={dailyMinutes}
                onChangeText={setDailyMinutes}
              />

              <Text style={styles.label}>Zorluk Seviyesi</Text>
              <View style={styles.difficultyContainer}>
                {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.difficultyButton,
                      difficulty === d && styles.difficultyButtonActive,
                    ]}
                    onPress={() => setDifficulty(d)}
                  >
                    <Text
                      style={[
                        styles.difficultyButtonText,
                        difficulty === d && styles.difficultyButtonTextActive,
                      ]}
                    >
                      {d === 'easy' ? 'Kolay' : d === 'medium' ? 'Orta' : d === 'hard' ? 'Zor' : 'Karışık'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Odaklanacak Konular (virgülle ayırın)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Türk Dili, Tarih, Coğrafya"
                multiline
                numberOfLines={3}
                value={focusTopics}
                onChangeText={setFocusTopics}
              />

              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.secondaryButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleCreateGoal}
                >
                  <Text style={styles.primaryButtonText}>Oluştur</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const daysRemaining = getDaysRemaining(goal.target_date);
  const scoreGap = goal.target_score - (goal.current_estimated_score || 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Öğrenme Hedefiniz</Text>

        {/* Goal Summary Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hedef Puan: {goal.target_score}/120</Text>
          <Text style={styles.cardSubtitle}>Sınav Tarihi: {goal.target_date}</Text>
          <Text style={styles.cardSubtitle}>Kalan Gün: {daysRemaining > 0 ? daysRemaining : 'Başlamış'}</Text>
        </View>

        {/* Score Progress */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tahmini Puan İlerlemesi</Text>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreProgress,
                {
                  width: `${Math.min((goal.current_estimated_score || 0) / goal.target_score * 100, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.scoreText}>
            {goal.current_estimated_score || 0} / {goal.target_score} puan
          </Text>
          <Text style={styles.scoreText}>İlerleme: {goal.current_progress_percent || 0}%</Text>
          {scoreGap > 0 && (
            <Text style={styles.gapText}>
              🎯 {scoreGap} puan daha gerekli!
            </Text>
          )}
        </View>

        {/* Focus Topics */}
        {goal.focus_topics.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Odaklanacak Konular</Text>
            <View style={styles.topicsContainer}>
              {goal.focus_topics.map((topic, idx) => (
                <View key={idx} style={styles.topicBadge}>
                  <Text style={styles.topicText}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Goal Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ayarlar</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Günlük Hedef Çalışma:</Text>
            <Text style={styles.settingValue}>{goal.daily_goal_minutes} dakika</Text>
          </View>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Zorluk Tercihi:</Text>
            <Text style={styles.settingValue}>
              {goal.difficulty_preference === 'easy'
                ? 'Kolay'
                : goal.difficulty_preference === 'medium'
                ? 'Orta'
                : goal.difficulty_preference === 'hard'
                ? 'Zor'
                : 'Karışık'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.primaryButtonText}>Hedefi Düzenle</Text>
          </TouchableOpacity>
        </View>
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 20,
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
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreBar: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  scoreText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  gapText: {
    fontSize: 14,
    color: '#ff9800',
    fontWeight: '500',
    marginTop: 8,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicBadge: {
    backgroundColor: '#e3f2fd',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  topicText: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: '500',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
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
    flex: 1,
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  multilineInput: {
    textAlignVertical: 'top',
    height: 80,
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  difficultyButtonActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  difficultyButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  difficultyButtonTextActive: {
    color: 'white',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
});
