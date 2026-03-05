/**
 * Flashcards Screen — Tinder-like swipe interface
 *
 * SRS (Spaced Repetition System) logic:
 * - Each card has an interval (days until next review)
 * - Correct swipe (right): interval *= ease_factor (SM-2 algorithm simplified)
 * - Wrong swipe (left): interval = 1 (review tomorrow)
 * - SRS progress is persisted to backend via /flashcards/review
 */

import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { apiClient, type Flashcard } from '../../services/api';

export default function FlashcardsScreen() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const position = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    void loadCards();
  }, []);

  async function loadCards() {
    setLoading(true);
    try {
      const data = await apiClient.getDueFlashcards();
      setCards(data.flashcards);
      setCurrentIndex(0);
      setDone(false);
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  }

  async function swipeCard(correct: boolean) {
    const card = cards[currentIndex];

    // Persist SRS result to backend
    try {
      await apiClient.reviewFlashcard(card.id, correct);
    } catch (err) {
      console.error('Failed to save flashcard review:', err);
      // Continue anyway — don't block the UI
    }

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

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 120) {
        void swipeCard(true);
      } else if (gesture.dx < -120) {
        void swipeCard(false);
      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  if (done || cards.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1e40af', textAlign: 'center' }}>
          {cards.length === 0 ? '✨ Bugün tekrar edilecek kart yok!' : '🎉 Tüm kartlar tamamlandı!'}
        </Text>
        <TouchableOpacity onPress={() => void loadCards()} style={styles.button}>
          <Text style={styles.buttonText}>Yenile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = cards[currentIndex];
  const rotate = position.x.interpolate({ inputRange: [-200, 200], outputRange: ['-10deg', '10deg'] });

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>{currentIndex + 1} / {cards.length}</Text>

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
        <TouchableOpacity onPress={() => void swipeCard(false)} style={[styles.actionBtn, { backgroundColor: '#ef4444' }]}>
          <Text style={styles.actionText}>✗ Yanlış</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => void swipeCard(true)} style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}>
          <Text style={styles.actionText}>✓ Doğru</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  counter: { textAlign: 'center', fontSize: 14, color: '#6b7280', marginBottom: 16 },
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
