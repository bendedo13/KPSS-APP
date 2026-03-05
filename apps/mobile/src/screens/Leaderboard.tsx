import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  user_name?: string;
  total_score: number;
  tests_completed: number;
  avg_accuracy: number;
  badges_earned: number;
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<LeaderboardEntry & { percentage: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all-time' | 'weekly' | 'monthly'>('all-time');

  useEffect(() => {
    fetchLeaderboard();
    fetchUserRank();
  }, [period]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      let response;
      if (period === 'all-time') {
        response = await apiClient.get('/leaderboard/global');
      } else {
        response = await apiClient.get(`/leaderboard/${period}`);
      }
      setLeaderboard(response.data);
    } catch {
      Alert.alert('Hata', 'Sıralama yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRank = async () => {
    try {
      const response = await apiClient.get('/user/leaderboard-rank');
      setUserRank(response.data);
    } catch {
      // User not on leaderboard yet
      setUserRank(null);
    }
  };

  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => (
    <View style={[styles.rankItem, index === 0 && styles.topRank, index === 1 && styles.secondRank, index === 2 && styles.thirdRank]}>
      <View style={styles.rankNumber}>
        <Text style={styles.rankNumberText}>
          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
        </Text>
      </View>
      <View style={styles.rankUserInfo}>
        <Text style={styles.userName}>{item.user_name || 'User'}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>⭐ {item.total_score} puan</Text>
          <Text style={styles.stat}>📊 {Math.round(item.avg_accuracy)}%</Text>
        </View>
      </View>
      <View style={styles.badgeCount}>
        <Text style={styles.badgeText}>{item.badges_earned} 🏆</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Period Tabs */}
      <View style={styles.tabsContainer}>
        {(['all-time', 'weekly', 'monthly'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.tab, period === p && styles.tabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
              {p === 'all-time' ? 'Tüm Zamanlar' : p === 'weekly' ? 'Haftalık' : 'Aylık'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : (
        <>
          {/* User's Position */}
          {userRank && (
            <View style={styles.userPositionCard}>
              <View style={styles.userPositionContent}>
                <View>
                  <Text style={styles.userPositionLabel}>Sizin Sıralamanız</Text>
                  <View style={styles.userPositionRow}>
                    <Text style={styles.userPositionRank}>#{userRank.rank}</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[styles.progressFill, { width: `${userRank.percentage}%` }]}
                      />
                    </View>
                    <Text style={styles.userPositionPercent}>{userRank.percentage}%</Text>
                  </View>
                </View>
                <View style={styles.userPositionStats}>
                  <Text style={styles.positionStat}>⭐ {userRank.total_score}</Text>
                  <Text style={styles.positionStat}>📈 {Math.round(userRank.avg_accuracy)}%</Text>
                </View>
              </View>
            </View>
          )}

          {/* Leaderboard List */}
          <FlatList
            data={leaderboard}
            renderItem={renderLeaderboardItem}
            keyExtractor={(item, idx) => `${item.user_id}-${idx}`}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  tabsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, backgroundColor: 'white', padding: 8, borderRadius: 8 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#f0f0f0' },
  tabActive: { backgroundColor: '#0066cc' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTextActive: { color: 'white' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  userPositionCard: { backgroundColor: '#e8f4f8', borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#0066cc' },
  userPositionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userPositionLabel: { fontSize: 12, color: '#0066cc', fontWeight: '600' },
  userPositionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  userPositionRank: { fontSize: 18, fontWeight: 'bold', color: '#0066cc', minWidth: 40 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#d0e8f2', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0066cc' },
  userPositionPercent: { fontSize: 12, fontWeight: '600', color: '#0066cc', minWidth: 30 },
  userPositionStats: { flexDirection: 'row', gap: 12 },
  positionStat: { fontSize: 12, fontWeight: '600', color: '#333' },
  listContent: { paddingBottom: 24 },
  rankItem: { backgroundColor: 'white', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  topRank: { backgroundColor: '#fff9e6', borderLeftWidth: 4, borderLeftColor: '#ffd700' },
  secondRank: { backgroundColor: '#f5f5f5', borderLeftWidth: 4, borderLeftColor: '#c0c0c0' },
  thirdRank: { backgroundColor: '#f9f6f3', borderLeftWidth: 4, borderLeftColor: '#cd7f32' },
  rankNumber: { width: 50, alignItems: 'center' },
  rankNumberText: { fontSize: 24, fontWeight: 'bold' },
  rankUserInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { fontSize: 11, color: '#666' },
  badgeCount: { alignItems: 'center' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#0066cc' },
});
