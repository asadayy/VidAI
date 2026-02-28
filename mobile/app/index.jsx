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

  // Guests are redirected to the vendors listing
  return <Redirect href="/(tabs)/vendors" />;
}
