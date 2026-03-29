import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';

const VENUE_TYPES = ['Banquet Hall', 'Outdoor Garden', 'Farmhouse', 'Marquee'];

const FOOD_OPTIONS = [
    'Full Buffet', 'Hi-Tea', 'Sit-down Dinner', 'Mixed / Fusion', 'No Preference'
];

const GUEST_PRESETS = [50, 100, 200, 500, 1000];

export default function Step3() {
    const router = useRouter();
    const { onboardingData, updateOnboardingData } = useOnboarding();

    const [venueType, setVenueType] = useState(onboardingData.venueType || '');
    const [guestCount, setGuestCount] = useState(
        onboardingData.guestCount ? String(onboardingData.guestCount) : '200'
    );
    const [foodPreference, setFoodPreference] = useState(onboardingData.foodPreference || '');
    const [errors, setErrors] = useState({});

    const increment = () => setGuestCount(prev => String(Math.min(5000, (parseInt(prev) || 0) + 10)));
    const decrement = () => setGuestCount(prev => String(Math.max(10, (parseInt(prev) || 10) - 10)));

    const handleContinue = () => {
        const newErrors = {};
        if (!venueType) newErrors.venueType = 'Please select a venue type';
        const parsed = parseInt(guestCount);
        if (!guestCount || isNaN(parsed) || parsed < 1) newErrors.guestCount = 'Please enter a valid guest count';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        updateOnboardingData({
            venueType,
            guestCount: parseInt(guestCount),
            foodPreference,
        });
        router.push('/onboarding/step4');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Back */}
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Feather name="chevron-left" size={24} color="#000" />
                    </TouchableOpacity>

                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: '75%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.stepLabel}>Step 3 of 4</Text>
                        <Text style={styles.title}>🏛️ Venue & Guest Preferences</Text>
                        <Text style={styles.subtitle}>Help us understand your ideal setup.</Text>
                    </View>

                    {/* Venue Type */}
                    <Text style={styles.label}>What kind of venue do you want? *</Text>
                    <View style={styles.chipGrid}>
                        {VENUE_TYPES.map((v) => {
                            const active = venueType === v;
                            return (
                                <TouchableOpacity
                                    key={v}
                                    style={[styles.chip, active && styles.chipActive]}
                                    onPress={() => {
                                        setVenueType(v);
                                        setErrors(prev => ({ ...prev, venueType: null }));
                                    }}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{v}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors.venueType && <Text style={styles.errorText}>{errors.venueType}</Text>}

                    {/* Guest Count */}
                    <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
                        How many guests do you expect?
                    </Text>
                    <View style={styles.guestRow}>
                        <TouchableOpacity style={styles.counterBtn} onPress={decrement}>
                            <Feather name="minus" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.guestInput}
                            value={guestCount}
                            onChangeText={(t) => {
                                setGuestCount(t.replace(/[^0-9]/g, ''));
                                setErrors(prev => ({ ...prev, guestCount: null }));
                            }}
                            keyboardType="number-pad"
                            textAlign="center"
                        />
                        <TouchableOpacity style={styles.counterBtn} onPress={increment}>
                            <Feather name="plus" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {/* Quick picks */}
                    <View style={styles.presetRow}>
                        {GUEST_PRESETS.map((n) => (
                            <TouchableOpacity
                                key={n}
                                style={[styles.presetChip, String(n) === guestCount && styles.chipActive]}
                                onPress={() => setGuestCount(String(n))}
                            >
                                <Text style={[styles.presetChipText, String(n) === guestCount && styles.chipTextActive]}>
                                    {n}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {errors.guestCount && <Text style={styles.errorText}>{errors.guestCount}</Text>}

                    {/* Food Preference */}
                    <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
                        What kind of food do you want to serve?
                    </Text>
                    <View style={styles.chipGrid}>
                        {FOOD_OPTIONS.map((f) => {
                            const active = foodPreference === f;
                            return (
                                <TouchableOpacity
                                    key={f}
                                    style={[styles.chip, active && styles.chipActive]}
                                    onPress={() => setFoodPreference(active ? '' : f)}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <Button title="Continue" onPress={handleContinue} />
                </View>
            </View>
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
    guestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    counterBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guestInput: {
        flex: 1,
        height: 44,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: theme.borderRadius.md,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
        textAlign: 'center',
    },
    presetRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    presetChip: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    presetChipText: {
        ...theme.typography.bodySmall,
        color: theme.colors.textSecondary,
    },
    errorText: {
        color: theme.colors.danger,
        fontSize: theme.typography.bodySmall.fontSize,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    footer: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
});
