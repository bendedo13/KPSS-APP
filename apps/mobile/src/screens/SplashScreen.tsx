import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const insets = useSafeAreaInsets();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Show splash for 4 seconds then navigate
    const timer = setTimeout(() => {
      onFinish();
    }, 4000);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, onFinish]);

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1491841573634-28e1ad7b6eee?w=1000' }}
      style={[styles.container, { paddingTop: insets.top }]}
      blurRadius={5}
    >
      {/* Dark Overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo */}
        <Text style={styles.logo}>📚 KPSS</Text>

        {/* Main Text */}
        <Text style={styles.title}>Platform</Text>

        {/* Credits Section */}
        <View style={styles.creditsContainer}>
          <Text style={styles.creditsTitle}>Uygulama Hakkında</Text>
          
          <Text style={styles.creditsText}>
            Bu uygulama <Text style={styles.highlight}>Alan İnal</Text> tarafından geliştirildi
          </Text>

          <Text style={styles.creditsText}>
            Başta sevgili <Text style={styles.highlight}>Ebru'ya</Text> olmak üzere
          </Text>

          <Text style={styles.creditsText}>
            tüm öğrencilere hediyedir
          </Text>

          <Text style={styles.dedication}>✨ Herkese başarılar dilerim ✨</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.version}>v2.0.0</Text>
          <Text style={styles.year}>© 2024 KPSS Platform</Text>
        </View>
      </Animated.View>

      {/* Loading Indicator */}
      <View style={styles.loadingContainer}>
        <View style={styles.spinner} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 32,
    zIndex: 10,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 48,
    letterSpacing: 2,
  },
  creditsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 32,
    marginBottom: 40,
    alignItems: 'center',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  creditsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  creditsText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginVertical: 6,
    lineHeight: 22,
  },
  highlight: {
    fontWeight: '700',
    color: '#667eea',
    fontSize: 15,
  },
  dedication: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#764ba2',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  version: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  year: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    gap: 12,
  },
  spinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
  },
  loadingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
});
