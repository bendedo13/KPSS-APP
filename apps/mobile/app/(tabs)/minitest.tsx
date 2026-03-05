import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { createTest, submitTest, TestQuestion, TestResult } from "@/services/api";

type Phase = "start" | "quiz" | "results";

export default function MiniTestScreen() {
  const [phase, setPhase] = useState<Phase>("start");
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [testId, setTestId] = useState("");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function startTest() {
    setLoading(true);
    try {
      const data = await createTest("", undefined, 5);
      setQuestions(data.questions);
      setTestId(data.testId);
    } catch {
      // Fallback sample questions
      setTestId("sample-test");
      setQuestions([
        {
          id: "q1",
          text: "Türkiye Cumhuriyeti'nin ilk cumhurbaşkanı kimdir?",
          options: [
            { label: "A", text: "İsmet İnönü" },
            { label: "B", text: "Mustafa Kemal Atatürk" },
            { label: "C", text: "Celal Bayar" },
            { label: "D", text: "Adnan Menderes" },
            { label: "E", text: "Fevzi Çakmak" },
          ],
          topicId: "tarih",
          topicName: "Tarih",
        },
        {
          id: "q2",
          text: "Aşağıdakilerden hangisi Anayasa Mahkemesi'nin görevlerinden biri değildir?",
          options: [
            { label: "A", text: "Kanunların anayasaya uygunluğunu denetlemek" },
            { label: "B", text: "Cumhurbaşkanını yargılamak" },
            { label: "C", text: "Parti kapatma davalarına bakmak" },
            { label: "D", text: "Bütçe kanununu onaylamak" },
            { label: "E", text: "Milletvekilliği düşmesine itirazları incelemek" },
          ],
          topicId: "anayasa",
          topicName: "Anayasa Hukuku",
        },
        {
          id: "q3",
          text: "Hangisi bir iç denizdir?",
          options: [
            { label: "A", text: "Karadeniz" },
            { label: "B", text: "Akdeniz" },
            { label: "C", text: "Hazar Denizi" },
            { label: "D", text: "Kızıldeniz" },
            { label: "E", text: "Ege Denizi" },
          ],
          topicId: "cografya",
          topicName: "Coğrafya",
        },
        {
          id: "q4",
          text: "1 + 1 = ?",
          options: [
            { label: "A", text: "1" },
            { label: "B", text: "2" },
            { label: "C", text: "3" },
            { label: "D", text: "4" },
            { label: "E", text: "5" },
          ],
          topicId: "matematik",
          topicName: "Matematik",
        },
        {
          id: "q5",
          text: "Osmanlı Devleti hangi yılda kurulmuştur?",
          options: [
            { label: "A", text: "1071" },
            { label: "B", text: "1243" },
            { label: "C", text: "1299" },
            { label: "D", text: "1326" },
            { label: "E", text: "1453" },
          ],
          topicId: "tarih",
          topicName: "Tarih",
        },
      ]);
    } finally {
      setLoading(false);
      setPhase("quiz");
      setCurrentQ(0);
      setAnswers({});
      setResult(null);
    }
  }

  function selectAnswer(questionId: string, label: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: label }));
  }

  function goNext() {
    if (currentQ < questions.length - 1) {
      setCurrentQ((q) => q + 1);
    }
  }

  function goPrev() {
    if (currentQ > 0) {
      setCurrentQ((q) => q - 1);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const payload = Object.entries(answers).map(([questionId, selected]) => ({
        questionId,
        selected,
      }));
      const res = await submitTest("", testId, payload);
      setResult(res);
    } catch {
      // Fallback: generate local result with sample correct answers
      const correctAnswers: Record<string, string> = {
        q1: "B",
        q2: "D",
        q3: "C",
        q4: "B",
        q5: "C",
      };
      const resultAnswers = questions.map((q) => ({
        questionId: q.id,
        selected: answers[q.id] || "",
        correct: correctAnswers[q.id] || "A",
        isCorrect: answers[q.id] === correctAnswers[q.id],
      }));
      setResult({
        testId,
        score: resultAnswers.filter((a) => a.isCorrect).length,
        total: questions.length,
        answers: resultAnswers,
      });
    } finally {
      setLoading(false);
      setPhase("results");
    }
  }

  // ─── Start screen ──────────────────────────────────────────────
  if (phase === "start") {
    return (
      <View style={styles.centered}>
        <Text style={styles.startEmoji}>✍️</Text>
        <Text style={styles.startTitle}>Mini Test</Text>
        <Text style={styles.startSubtitle}>
          5 soruluk hızlı bir test ile bilgini ölç
        </Text>
        <TouchableOpacity style={styles.startBtn} onPress={startTest}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>Teste Başla</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Results screen ────────────────────────────────────────────
  if (phase === "results" && result) {
    const pct = Math.round((result.score / result.total) * 100);
    return (
      <ScrollView style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultEmoji}>{pct >= 70 ? "🎉" : "💪"}</Text>
          <Text style={styles.resultScore}>
            {result.score}/{result.total}
          </Text>
          <Text style={styles.resultPct}>%{pct} Doğruluk</Text>
        </View>

        {result.answers.map((a, idx) => {
          const q = questions.find((q) => q.id === a.questionId);
          return (
            <View
              key={a.questionId}
              style={[
                styles.resultCard,
                a.isCorrect ? styles.correctCard : styles.wrongCard,
              ]}
            >
              <Text style={styles.resultQNum}>Soru {idx + 1}</Text>
              <Text style={styles.resultQText}>{q?.text}</Text>
              <Text style={styles.resultAnswer}>
                Senin cevabın: {a.selected || "–"}{" "}
                {a.isCorrect ? "✅" : "❌"}
              </Text>
              {!a.isCorrect && (
                <Text style={styles.correctAnswerText}>
                  Doğru cevap: {a.correct}
                </Text>
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => setPhase("start")}
        >
          <Text style={styles.retryText}>Yeni Test</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ─── Quiz screen ───────────────────────────────────────────────
  const question = questions[currentQ];
  const allAnswered = questions.every((q) => answers[q.id]);

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentQ + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        Soru {currentQ + 1}/{questions.length}
      </Text>

      <ScrollView style={styles.quizContent}>
        <Text style={styles.topicBadge}>{question.topicName}</Text>
        <Text style={styles.questionText}>{question.text}</Text>

        {question.options.map((opt) => {
          const isSelected = answers[question.id] === opt.label;
          return (
            <TouchableOpacity
              key={opt.label}
              style={[styles.optionBtn, isSelected && styles.optionSelected]}
              onPress={() => selectAnswer(question.id, opt.label)}
            >
              <Text
                style={[
                  styles.optionLabel,
                  isSelected && styles.optionLabelSelected,
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {opt.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, currentQ === 0 && styles.navBtnDisabled]}
          onPress={goPrev}
          disabled={currentQ === 0}
        >
          <Text style={styles.navBtnText}>← Önceki</Text>
        </TouchableOpacity>

        {currentQ < questions.length - 1 ? (
          <TouchableOpacity style={styles.navBtn} onPress={goNext}>
            <Text style={styles.navBtnText}>Sonraki →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, !allAnswered && styles.navBtnDisabled]}
            onPress={handleSubmit}
            disabled={!allAnswered || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Bitir</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
    padding: 32,
    backgroundColor: "#f1f5f9",
  },
  startEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
  },
  startSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  startBtn: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e2e8f0",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#1e40af",
  },
  progressText: {
    textAlign: "center",
    padding: 8,
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  quizContent: {
    flex: 1,
    padding: 16,
  },
  topicBadge: {
    fontSize: 12,
    color: "#1e40af",
    backgroundColor: "#dbeafe",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    fontWeight: "600",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    lineHeight: 28,
    marginBottom: 20,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  optionSelected: {
    borderColor: "#1e40af",
    backgroundColor: "#eff6ff",
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#64748b",
    marginRight: 12,
    width: 28,
  },
  optionLabelSelected: {
    color: "#1e40af",
  },
  optionText: {
    fontSize: 15,
    color: "#334155",
    flex: 1,
  },
  optionTextSelected: {
    color: "#1e293b",
    fontWeight: "500",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },
  navBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  submitBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#1e40af",
  },
  submitText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
  },
  // Results
  resultHeader: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultScore: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#1e293b",
  },
  resultPct: {
    fontSize: 18,
    color: "#64748b",
    marginTop: 4,
  },
  resultCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  correctCard: {
    backgroundColor: "#f0fdf4",
    borderLeftColor: "#22c55e",
  },
  wrongCard: {
    backgroundColor: "#fef2f2",
    borderLeftColor: "#ef4444",
  },
  resultQNum: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
    marginBottom: 4,
  },
  resultQText: {
    fontSize: 15,
    color: "#1e293b",
    marginBottom: 8,
  },
  resultAnswer: {
    fontSize: 14,
    color: "#334155",
  },
  correctAnswerText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
    marginTop: 4,
  },
  retryBtn: {
    margin: 16,
    marginBottom: 32,
    backgroundColor: "#1e40af",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  retryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
