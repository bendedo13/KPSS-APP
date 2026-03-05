import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { flashcardsApi } from '../api/client';
import { calculateNextReview } from '@kpss/shared';
import type { Flashcard } from '@kpss/shared';

export default function FlashcardsScreen(): React.JSX.Element {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    flashcardsApi
      .list()
      .then((res) => {
        if (res.success) setCards(res.data.items);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={styles.center} />;

  const card = cards[index];
  if (!card) return <Text style={styles.center}>No flashcards due for review!</Text>;

  const handleQuality = (quality: 0 | 1 | 2 | 3 | 4 | 5): void => {
    const srsResult = calculateNextReview(
      quality,
      card.repetitions,
      card.easeFactor,
      card.interval,
    );
    flashcardsApi.review({ flashcardId: card.id, quality });
    console.log('Next review:', srsResult.nextReviewAt);
    setFlipped(false);
    setIndex((i) => i + 1);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>
        {index + 1} / {cards.length}
      </Text>
      <TouchableOpacity
        style={styles.card}
        onPress={() => setFlipped((f) => !f)}
        activeOpacity={0.8}
      >
        <Text style={styles.cardText}>
          {flipped ? '(Show answer)' : '(Tap to flip)'}
        </Text>
      </TouchableOpacity>
      {flipped && (
        <View style={styles.buttons}>
          {([0, 1, 2, 3, 4, 5] as const).map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.qualityBtn}
              onPress={() => handleQuality(q)}
            >
              <Text>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  counter: { fontSize: 14, color: '#888', marginBottom: 12 },
  card: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#e8f0fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: { fontSize: 18, color: '#333' },
  buttons: { flexDirection: 'row', marginTop: 16, gap: 8 },
  qualityBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
