import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { apiClient } from '../../services/api';

interface Question {
  id: string;
  text: string;
  options: Array<{ label: string; text: string }>;
}

interface TestResult {
  score: number;
  total: number;
  percentage: number;
  wrong_question_ids: string[];
}

export default function MiniTestScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [testId, setTestId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const startTest = async () => {
    setLoading(true);
    try {
      const data = await apiClient.post<{ test_id: string; questions: Question[] }>('/tests/create', { question_count: 5 });
      setTestId(data.test_id);
      setQuestions(data.questions);
      setAnswers({});
      setResult(null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const submitTest = async () => {
    if (!testId) return;
    setLoading(true);
    try {
      const answerList = Object.entries(answers).map(([question_id, selected_option]) => ({ question_id, selected_option }));
      const data = await apiClient.post<TestResult>(`/tests/${testId}/submit`, { answers: answerList });
      setResult(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  if (result) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sonuç</Text>
        <Text style={styles.score}>{result.score} / {result.total} (%{result.percentage})</Text>
        <TouchableOpacity style={styles.btn} onPress={() => { setResult(null); setQuestions([]); }}>
          <Text style={styles.btnText}>Yeni Test</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mini Test</Text>
        <TouchableOpacity style={styles.btn} onPress={startTest} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Yükleniyor...' : 'Testi Başlat'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll}>
      <Text style={styles.title}>Test ({questions.length} Soru)</Text>
      {questions.map((q, idx) => (
        <View key={q.id} style={styles.questionCard}>
          <Text style={styles.questionText}>{idx + 1}. {q.text}</Text>
          {q.options.map(o => (
            <TouchableOpacity
              key={o.label}
              style={[styles.option, answers[q.id] === o.label && styles.selectedOption]}
              onPress={() => setAnswers(prev => ({ ...prev, [q.id]: o.label }))}
            >
              <Text>{o.label}) {o.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
      <TouchableOpacity style={[styles.btn, { margin: 16 }]} onPress={submitTest} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Gönderiliyor...' : 'Testi Bitir'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  scroll: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', margin: 16 },
  score: { fontSize: 48, fontWeight: 'bold', color: '#22c55e', margin: 16 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 14, minWidth: 160, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  questionCard: { backgroundColor: '#fff', margin: 12, borderRadius: 8, padding: 16, elevation: 2 },
  questionText: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  option: { padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 6 },
  selectedOption: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
});
