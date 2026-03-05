/**
 * Flashcards Screen — Tinder-like swipe interface
 *
 * SRS (Spaced Repetition System) logic:
 * - Each card has an interval (days until next review)
 * - Correct swipe (right): interval *= 2.5 (SM-2 algorithm simplified)
 * - Wrong swipe (left): interval = 1 (review tomorrow)
 * - Ease factor adjusts based on performance
 */

import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { useState, useRef } from 'react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  interval_days: number;
  ease_factor: number;
}

// Stub data — replace with API call
const STUB_CARDS: Flashcard[] = [
  { id: '1', front: 'TBMM ne zaman açıldı?', back: '23 Nisan 1920', topic: 'Tarih', interval_days: 1, ease_factor: 2.5 },
  { id: '2', front: 'Türkiye\'nin başkenti neresidir?', back: 'Ankara', topic: 'Coğrafya', interval_days: 1, ease_factor: 2.5 },
  { id: '3', front: 'Atatürk hangi yıl doğmuştur?', back: '1881', topic: 'Tarih', interval_days: 1, ease_factor: 2.5 },
];

// SRS interval calculation (SM-2 simplified)
function calculateNextInterval(card: Flashcard, correct: boolean): { interval_days: number; ease_factor: number } {
  if (!correct) {
    return { interval_days: 1, ease_factor: Math.max(1.3, card.ease_factor - 0.2) };
  }
  return {
    interval_days: Math.round(card.interval_days * card.ease_factor),
    ease_factor: Math.min(3.0, card.ease_factor + 0.1),
  };
}

export default function FlashcardsScreen() {
  const [cards] = useState<Flashcard[]>(STUB_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 120) {
        swipeCard(true);
      } else if (gesture.dx < -120) {
        swipeCard(false);
      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  });

  function swipeCard(correct: boolean) {
    const card = cards[currentIndex];
    const updated = calculateNextInterval(card, correct);
    // TODO: Save updated SRS data to API
    console.log(`Card ${card.id} next review in ${updated.interval_days} days`);

    Animated.timing(position, {
      toValue: { x: correct ? 500 : -500, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setFlipped(false);
      if (currentIndex + 1 >= cards.length) {
        setDone(true);
      } else {
        setCurrentIndex((i) => i + 1);
      }
    });
  }

  if (done) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e40af' }}>🎉 Tüm kartlar tamamlandı!</Text>
        <TouchableOpacity onPress={() => { setCurrentIndex(0); setDone(false); }} style={styles.button}>
          <Text style={styles.buttonText}>Tekrar Başla</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = cards[currentIndex];
  const rotate = position.x.interpolate({ inputRange: [-200, 200], outputRange: ['-10deg', '10deg'] });

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>{currentIndex + 1} / {cards.length}</Text>
      <Text style={styles.topic}>{card.topic}</Text>

      <Animated.View
        style={[styles.card, { transform: [{ translateX: position.x }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={() => setFlipped(!flipped)} style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.cardLabel}>{flipped ? 'CEVAP' : 'SORU'}</Text>
          <Text style={styles.cardText}>{flipped ? card.back : card.front}</Text>
          {!flipped && <Text style={styles.tapHint}>Cevabı görmek için dokun</Text>}
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.actions}>
        <TouchableOpacity onPress={() => swipeCard(false)} style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}>
          <Text style={styles.actionText}>✗ Yanlış</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => swipeCard(true)} style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}>
          <Text style={styles.actionText}>✓ Doğru</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  counter: { textAlign: 'center', fontSize: 14, color: '#6b7280', marginBottom: 4 },
  topic: { textAlign: 'center', fontSize: 13, color: '#1e40af', fontWeight: '500', marginBottom: 16 },
  card: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 24 },
  cardLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  cardText: { fontSize: 20, color: '#111827', textAlign: 'center', lineHeight: 30 },
  tapHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 24 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionBtn: { flex: 1, padding: 16, borderRadius: 10, alignItems: 'center' },
  actionText: { color: 'white', fontWeight: '700', fontSize: 16 },
  button: { backgroundColor: '#1e40af', padding: 16, borderRadius: 10, marginTop: 24 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
