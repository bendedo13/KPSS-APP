import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { apiClient, TestQuestion, TestSubmitResult } from '../../services/api';

export default function MiniTestScreen() {
  const [phase, setPhase] = useState<'setup' | 'test' | 'result'>('setup');
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [testId, setTestId] = useState<string>('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestSubmitResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function startTest() {
    setLoading(true);
    try {
      const data = await apiClient.createTest({ question_count: 10, difficulty: 'mixed' });
      setQuestions(data.questions);
      setTestId(data.test_id);
      setAnswers({});
      setPhase('test');
    } catch (err) {
      console.error('Failed to create test:', err);
    } finally {
      setLoading(false);
    }
  }

  async function submitTest() {
    setLoading(true);
    try {
      const answerList = Object.entries(answers).map(([question_id, selected_option]) => ({
        question_id,
        selected_option,
      }));
      const data = await apiClient.submitTest(testId, answerList);
      setResult(data);
      setPhase('result');
    } catch (err) {
      console.error('Failed to submit test:', err);
    } finally {
      setLoading(false);
    }
  }

  if (phase === 'setup') {
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Mini Test</Text>
        <Text style={styles.subheading}>10 soruluk karışık zorlukta test</Text>
        <TouchableOpacity onPress={startTest} style={styles.startBtn} disabled={loading}>
          <Text style={styles.startBtnText}>{loading ? 'Hazırlanıyor...' : 'Testi Başlat'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'result' && result) {
    const color = result.score_percent >= 70 ? '#22c55e' : result.score_percent >= 50 ? '#f59e0b' : '#ef4444';
    return (
      <View style={styles.centered}>
        <Text style={styles.heading}>Sonuç</Text>
        <Text style={[styles.scoreText, { color }]}>{result.score_percent}%</Text>
        <Text style={styles.subheading}>{result.score}/{result.total_questions} doğru</Text>
        {result.wrongs_added > 0 && (
          <Text style={{ color: '#ef4444', marginTop: 8 }}>{result.wrongs_added} soru Yanlış Defteri&apos;ne eklendi</Text>
        )}
        <TouchableOpacity onPress={() => setPhase('setup')} style={styles.startBtn}>
          <Text style={styles.startBtnText}>Yeni Test</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.progressText}>{Object.keys(answers).length}/{questions.length} cevaplandı</Text>
      {questions.map((q, idx) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.questionNumber}>Soru {idx + 1}</Text>
          <Text style={styles.questionText}>{q.text}</Text>
          {q.options.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={() => setAnswers({ ...answers, [q.id]: opt.label })}
              style={[styles.option, answers[q.id] === opt.label && styles.optionSelected]}
            >
              <Text style={[styles.optionText, answers[q.id] === opt.label && styles.optionTextSelected]}>
                {opt.label}. {opt.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <TouchableOpacity
        onPress={submitTest}
        style={[styles.submitBtn, loading && { opacity: 0.5 }]}
        disabled={loading}
      >
        <Text style={styles.startBtnText}>{loading ? 'Gönderiliyor...' : 'Testi Bitir'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', padding: 32 },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#1e40af', marginBottom: 8 },
  subheading: { fontSize: 15, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
  scoreText: { fontSize: 64, fontWeight: 'bold', marginVertical: 16 },
  startBtn: { backgroundColor: '#1e40af', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 10 },
  submitBtn: { backgroundColor: '#1e40af', padding: 16, borderRadius: 10, marginTop: 8, marginBottom: 32, alignItems: 'center' },
  startBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  progressText: { color: '#6b7280', marginBottom: 12 },
  questionCard: { backgroundColor: 'white', borderRadius: 8, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  questionNumber: { fontSize: 12, color: '#1e40af', fontWeight: '600', marginBottom: 8 },
  questionText: { fontSize: 15, color: '#111827', marginBottom: 12, lineHeight: 22 },
  option: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 12, marginBottom: 6 },
  optionSelected: { borderColor: '#1e40af', backgroundColor: '#eff6ff' },
  optionText: { fontSize: 14, color: '#374151' },
  optionTextSelected: { color: '#1e40af', fontWeight: '600' },
});
