import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';

export default function Step2() {
    const router = useRouter();
    const { onboardingData, updateOnboardingData } = useOnboarding();
    const [selectedDate, setSelectedDate] = useState(onboardingData.eventDate ? new Date(onboardingData.eventDate).getDate() : 24);

    const daysInMonth = Array.from({ length: 28 }, (_, i) => i + 1);

    const handleContinue = () => {
        // For MVP, just save a mocked 2026-02 date
        const finalDate = new Date(2026, 1, selectedDate);
        updateOnboardingData({ eventDate: finalDate });
        router.push('/onboarding/step3');
    };

    const handleSkip = () => {
        router.push('/onboarding/step3');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Header */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Feather name="chevron-left" size={24} color="#000" />
                    </TouchableOpacity>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: '50%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>When's the Big Day?</Text>
                        <Text style={styles.subtitle}>Get deals & discounts tailor-made for your wedding day</Text>
                    </View>

                    {/* Calendar Box */}
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity>
                                <Feather name="chevron-left" size={20} color="#cbd5e1" />
                            </TouchableOpacity>
                            <Text style={styles.monthText}>February 2026</Text>
                            <TouchableOpacity>
                                <Feather name="chevron-right" size={20} color="#0f172a" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.daysGrid}>
                            {daysInMonth.map((day) => {
                                const isSelected = selectedDate === day;
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
                                        onPress={() => setSelectedDate(day)}
                                    >
                                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                </ScrollView>
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
                        <Text style={styles.skipBtnText}>Skip</Text>
                    </TouchableOpacity>
                    <View style={styles.continueBtnWrapper}>
                        <Button title="Continue" onPress={handleContinue} />
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
    backBtn: {
        marginBottom: theme.spacing.md,
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
    calendarCard: {
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.md,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    monthText: {
        ...theme.typography.body,
        fontWeight: 'bold',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    dayCellSelected: {
        borderWidth: 1,
        borderColor: '#0f172a',
        borderRadius: 20,
    },
    dayText: {
        ...theme.typography.body,
        color: '#94a3b8',
    },
    dayTextSelected: {
        color: '#0f172a',
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
