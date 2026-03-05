import { View, Text, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { useRef, useState } from 'react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty?: number;
}

// SRS logic: next review interval based on quality rating (SM-2 simplified)
// Quality scale (0-5): 0-2 = wrong/very hard, 3 = hard but correct, 4 = correct, 5 = easy
// SM-2 reference: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
function srsNextInterval(currentInterval: number, quality: number): number {
  if (quality < 3) return 1; // Wrong — review again tomorrow
  if (currentInterval === 0) return 1;
  if (currentInterval === 1) return 6;
  return Math.round(currentInterval * 2.5); // Simplified: full SM-2 adjusts ease factor per card
}

const SAMPLE_CARDS: Flashcard[] = [
  { id: '1', front: 'Türkiye\'nin başkenti?', back: 'Ankara' },
  { id: '2', front: 'TBMM kaç milletvekili?', back: '600 milletvekili' },
  { id: '3', front: '1923 Yılında ne oldu?', back: 'Türkiye Cumhuriyeti kuruldu' },
];

export default function FlashcardsScreen() {
  const [cards] = useState<Flashcard[]>(SAMPLE_CARDS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gestureState) => {
      if (Math.abs(gestureState.dx) > 120) {
        // Swiped left (dx < 0) = don't know, right = know
        const quality = gestureState.dx > 0 ? 5 : 2;
        const card = cards[currentIdx];
        const interval = srsNextInterval(1, quality);
        console.log(`Card ${card.id}: quality=${quality}, next review in ${interval} days`);

        Animated.spring(pan, { toValue: { x: gestureState.dx > 0 ? 500 : -500, y: 0 }, useNativeDriver: false }).start(() => {
          pan.setValue({ x: 0, y: 0 });
          setShowBack(false);
          setCurrentIdx(prev => (prev + 1) % cards.length);
        });
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      }
    },
  });

  if (cards.length === 0) return <Text style={{ padding: 20 }}>Kart yok.</Text>;
  const card = cards[currentIdx];

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>{currentIdx + 1} / {cards.length}</Text>
      <Animated.View
        style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: pan.x.interpolate({ inputRange: [-200, 200], outputRange: ['-10deg', '10deg'] }) }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity onPress={() => setShowBack(prev => !prev)} style={styles.cardInner}>
          <Text style={styles.cardText}>{showBack ? card.back : card.front}</Text>
          <Text style={styles.hint}>{showBack ? 'Ön yüze dön' : 'Cevabı gör'}</Text>
        </TouchableOpacity>
      </Animated.View>
      <Text style={styles.swipeHint}>← Bilmiyorum  |  Biliyorum →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4f8' },
  counter: { fontSize: 14, color: '#888', marginBottom: 16 },
  card: { width: 320, height: 200, backgroundColor: '#fff', borderRadius: 16, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10 },
  cardInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  cardText: { fontSize: 20, textAlign: 'center', fontWeight: '600' },
  hint: { fontSize: 12, color: '#aaa', marginTop: 12 },
  swipeHint: { marginTop: 24, color: '#888', fontSize: 14 },
});
