import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface Streak {
  current_streak: number;
  longest_streak: number;
  last_studied_at: string | null;
}

interface Badge {
  badge: { icon: string; title: string; description: string };
  earned_at: string;
}

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const [streakRes, badgesRes] = await Promise.all([
        apiClient.get('/user/streak'),
        apiClient.get('/user/badges'),
      ]);
      setStreak(streakRes.data);
      setBadges(badgesRes.data);
    } catch {
      Alert.alert('Hata', 'Veriler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={[styles.container, { paddingTop: insets.top }]}><ActivityIndicator /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🏆 Başarılarım</Text>

        {streak && (
          <View style={styles.streakCard}>
            <View style={styles.streakItem}>
              <Text style={styles.streakValue}>{streak.current_streak}</Text>
              <Text style={styles.streakLabel}>Günlük Seri</Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={styles.streakValue}>{streak.longest_streak}</Text>
              <Text style={styles.streakLabel}>En Uzun Seri</Text>
            </View>
          </View>
        )}

        {badges.length > 0 && (
          <View>
            <Text style={styles.badgesTitle}>Kazanılan Badge'ler</Text>
            <View style={styles.badgesGrid}>
              {badges.map((b, idx) => (
                <View key={idx} style={styles.badgeCard}>
                  <Text style={styles.badgeIcon}>{b.badge.icon}</Text>
                  <Text style={styles.badgeTitle}>{b.badge.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {badges.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Henüz badge kazanılmadı. Çalışmaya başla!</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  streakCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, flexDirection: 'row', gap: 16, marginBottom: 16 },
  streakItem: { flex: 1, alignItems: 'center' },
  streakValue: { fontSize: 28, fontWeight: 'bold', color: '#0066cc' },
  streakLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  badgesTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, marginTop: 16 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeCard: { width: '48%', backgroundColor: 'white', borderRadius: 8, padding: 12, alignItems: 'center' },
  badgeIcon: { fontSize: 32, marginBottom: 6 },
  badgeTitle: { fontSize: 11, fontWeight: '500', color: '#333', textAlign: 'center' },
  emptyCard: { backgroundColor: 'white', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
});
