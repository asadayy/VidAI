import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { theme } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user?.onboarding?.isComplete && user?.role === 'user') {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFF0F3', '#FFFDFE', '#FFFFFF']}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative Top Blur Ornaments */}
          <View style={styles.topOrnament} />

          <View style={styles.content}>
            {/* Optimized Logo (Static) */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/mobile app logo.png')}
                style={styles.logo}
              />
            </View>

            {/* Premium Card Container */}
            <View style={styles.card}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue planning your dream wedding</Text>

              {errors.general && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errors.general}</Text>
                </View>
              )}

              <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.inputStyle}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry
                error={errors.password}
                style={styles.inputStyle}
              />

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Text
                  style={styles.link}
                  onPress={() => router.push('/(auth)/register')}
                >
                  Sign Up
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  topOrnament: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#FFE3E8',
    opacity: 0.6,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logo: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(215, 56, 94, 0.08)',
    shadowColor: '#D7385E',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a0a10',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  inputStyle: {
    borderRadius: 12,
    borderColor: '#e8d5da',
    backgroundColor: '#FAF7F8',
  },
  errorContainer: {
    backgroundColor: '#fff0f2',
    padding: theme.spacing.md,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  button: {
    marginTop: theme.spacing.md,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    height: 52,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  link: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
