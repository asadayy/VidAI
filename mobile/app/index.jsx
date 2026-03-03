import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';

export default function Index() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <Loading fullScreen message="Loading..." />;
  }

  if (isAuthenticated) {
    if (!user?.onboarding?.isComplete && user?.role === 'user') {
      return <Redirect href="/onboarding" />;
    }
    return <Redirect href="/(tabs)/dashboard" />;
  }

  // Unauthenticated — go to login
  return <Redirect href="/(auth)/login" />;
}
