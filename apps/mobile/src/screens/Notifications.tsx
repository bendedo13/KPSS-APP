import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Switch,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

interface NotificationPreferences {
  weak_topic_enabled: boolean;
  daily_goal_enabled: boolean;
  srs_review_enabled: boolean;
  test_completed_enabled: boolean;
  goal_progress_enabled: boolean;
  streak_reminder_enabled: boolean;
  daily_reminder_time: string;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'preferences'>('notifications');

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [notificationsRes, unreadRes, preferencesRes] = await Promise.all([
        apiClient.get('/notifications?limit=50'),
        apiClient.get('/notifications/unread'),
        apiClient.get('/notifications/preferences'),
      ]);

      setNotifications(notificationsRes.data.data || []);
      setUnreadCount(unreadRes.data.unread_count || 0);
      setPreferences(preferencesRes.data);
    } catch (error) {
      Alert.alert('Hata', 'Bildirimler alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      Alert.alert('Hata', 'Bildirim güncellenemedi');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.put('/notifications/read-all');
      fetchNotifications();
      Alert.alert('Başarı', 'Tüm bildirimler okundu olarak işaretlendi');
    } catch (error) {
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await apiClient.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      Alert.alert('Hata', 'Bildirim silinemedi');
    }
  };

  const handleUpdatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      const response = await apiClient.put('/notifications/preferences', updates);
      setPreferences(response.data);
      Alert.alert('Başarı', 'Tercihler güncellendi');
    } catch (error) {
      Alert.alert('Hata', 'Tercihler güncellenemedi');
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      weak_topic: '📌',
      daily_goal_reminder: '📚',
      srs_review: '🔄',
      test_completed: '✅',
      goal_progress: '📈',
      streak_reminder: '🔥',
      ui_update: '📢',
    };
    return icons[type] || '📬';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes}m önce`;
    if (hours < 24) return `${hours}h önce`;
    return `${days}d önce`;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0066cc" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notifications' && styles.tabActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>
            📬 Bildirimler
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'preferences' && styles.tabActive]}
          onPress={() => setActiveTab('preferences')}
        >
          <Text style={[styles.tabText, activeTab === 'preferences' && styles.tabTextActive]}>
            ⚙️ Tercihler
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <View style={{ flex: 1 }}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleMarkAllAsRead}
            >
              <Text style={styles.markAllButtonText}>Tümünü Oku</Text>
            </TouchableOpacity>
          )}

          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Bildirim yok</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.notificationItem,
                    !item.is_read && styles.notificationItemUnread,
                  ]}
                >
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>
                        {getNotificationIcon(item.type)} {item.title}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {getTimeAgo(item.created_at)}
                      </Text>
                    </View>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                  </View>

                  <View style={styles.notificationActions}>
                    {!item.is_read && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleMarkAsRead(item.id)}
                      >
                        <Text style={styles.actionButtonText}>✓</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteNotification(item.id)}
                    >
                      <Text style={styles.deleteButtonText}>×</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && preferences && (
        <ScrollView contentContainerStyle={styles.preferencesContent}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Bildirim İçeriği</Text>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLabel}>
                <Text style={styles.preferenceTitle}>📌 Zayıf Konu Uyarıları</Text>
                <Text style={styles.preferenceDescription}>
                  Düşük başarı oranı olan konular
                </Text>
              </View>
              <Switch
                value={preferences.weak_topic_enabled}
                onValueChange={(value) =>
                  handleUpdatePreferences({ weak_topic_enabled: value })
                }
                trackColor={{ false: '#ddd', true: '#0066cc' }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLabel}>
                <Text style={styles.preferenceTitle}>📚 Günlük Çalışma Hatırlatması</Text>
                <Text style={styles.preferenceDescription}>
                  Günlük hedef hatırlatması
                </Text>
              </View>
              <Switch
                value={preferences.daily_goal_enabled}
                onValueChange={(value) =>
                  handleUpdatePreferences({ daily_goal_enabled: value })
                }
                trackColor={{ false: '#ddd', true: '#0066cc' }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLabel}>
                <Text style={styles.preferenceTitle}>🔄 SRS Gözden Geçirme</Text>
                <Text style={styles.preferenceDescription}>
                  Hatırlatılması gereken kartlar
                </Text>
              </View>
              <Switch
                value={preferences.srs_review_enabled}
                onValueChange={(value) =>
                  handleUpdatePreferences({ srs_review_enabled: value })
                }
                trackColor={{ false: '#ddd', true: '#0066cc' }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLabel}>
                <Text style={styles.preferenceTitle}>✅ Test Tamamlandı</Text>
                <Text style={styles.preferenceDescription}>
                  Test sonuçları ve öntemer
                </Text>
              </View>
              <Switch
                value={preferences.test_completed_enabled}
                onValueChange={(value) =>
                  handleUpdatePreferences({ test_completed_enabled: value })
                }
                trackColor={{ false: '#ddd', true: '#0066cc' }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLabel}>
                <Text style={styles.preferenceTitle}>📈 Hedef İlerlemesi</Text>
                <Text style={styles.preferenceDescription}>
                  Hedefe doğru ilerlemeniz
                </Text>
              </View>
              <Switch
                value={preferences.goal_progress_enabled}
                onValueChange={(value) =>
                  handleUpdatePreferences({ goal_progress_enabled: value })
                }
                trackColor={{ false: '#ddd', true: '#0066cc' }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceLabel}>
                <Text style={styles.preferenceTitle}>🔥 Çalışma Serisi</Text>
                <Text style={styles.preferenceDescription}>
                  Seriye devam etme hatırlatması
                </Text>
              </View>
              <Switch
                value={preferences.streak_reminder_enabled}
                onValueChange={(value) =>
                  handleUpdatePreferences({ streak_reminder_enabled: value })
                }
                trackColor={{ false: '#ddd', true: '#0066cc' }}
              />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Hatırlatma Saati</Text>
            <Text style={styles.preferenceDescription}>
              Şu anda: {preferences.daily_reminder_time || '08:00'}
            </Text>
            <Text style={styles.infoText}>
              💡 Bildirim saati ayarlamak için mobil cihazınızın ayarlarını kullanın.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#0066cc',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#0066cc',
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  markAllButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  markAllButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  notificationItemUnread: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 3,
    borderLeftColor: '#0066cc',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  notificationMessage: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e8f4f8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#0066cc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ffe8e8',
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
  },
  preferencesContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceLabel: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 11,
    color: '#999',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginTop: 8,
  },
});
