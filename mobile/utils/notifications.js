import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import client from '../api/client';

// Only load expo-notifications outside Expo Go (crashes on SDK 53+)
let Notifications = null;
if (Constants.appOwnership !== 'expo') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications() {
  if (!Notifications) {
    console.log('Push notifications not available in Expo Go');
    return null;
  }
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Android: create notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D7385E',
      sound: 'default',
    });
  }

  // Get Expo push token
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: '42999439-5ec5-4c10-91c4-a789d8a30697',
    });
    const pushToken = tokenResult.data;

    // Register with backend
    await client.post('/auth/push-token', {
      token: pushToken,
      platform: Platform.OS,
    });

    return pushToken;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return null;
  }
}

// Add listener for received notifications (foreground)
export function addNotificationReceivedListener(callback) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(callback);
}

// Add listener for notification taps
export function addNotificationResponseListener(callback) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(callback);
}
