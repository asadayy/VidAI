import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: W, height: H } = Dimensions.get('window');

export default function AppSplash({ onFinish }) {
  // animation values
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.72)).current;
  const iconOpacity   = useRef(new Animated.Value(0)).current;
  const iconTranslateY = useRef(new Animated.Value(18)).current;
  const tagOpacity    = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. icon floats in
    Animated.parallel([
      Animated.timing(iconOpacity, {
        toValue: 1, duration: 800, delay: 150, useNativeDriver: true,
      }),
      Animated.spring(iconTranslateY, {
        toValue: 0, friction: 8, tension: 50, delay: 150, useNativeDriver: true,
      }),
    ]).start();

    // 2. logo text fades + scales in (slower and smoother)
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 1500, delay: 300, useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1, friction: 9, tension: 25, delay: 300, useNativeDriver: true,
      }),
    ]).start();

    // 3. tagline fades in smoothly
    Animated.timing(tagOpacity, {
      toValue: 1, duration: 1000, delay: 1200, useNativeDriver: true,
    }).start();

    // 4. whole screen fades out → calls onFinish (extended hold for slow animation)
    const hold = setTimeout(() => {
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 600, useNativeDriver: true,
      }).start(() => onFinish && onFinish());
    }, 4200);

    return () => clearTimeout(hold);
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#1a0a10', '#2d0f1e', '#4a1628', '#1a0a10']}
        locations={[0, 0.35, 0.65, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* decorative blurred glow blobs */}
      <View style={[styles.blob, styles.blobTop, { pointerEvents: 'none' }]} />
      <View style={[styles.blob, styles.blobBottom, { pointerEvents: 'none' }]} />

      {/* centre content */}
      <View style={styles.centre}>

        {/* App Logo */}
        <Animated.View style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <Image 
            source={require('../assets/mobile app logo.png')} 
            style={{ width: 150, height: 150, resizeMode: 'contain' }} 
          />
        </Animated.View>

        {/* tagline */}
        <Animated.Text style={[styles.tagline, { opacity: tagOpacity }]}>
          Your Pakistani Wedding Planner
        </Animated.Text>
      </View>

      {/* bottom badge */}
      <Animated.Text style={[styles.brand, { opacity: tagOpacity }]}>
        ✦  Powered by AI  ✦
      </Animated.Text>
    </Animated.View>
  );
}

const PINK = '#D7385E';

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // glow blobs
  blob: {
    position: 'absolute',
    width: W * 0.8,
    height: W * 0.8,
    borderRadius: W * 0.4,
    opacity: 0.18,
  },
  blobTop: {
    top: -W * 0.3,
    left: -W * 0.15,
    backgroundColor: PINK,
  },
  blobBottom: {
    bottom: -W * 0.25,
    right: -W * 0.2,
    backgroundColor: '#9b1d48',
  },

  centre: {
    alignItems: 'center',
  },

  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 22px rgba(215, 56, 94, 0.9)',
    elevation: 14,
  },

  wordmark: {
    fontSize: 58,
    letterSpacing: 2,
    fontWeight: '800',
  },
  wordmarkVid: {
    color: '#ffffff',
  },
  wordmarkAI: {
    color: PINK,
  },

  divider: {
    marginTop: 10,
    width: 48,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: PINK,
    opacity: 0.75,
  },

  tagline: {
    marginTop: 16,
    fontSize: 14,
    letterSpacing: 2.5,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    fontWeight: '400',
  },

  brand: {
    position: 'absolute',
    bottom: 42,
    fontSize: 11,
    color: 'rgba(255,255,255,0.28)',
    letterSpacing: 2,
  },
});
