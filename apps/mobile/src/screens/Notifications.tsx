import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, FlatList, TouchableOpacity, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationPreference {
  weak_topic_enabled: boolean;
  exam_suggestion_enabled: boolean;
  streak_milestone_enabled: boolean;
  new_content_enabled: boolean;
  friend_joined_enabled: boolean;
  achievement_earned_enabled: boolean;
  system_update_enabled: boolean;
}

export function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreference | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/notifications', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      const data = await response.json();
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await fetch('http://localhost:3000/notification-preferences', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      const data = await response.json();
      setPreferences(data);
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`http://localhost:3000/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await fetch(`http://localhost:3000/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={{
        padding: 12,
        marginVertical: 4,
        backgroundColor: item.is_read ? '#f5f5f5' : '#e3f2fd',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: getTypeColor(item.type),
      }}
      onPress={() => markAsRead(item.id)}
    >
      <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{item.title}</Text>
      <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.message}</Text>
      <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
      <TouchableOpacity
        style={{ marginTop: 8 }}
        onPress={() => deleteNotification(item.id)}
      >
        <Text style={{ color: '#f44336', fontSize: 12 }}>Sil</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const getTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      weak_topic: '#ff9800',
      exam_suggestion: '#2196f3',
      streak_milestone: '#4caf50',
      new_content: '#9c27b0',
      friend_joined: '#e91e63',
      achievement_earned: '#ffc107',
      system_update: '#607d8b',
    };
    return colors[type] || '#ccc';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Bildirimleri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)}>
          <Text style={{ color: '#2196f3', fontSize: 14, fontWeight: '600' }}>
            {showSettings ? 'Bildirimleri Göster' : 'Tercihler'}
          </Text>
        </TouchableOpacity>
      </View>

      {showSettings && preferences ? (
        <ScrollView style={{ padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>
            Bildirim Tercihleri
          </Text>
          {[
            { key: 'weak_topic_enabled', label: 'Zayıf Konular' },
            { key: 'exam_suggestion_enabled', label: 'Sınav Önerileri' },
            { key: 'streak_milestone_enabled', label: 'Çalışma Serileri' },
            { key: 'new_content_enabled', label: 'Yeni İçerik' },
            { key: 'achievement_earned_enabled', label: 'Başarılar' },
            { key: 'system_update_enabled', label: 'Sistem Güncellemeleri' },
          ].map((pref) => (
            <View
              key={pref.key}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
              }}
            >
              <Text style={{ fontSize: 14 }}>{pref.label}</Text>
              <Switch
                value={(preferences as any)[pref.key]}
                disabled={true}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: '#999' }}>Bildirim yok</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
