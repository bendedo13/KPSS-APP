import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { testsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Question } from '@kpss/shared';

export default function MiniTestScreen(): React.JSX.Element {
  const { userId } = useAuth();
  const [testId, setTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Array<{ questionId: string; answer: string; timeSpentSeconds: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  const startTest = async (): Promise<void> => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to take a test.');
      return;
    }
    setLoading(true);
    const res = await testsApi.create({ userId, questionCount: 10 });
    if (res.success) {
      setTestId(res.data.testId);
      setQuestions(res.data.questions as Question[]);
      setStartTime(Date.now());
    }
    setLoading(false);
  };

  const selectAnswer = (label: string): void => {
    const question = questions[currentIndex];
    if (!question) return;

    const timeSpentSeconds = Math.round((Date.now() - startTime) / 1000);
    const newAnswers = [
      ...answers,
      { questionId: question.id, answer: label, timeSpentSeconds },
    ];
    setAnswers(newAnswers);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setStartTime(Date.now());
    } else if (testId) {
      testsApi.submit(testId, { answers: newAnswers }).then((res) => {
        if (res.success) {
          Alert.alert('Test Complete', `Score: ${res.data.score}%`);
        }
      });
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} />;

  if (!testId) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.startBtn} onPress={startTest}>
          <Text style={styles.startBtnText}>Start Mini Test</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = questions[currentIndex];
  if (!question) return <Text style={styles.center}>No questions available.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>
        {currentIndex + 1} / {questions.length}
      </Text>
      <Text style={styles.questionText}>{question.text}</Text>
      <View style={styles.options}>
        {question.options.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={styles.option}
            onPress={() => selectAnswer(opt.label)}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <Text style={styles.optionText}>{opt.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  counter: { fontSize: 14, color: '#888', marginBottom: 8 },
  questionText: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  optionLabel: { fontWeight: 'bold', marginRight: 8, fontSize: 16 },
  optionText: { fontSize: 15, flex: 1 },
  startBtn: {
    backgroundColor: '#4f46e5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 40,
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
