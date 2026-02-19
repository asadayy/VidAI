import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const Badge = ({ text, variant = 'default' }) => {
  const badgeStyle = [styles.badge, styles[variant]];

  return (
    <View style={badgeStyle}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  default: {
    backgroundColor: theme.colors.surface,
  },
  success: {
    backgroundColor: '#d1fae5',
  },
  danger: {
    backgroundColor: '#fee2e2',
  },
  warning: {
    backgroundColor: '#fef3c7',
  },
  info: {
    backgroundColor: '#dbeafe',
  },
  text: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'capitalize',
    color: theme.colors.text,
  },
});

export default Badge;
