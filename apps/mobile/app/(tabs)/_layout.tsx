import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="flashcards" options={{ title: 'Kartlar' }} />
      <Tabs.Screen name="minitest" options={{ title: 'Mini Test' }} />
      <Tabs.Screen name="wrongbook" options={{ title: 'Yanlışlarım' }} />
    </Tabs>
  );
}
