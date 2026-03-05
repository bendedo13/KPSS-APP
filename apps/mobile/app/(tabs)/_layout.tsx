import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1e40af',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#1e40af' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Anasayfa', tabBarLabel: 'Anasayfa' }} />
      <Tabs.Screen name="flashcards" options={{ title: 'Kartlar', tabBarLabel: 'Kartlar' }} />
      <Tabs.Screen name="minitest" options={{ title: 'Mini Test', tabBarLabel: 'Test' }} />
      <Tabs.Screen name="wrongbook" options={{ title: 'Yanlış Defteri', tabBarLabel: 'Yanlışlar' }} />
    </Tabs>
  );
}
