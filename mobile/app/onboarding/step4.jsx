import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';

const BUDGET_OPTIONS = [
    'Under 10,000',
    '10,000 - 25,000',
    '25,000 - 50,000',
    'Above 50,000'
];

export default function Step4() {
    const router = useRouter();
    const { completeOnboarding } = useAuth();
    const { onboardingData, updateOnboardingData } = useOnboarding();
    const [budgets, setBudgets] = useState(onboardingData.budgets || {});
    const [loading, setLoading] = useState(false);

    const lookingForList = onboardingData.lookingFor?.length > 0 ? onboardingData.lookingFor : ['General Event'];

    const toggleBudget = (category, value) => {
        setBudgets(prev => ({
            ...prev,
            [category]: value
        }));
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const finalData = { ...onboardingData, budgets };
            updateOnboardingData({ budgets });

            // Save to backend
            await completeOnboarding(finalData);
            Toast.show({ type: 'success', text1: 'Onboarding complete!' });
            router.replace('/(tabs)/dashboard');
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error saving details' });
            const finalData = { ...onboardingData, budgets };
            // Fallback redirect even if offline
            router.replace('/(tabs)/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        handleFinish();
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Header */}
                    <View style={styles.topRow}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Feather name="chevron-left" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: '100%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>Let's Get Some Estimates</Text>
                        <Text style={styles.subtitle}>Tell us your budget so we can find the perfect match.</Text>
                    </View>

                    {/* Budgets for each selected item */}
                    {lookingForList.map((category) => (
                        <View key={category} style={styles.categorySection}>
                            <Text style={styles.categoryTitle}>{category} Budget</Text>
                            <View style={styles.chipContainer}>
                                {BUDGET_OPTIONS.map((val) => {
                                    const isActive = budgets[category] === val;
                                    return (
                                        <TouchableOpacity
                                            key={val}
                                            style={[styles.chip, isActive && styles.chipActive]}
                                            onPress={() => toggleBudget(category, val)}
                                        >
                                            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{val}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    ))}

                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                        <Text style={styles.skipBtnText}>Skip</Text>
                    </TouchableOpacity>
                    <View style={styles.continueBtnWrapper}>
                        <Button title="Finish" onPress={handleFinish} loading={loading} />
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
    },
    container: {
        flex: 1,
    },
    scroll: {
        padding: theme.spacing.lg,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    backBtn: {
        padding: theme.spacing.xs,
    },
    progressContainer: {
        height: 6,
        backgroundColor: '#e5e7eb',
        borderRadius: 3,
        marginBottom: theme.spacing.xl,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: theme.colors.primary,
        borderRadius: 3,
    },
    header: {
        marginBottom: theme.spacing.xl,
    },
    title: {
        ...theme.typography.h2,
        color: '#000',
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    categorySection: {
        marginBottom: theme.spacing.xl,
    },
    categoryTitle: {
        ...theme.typography.body,
        fontWeight: 'bold',
        marginBottom: theme.spacing.md,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    chip: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
        alignItems: 'center',
    },
    skipBtn: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
        marginRight: theme.spacing.md,
    },
    skipBtnText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    continueBtnWrapper: {
        flex: 1,
    }
});
