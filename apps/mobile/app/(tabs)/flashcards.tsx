import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { getFlashcards, Flashcard } from "@/services/api";
import { calculateSRS, DEFAULT_EASE_FACTOR } from "@/services/srs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

function FlashcardSwipe({
  card,
  onSwipeLeft,
  onSwipeRight,
}: {
  card: Flashcard;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(SCREEN_WIDTH, {}, () => {
          runOnJS(onSwipeRight)();
        });
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(-SCREEN_WIDTH, {}, () => {
          runOnJS(onSwipeLeft)();
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-15, 0, 15])}deg` },
    ],
  }));

  const swipeIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
      [1, 0, 1],
    ),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedCardStyle]}>
        {/* Swipe indicators */}
        <Animated.View style={[styles.swipeIndicator, swipeIndicatorStyle]}>
          <Text style={styles.swipeIndicatorText}>
            {translateX.value > 0 ? "✅ Bildim" : "🔄 Tekrar"}
          </Text>
        </Animated.View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setFlipped((f) => !f)}
          style={styles.cardContent}
        >
          <Text style={styles.topicLabel}>{card.topicName}</Text>
          {!flipped ? (
            <>
              <Text style={styles.cardText}>{card.front}</Text>
              <Text style={styles.tapHint}>Cevabı görmek için dokun</Text>
            </>
          ) : (
            <>
              <Text style={[styles.cardText, styles.answerText]}>
                {card.back}
              </Text>
              <Text style={styles.tapHint}>Soruya dönmek için dokun</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Manual action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.reviewBtn]}
            onPress={onSwipeLeft}
          >
            <Text style={styles.btnText}>🔄 Tekrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.gotItBtn]}
            onPress={onSwipeRight}
          >
            <Text style={styles.btnText}>✅ Bildim</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function FlashcardsScreen() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ known: 0, review: 0 });

  useEffect(() => {
    loadCards();
  }, []);

  async function loadCards() {
    try {
      const data = await getFlashcards("");
      setCards(data);
    } catch {
      // Fallback sample data
      setCards([
        {
          id: "1",
          front: "Anayasanın değiştirilemez maddeleri nelerdir?",
          back: "Madde 1 (Devlet şekli), Madde 2 (Cumhuriyetin nitelikleri), Madde 3 (Devletin bütünlüğü, resmi dili, bayrağı, milli marşı, başkenti)",
          topicId: "anayasa",
          topicName: "Anayasa Hukuku",
          easeFactor: DEFAULT_EASE_FACTOR,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
        },
        {
          id: "2",
          front: "Türkiye'nin en uzun nehri hangisidir?",
          back: "Kızılırmak (1.355 km)",
          topicId: "cografya",
          topicName: "Coğrafya",
          easeFactor: DEFAULT_EASE_FACTOR,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
        },
        {
          id: "3",
          front: "Osmanlı Devleti'nin kurucusu kimdir?",
          back: "Osman Bey (1299)",
          topicId: "tarih",
          topicName: "Tarih",
          easeFactor: DEFAULT_EASE_FACTOR,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSwipeRight() {
    // "Got it" — SM-2 quality = 4 (correct with hesitation)
    const card = cards[currentIndex];
    const result = calculateSRS({
      quality: 4,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
    });
    // In production: send result to API to update card schedule
    console.log("SRS update (known):", result);

    setStats((s) => ({ ...s, known: s.known + 1 }));
    setCurrentIndex((i) => i + 1);
  }

  function handleSwipeLeft() {
    // "Review again" — SM-2 quality = 1 (failed recall)
    const card = cards[currentIndex];
    const result = calculateSRS({
      quality: 1,
      easeFactor: card.easeFactor,
      interval: card.interval,
      repetitions: card.repetitions,
    });
    // In production: send result to API, re-queue card
    console.log("SRS update (review):", result);

    setStats((s) => ({ ...s, review: s.review + 1 }));
    setCurrentIndex((i) => i + 1);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  const isFinished = currentIndex >= cards.length;

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${cards.length > 0 ? (currentIndex / cards.length) * 100 : 0}%`,
            },
          ]}
        />
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.statText}>✅ {stats.known}</Text>
        <Text style={styles.statText}>
          {currentIndex}/{cards.length}
        </Text>
        <Text style={styles.statText}>🔄 {stats.review}</Text>
      </View>

      {isFinished ? (
        <View style={styles.centered}>
          <Text style={styles.finishedEmoji}>🎉</Text>
          <Text style={styles.finishedTitle}>Tebrikler!</Text>
          <Text style={styles.finishedSubtitle}>
            Tüm kartları tamamladınız.{"\n"}
            Bildim: {stats.known} | Tekrar: {stats.review}
          </Text>
          <TouchableOpacity
            style={styles.restartBtn}
            onPress={() => {
              setCurrentIndex(0);
              setStats({ known: 0, review: 0 });
            }}
          >
            <Text style={styles.restartText}>Tekrar Başla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cardContainer}>
          <FlashcardSwipe
            key={cards[currentIndex].id}
            card={cards[currentIndex]}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
          />
        </View>
      )}
    </GestureHandlerRootView>
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
    padding: 24,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e2e8f0",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#1e40af",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  statText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: SCREEN_WIDTH - 48,
    minHeight: 400,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  swipeIndicator: {
    position: "absolute",
    top: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  swipeIndicatorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
  },
  cardContent: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  topicLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  cardText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    textAlign: "center",
    lineHeight: 30,
  },
  answerText: {
    color: "#1e40af",
  },
  tapHint: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 24,
  },
  buttonRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  reviewBtn: {
    backgroundColor: "#fef2f2",
  },
  gotItBtn: {
    backgroundColor: "#f0fdf4",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#334155",
  },
  finishedEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  finishedTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
  },
  finishedSubtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  restartBtn: {
    marginTop: 24,
    backgroundColor: "#1e40af",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  restartText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
