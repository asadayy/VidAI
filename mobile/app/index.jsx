import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';

export default function Index() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen message="Loading..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/login" />;
}
