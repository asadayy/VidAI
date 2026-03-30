import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../constants/theme';

const Card = ({ children, style }) => {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.xl || 16,
    padding: theme.spacing.lg || 20,
    boxShadow: '0px 4px 12px rgba(215, 56, 94, 0.08)',
    elevation: 4,
    marginBottom: theme.spacing.lg || 24,
    borderWidth: 1,
    borderColor: 'rgba(215, 56, 94, 0.05)',
  },
});

export default Card;
