import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface AchievementFeed {
  id: number;
  user_id: number;
  user_name: string;
  achievement_type: string;
  shared_text: string | null;
  likes_count: number;
  comments_count: number;
  shared_at: string;
}

export default function SocialFeedScreen() {
  const insets = useSafeAreaInsets();
  const [feed, setFeed] = useState<AchievementFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commentingId, setCommentingId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/achievements/feed?limit=20&offset=0');
      setFeed(response.data);
    } catch {
      Alert.alert('Hata', 'Feed yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const likeAchievement = async (achievementId: number) => {
    try {
      await apiClient.post(`/achievements/${achievementId}/like`, {});
      setFeed(feed.map(item =>
        item.id === achievementId ? { ...item, likes_count: item.likes_count + 1 } : item
      ));
    } catch {
      Alert.alert('Hata', 'Beğeni eklenemedi');
    }
  };

  const submitComment = async (achievementId: number) => {
    if (!commentText.trim()) return;

    try {
      await apiClient.post(`/achievements/${achievementId}/comment`, {
        text: commentText,
      });
      setCommentText('');
      setCommentingId(null);
      setFeed(feed.map(item =>
        item.id === achievementId ? { ...item, comments_count: item.comments_count + 1 } : item
      ));
      Alert.alert('Başarılı', 'Yorumunuz paylaşıldı');
    } catch {
      Alert.alert('Hata', 'Yorum paylaşılamadı');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins}m önce`;
    if (diffHours < 24) return `${diffHours}h önce`;
    if (diffDays < 7) return `${diffDays}g önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const getAchievementEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      badge: '🏆',
      milestone: '🎯',
      streak: '🔥',
      accuracy: '🎯',
      test_completed: '✅',
      perfect_score: '⭐',
    };
    return emojiMap[type] || '🎓';
  };

  const renderFeedItem = ({ item }: { item: AchievementFeed }) => (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <View>
          <Text style={styles.userName}>{item.user_name}</Text>
          <Text style={styles.timestamp}>{formatDate(item.shared_at)}</Text>
        </View>
        <Text style={styles.achievementEmoji}>{getAchievementEmoji(item.achievement_type)}</Text>
      </View>

      {item.shared_text && (
        <Text style={styles.feedText}>{item.shared_text}</Text>
      )}

      <Text style={styles.achievementType}>
        {item.achievement_type === 'badge' && 'Yeni badge kazandı!'}
        {item.achievement_type === 'milestone' && 'Önemli bir kilometre taşına ulaştı!'}
        {item.achievement_type === 'streak' && 'Çalışma serisini devam ettiriyor!'}
        {item.achievement_type === 'accuracy' && 'Doğruluk rekorunu kırdı!'}
        {item.achievement_type === 'test_completed' && 'Sınavı tamamladı!'}
      </Text>

      <View style={styles.feedActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => likeAchievement(item.id)}
        >
          <Text style={styles.actionIcon}>👍</Text>
          <Text style={styles.actionCount}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setCommentingId(commentingId === item.id ? null : item.id)}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{item.comments_count}</Text>
        </TouchableOpacity>
      </View>

      {commentingId === item.id && (
        <View style={styles.commentInput}>
          <TextInput
            style={styles.input}
            placeholder="Bir yorum yazın..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={200}
          />
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => submitComment(item.id)}
          >
            <Text style={styles.submitButtonText}>Gönder</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>🎓 Sosyal Feed</Text>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : feed.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Henüz başarı paylaşımı yok</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          renderItem={renderFeedItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.feedList}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  feedList: { paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 24 },
  feedCard: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  userName: { fontSize: 14, fontWeight: '600', color: '#333' },
  timestamp: { fontSize: 11, color: '#999', marginTop: 2 },
  achievementEmoji: { fontSize: 24 },
  feedText: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 8 },
  achievementType: { fontSize: 12, fontWeight: '600', color: '#0066cc', marginBottom: 10 },
  feedActions: { flexDirection: 'row', gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 16 },
  actionCount: { fontSize: 12, color: '#666', fontWeight: '500' },
  commentInput: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 8 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, maxHeight: 80, fontSize: 12 },
  submitButton: { backgroundColor: '#0066cc', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  submitButtonText: { color: 'white', fontWeight: '600', fontSize: 12 },
});
