import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './context/AuthContext';

// Screens
import LoginScreen from './screens/Login';
import RegisterScreen from './screens/Register';
import DashboardScreen from './screens/Dashboard';
import MiniTestScreen from './screens/MiniTest';
import FlashcardsScreen from './screens/Flashcards';
import WrongBookScreen from './screens/WrongBook';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function AuthStack(): React.JSX.Element {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth">
        {() =>
          isLogin ? (
            <LoginScreen onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterScreen onSwitchToLogin={() => setIsLogin(true)} />
          )
        }
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1a73e8',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#1a73e8',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MiniTest"
        component={MiniTestScreen}
        options={{
          title: 'Test',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Flashcards"
        component={FlashcardsScreen}
        options={{
          title: 'Kartlar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="card" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="WrongBook"
        component={WrongBookScreen}
        options={{
          title: 'Yanlış Defter',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="alert-circle" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator(): React.JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App(): React.JSX.Element {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
