import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

export default function ExamSimulationScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [examStarted, setExamStarted] = useState(false);

  const startExam = async () => {
    try {
      setLoading(true);
      const res = await apiClient.post('/exams/start', { exam_type: 'full_mock', total_questions: 100 });
      setExamStarted(true);
      Alert.alert('Sınav Başladı', `Session: ${res.data.id}`);
    } catch {
      Alert.alert('Hata', 'Sınav başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sınav Simülasyonu</Text>
        
        {!examStarted ? (
          <View style={styles.card}>
            <Text style={styles.subtitle}>KPSS'ye hazırlanın - Gerçekçi zaman sınırı</Text>
            
            <TouchableOpacity style={styles.examButton} onPress={startExam} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.examButtonText}>Full Mock Sınav Başlat</Text>}
            </TouchableOpacity>

            <Text style={styles.info}>⏱️ 180 dakika | 100 soru | Gerçekçi zaman sınırı</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.successText}>✅ Sınav Başladı</Text>
            <Text style={styles.infoText}>Uygulamada soruları çözmek için analitiğe git</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 16 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16 },
  examButton: { backgroundColor: '#0066cc', padding: 14, borderRadius: 8, alignItems: 'center' },
  examButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  info: { marginTop: 12, fontSize: 12, color: '#999', textAlign: 'center' },
  successText: { fontSize: 18, color: '#4CAF50', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  infoText: { fontSize: 12, color: '#666', textAlign: 'center' },
});
