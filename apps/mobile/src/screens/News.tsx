import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface NewsItem {
  id: number;
  title: string;
  content: string;
  category: 'mevzuat' | 'haberler' | 'sınav-takvimi' | 'öğrendimi-ipuçları';
  thumbnail_url: string | null;
  published_at: string;
  important: boolean;
  views_count: number;
}

const categoryIcons: Record<string, string> = {
  mevzuat: '⚖️',
  haberler: '📰',
  'sınav-takvimi': '📅',
  'öğrendimi-ipuçları': '💡',
};

const categoryLabels: Record<string, string> = {
  mevzuat: 'Mevzuat',
  haberler: 'Haberler',
  'sınav-takvimi': 'Sınav Takvimi',
  'öğrendimi-ipuçları': 'Öğrenme İpuçları',
};

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('haberler');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNews();
  }, [activeCategory]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      let response;
      if (activeCategory === 'trending') {
        response = await apiClient.get('/news/trending?days=7&limit=20');
      } else {
        response = await apiClient.get(`/news/category/${activeCategory}?limit=20`);
      }
      setNews(response.data);
    } catch {
      Alert.alert('Hata', 'Haberler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins}m önce`;
    if (diffHours < 24) return `${diffHours}h önce`;
    if (diffDays < 7) return `${diffDays}g önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const renderNewsItem = ({ item }: { item: NewsItem }) => (
    <TouchableOpacity style={styles.newsCard} activeOpacity={0.7}>
      {item.thumbnail_url && (
        <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} />
      )}
      <View style={styles.newsContent}>
        <View style={styles.newsHeader}>
          <Text style={styles.newsCategory}>
            {categoryIcons[item.category]} {categoryLabels[item.category]}
          </Text>
          {item.important && <Text style={styles.importantBadge}>⭐ ÖNEMLİ</Text>}
        </View>
        <Text style={styles.newsTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.newsPreview} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.newsFooter}>
          <Text style={styles.newsDate}>{formatDate(item.published_at)}</Text>
          <Text style={styles.newsViews}>👁️ {item.views_count}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { id: 'trending', label: 'Trend' },
            { id: 'haberler', label: 'Haberler' },
            { id: 'mevzuat', label: 'Mevzuat' },
            { id: 'sınav-takvimi', label: 'Takvim' },
            { id: 'öğrendimi-ipuçları', label: 'İpuçları' },
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryTab,
                activeCategory === item.id && styles.categoryTabActive,
              ]}
              onPress={() => setActiveCategory(item.id)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === item.id && styles.categoryTabTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.categoryTabsContent}
        />
      </View>

      {/* News List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      ) : news.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Henüz haber yok</Text>
        </View>
      ) : (
        <FlatList
          data={news}
          renderItem={renderNewsItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.newsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={() => (
            <View style={styles.newsHeader}>
              <Text style={styles.sectionTitle}>
                {activeCategory === 'trending'
                  ? '🔥 Trend Haberler'
                  : `${categoryIcons[activeCategory]} ${categoryLabels[activeCategory]}`}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  categoryTabs: { backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  categoryTabsContent: { paddingHorizontal: 8, paddingVertical: 4 },
  categoryTab: { paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#f0f0f0' },
  categoryTabActive: { backgroundColor: '#0066cc' },
  categoryTabText: { fontSize: 12, fontWeight: '500', color: '#666' },
  categoryTabTextActive: { color: 'white' },
  newsList: { padding: 12, paddingBottom: 24 },
  newsCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 12, overflow: 'hidden', elevation: 2 },
  thumbnail: { width: '100%', height: 180, backgroundColor: '#e0e0e0' },
  newsContent: { padding: 12 },
  newsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  newsCategory: { fontSize: 11, fontWeight: '600', color: '#0066cc' },
  importantBadge: { fontSize: 10, fontWeight: 'bold', color: '#ff6b6b', backgroundColor: '#ffe0e0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  newsTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  newsPreview: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 8 },
  newsFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  newsDate: { fontSize: 11, color: '#999' },
  newsViews: { fontSize: 11, color: '#999' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', paddingVertical: 12 },
});
