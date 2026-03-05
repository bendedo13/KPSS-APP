import { Tabs } from "expo-router";
import { Text, StyleSheet } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>{label}</Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1e40af",
        tabBarInactiveTintColor: "#64748b",
        tabBarStyle: styles.tabBar,
        headerStyle: { backgroundColor: "#1e40af" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="📊" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="flashcards"
        options={{
          title: "Flashcards",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="🃏" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="minitest"
        options={{
          title: "Mini Test",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="✍️" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="wrongbook"
        options={{
          title: "Wrong Book",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="📕" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#ffffff",
    borderTopColor: "#e2e8f0",
    paddingBottom: 4,
    height: 56,
  },
  icon: {
    fontSize: 22,
    opacity: 0.6,
  },
  iconFocused: {
    opacity: 1,
  },
});
