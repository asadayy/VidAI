import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';

const QUICK_PICKS = [200000, 500000, 1000000, 2000000, 5000000];

const formatPKR = (val) => {
    if (!val) return '';
    const num = parseInt(String(val).replace(/,/g, ''), 10);
    if (isNaN(num)) return '';
    return num.toLocaleString('en-PK');
};

export default function Step4() {
    const router = useRouter();
    const { completeOnboarding } = useAuth();
    const { onboardingData, updateOnboardingData } = useOnboarding();
    const [totalBudget, setTotalBudget] = useState(
        onboardingData.totalBudget ? String(onboardingData.totalBudget) : ''
    );
    const [loading, setLoading] = useState(false);

    const handleFinish = async () => {
        setLoading(true);
        try {
            const finalData = {
                ...onboardingData,
                totalBudget: totalBudget ? parseInt(totalBudget.replace(/,/g, ''), 10) : 0,
            };
            updateOnboardingData({ totalBudget: finalData.totalBudget });
            await completeOnboarding(finalData);
            Toast.show({ type: 'success', text1: 'Setup complete! Welcome to VidAI 🎉' });
            router.replace('/(tabs)/dashboard');
        } catch {
            Toast.show({ type: 'error', text1: 'Error saving details. Please try again.' });
            router.replace('/(tabs)/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const numericBudget = parseInt(totalBudget.replace(/,/g, ''), 10);

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Back */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Feather name="chevron-left" size={24} color="#000" />
                    </TouchableOpacity>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: '100%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.stepLabel}>Step 4 of 4</Text>
                        <Text style={styles.title}>💰 What's your budget?</Text>
                        <Text style={styles.subtitle}>
                            Set a total budget for your event. You can always adjust it later in the Budget Planner.
                        </Text>
                    </View>

                    {/* Budget Input */}
                    <Text style={styles.label}>Total Event Budget (PKR)</Text>
                    <View style={styles.budgetInputRow}>
                        <Text style={styles.currencyPrefix}>Rs.</Text>
                        <TextInput
                            style={styles.budgetInput}
                            value={totalBudget}
                            onChangeText={(t) => setTotalBudget(t.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 500000"
                            keyboardType="number-pad"
                        />
                    </View>
                    {totalBudget !== '' && !isNaN(numericBudget) && numericBudget > 0 && (
                        <Text style={styles.budgetDisplay}>Rs. {formatPKR(numericBudget)}</Text>
                    )}

                    {/* Quick Picks */}
                    <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>Quick pick:</Text>
                    <View style={styles.chipGrid}>
                        {QUICK_PICKS.map((amt) => {
                            const active = numericBudget === amt;
                            return (
                                <TouchableOpacity
                                    key={amt}
                                    style={[styles.chip, active && styles.chipActive]}
                                    onPress={() => setTotalBudget(String(amt))}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                        Rs. {formatPKR(amt)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={() => {
                            setTotalBudget('');
                            handleFinish();
                        }}
                    >
                        <Text style={styles.skipBtnText}>Skip</Text>
                    </TouchableOpacity>
                    <View style={styles.finishBtnWrapper}>
                        <Button title="Finish Setup" onPress={handleFinish} loading={loading} />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1 },
    scroll: { padding: theme.spacing.lg },
    backBtn: { marginBottom: theme.spacing.md },
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
    header: { marginBottom: theme.spacing.xl },
    stepLabel: {
        ...theme.typography.bodySmall,
        color: theme.colors.primary,
        fontWeight: '600',
        marginBottom: theme.spacing.xs,
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
    label: {
        ...theme.typography.body,
        fontWeight: 'bold',
        marginBottom: theme.spacing.sm,
    },
    budgetInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: theme.borderRadius.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: '#fafafa',
    },
    currencyPrefix: {
        ...theme.typography.body,
        fontWeight: 'bold',
        color: theme.colors.textSecondary,
        marginRight: theme.spacing.sm,
    },
    budgetInput: {
        flex: 1,
        height: 52,
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    budgetDisplay: {
        ...theme.typography.bodySmall,
        color: theme.colors.primary,
        fontWeight: '600',
        marginTop: theme.spacing.xs,
    },
    chipGrid: {
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
        marginBottom: theme.spacing.xs,
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
    finishBtnWrapper: { flex: 1 },
});
