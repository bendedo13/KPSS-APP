import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { apiClient } from '../api/client';

interface VoiceQuestion {
  id: number;
  test_id: number;
  question_id: number;
  voice_prompt_url: string;
  voice_prompt_duration_seconds: number | null;
  voice_prompt_language: string;
}

interface VoiceAnswerScreenProps {
  route: { params: { voiceQuestion: VoiceQuestion } };
  navigation?: any;
}

export default function VoiceAnswerScreen({ route, navigation }: VoiceAnswerScreenProps) {
  const insets = useSafeAreaInsets();
  const { voiceQuestion } = route.params;
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recordingTimerRef = useRef<NodeJS.Timeout>();

  const startPlayingPrompt = async () => {
    try {
      setIsPlayingPrompt(true);
      const { sound } = await Audio.Sound.createAsync({ uri: voiceQuestion.voice_prompt_url });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(({ didJustFinish }) => {
        if (didJustFinish) setIsPlayingPrompt(false);
      });
    } catch {
      Alert.alert('Hata', 'Ses oynatılamadı');
      setIsPlayingPrompt(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch {
      Alert.alert('Hata', 'Kayıt başlatılamadı');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      const uri = recording.getURI();
      if (uri && recordingTime > 1) {
        submitAnswer(uri, recordingTime);
      } else {
        Alert.alert('Hata', 'En az 1 saniye sesli cevap kaydedin');
        setRecording(null);
      }
    } catch {
      Alert.alert('Hata', 'Kayıt durdurulamadı');
    }
  };

  const submitAnswer = async (voiceAnswerUrl: string, durationSeconds: number) => {
    try {
      setSubmitting(true);
      const answerText = `Voice answer recorded for ${durationSeconds} seconds`;

      const response = await apiClient.post(`/voice-questions/${voiceQuestion.id}/answer`, {
        voiceAnswerUrl,
        answerText,
        durationSeconds,
      });

      Alert.alert('Başarılı', 'Sesli cevabınız kaydedildi', [
        {
          text: 'Tamam',
          onPress: () => {
            if (navigation) navigation.goBack();
          },
        },
      ]);
    } catch {
      Alert.alert('Hata', 'Cevap gönderilemedi');
    } finally {
      setSubmitting(false);
      setRecording(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>🎤 Sesli Cevap Ver</Text>

      {/* Step 1: Listen to Prompt */}
      <View style={styles.card}>
        <Text style={styles.stepTitle}>1. Soruyu Dinle</Text>
        <TouchableOpacity
          style={[styles.button, isPlayingPrompt && styles.buttonActive]}
          onPress={startPlayingPrompt}
          disabled={isPlayingPrompt || isRecording}
        >
          <Text style={styles.buttonText}>
            {isPlayingPrompt ? '🔊 Oynatılıyor...' : '▶️ Soruyu Dinle'}
          </Text>
        </TouchableOpacity>
        {voiceQuestion.voice_prompt_duration_seconds && (
          <Text style={styles.hint}>
            Soru süresi: {voiceQuestion.voice_prompt_duration_seconds} saniye
          </Text>
        )}
      </View>

      {/* Step 2: Record Answer */}
      <View style={styles.card}>
        <Text style={styles.stepTitle}>2. Sesli Cevap Kaydet</Text>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingPulse} />
            <Text style={styles.recordingText}>Kaydediliyor: {formatTime(recordingTime)}</Text>
          </View>
        )}

        {!recording && !isRecording && (
          <TouchableOpacity style={[styles.button, styles.recordButton]} onPress={startRecording}>
            <Text style={styles.buttonText}>🔴 Kaydetmeye Başla</Text>
          </TouchableOpacity>
        )}

        {recording && isRecording && (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopRecording}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>⏹️ Kaydı Bitir</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>Cevabınızı 30 saniyeden fazla olmayacak şekilde kaydedin</Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>💡 İpuçları</Text>
        <Text style={styles.instructionText}>• Soruyu dikkatlice dinleyin</Text>
        <Text style={styles.instructionText}>• Açık ve net bir şekilde konuşun</Text>
        <Text style={styles.instructionText}>• Arka plandaki gürültüyü azaltın</Text>
        <Text style={styles.instructionText}>• Cevabınızı eksiksiz olarak verin</Text>
      </View>

      {submitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Cevap gönderiliyor...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12 },
  stepTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#0066cc' },
  button: { backgroundColor: '#0066cc', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginBottom: 8 },
  buttonActive: { backgroundColor: '#0052a3' },
  buttonText: { fontSize: 16, fontWeight: '600', color: 'white' },
  recordButton: { backgroundColor: '#e74c3c' },
  stopButton: { backgroundColor: '#f39c12' },
  recordingIndicator: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: '#ffe0e0', borderRadius: 8, marginBottom: 12 },
  recordingPulse: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e74c3c' },
  recordingText: { fontSize: 14, fontWeight: '600', color: '#e74c3c' },
  hint: { fontSize: 12, color: '#999', marginTop: 8, fontStyle: 'italic' },
  instructionsCard: { backgroundColor: '#e8f4f8', borderRadius: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: '#0066cc' },
  instructionsTitle: { fontSize: 14, fontWeight: '600', color: '#0066cc', marginBottom: 8 },
  instructionText: { fontSize: 12, color: '#555', marginBottom: 6 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  loadingText: { color: 'white', marginTop: 12, fontSize: 14, fontWeight: '600' },
});
