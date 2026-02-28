import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';

const LOOKING_FOR_OPTIONS = [
    'Wedding Venue', 'Photographer', 'Makeup Artist', 'Decor',
    'Catering', 'Henna Artist', 'Car Rental', 'Wedding Stationery'
];

const EVENT_TYPES = [
    'Baraat', 'Walima', 'Mehndi', 'Nikkah',
    'Engagement', 'Home-based Event', 'Other'
];

export default function Step3() {
    const router = useRouter();
    const { onboardingData, updateOnboardingData } = useOnboarding();

    const [guestCount, setGuestCount] = useState(onboardingData.guestCount || 200);
    const [lookingFor, setLookingFor] = useState(onboardingData.lookingFor || []);
    const [eventTypes, setEventTypes] = useState(onboardingData.eventTypes || []);

    const toggleLookingFor = (item) => {
        setLookingFor(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const toggleEventType = (item) => {
        setEventTypes(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
    };

    const handleContinue = () => {
        updateOnboardingData({ guestCount, lookingFor, eventTypes });
        router.push('/onboarding/step4');
    };

    const handleSkip = () => {
        router.push('/onboarding/step4');
    };

    // Mock vertical wheel items near selected guestCount
    const guestItems = [guestCount - 20, guestCount - 10, guestCount, guestCount + 10, guestCount + 20];

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
                        <View style={[styles.progressBar, { width: '75%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>Your guests and preferences</Text>
                        <Text style={styles.subtitle}>We'll find the best match for you based on these details</Text>
                    </View>

                    {/* Number of Guests */}
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Number of guests</Text>
                        <TouchableOpacity>
                            <Text style={styles.manualText}>+ Type manually</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.guestSelectorBox}>
                        {guestItems.map((val) => {
                            const isActive = val === guestCount;
                            return (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.guestItem]}
                                    onPress={() => setGuestCount(val)}
                                >
                                    <Text style={[styles.guestText, isActive && styles.guestTextActive]}>
                                        {val}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Looking For */}
                    <Text style={styles.sectionTitleOptions}>I'm looking for</Text>
                    <View style={styles.chipContainer}>
                        {LOOKING_FOR_OPTIONS.map((item) => {
                            const isActive = lookingFor.includes(item);
                            return (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                    onPress={() => toggleLookingFor(item)}
                                >
                                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Event Type */}
                    <Text style={styles.sectionTitleOptions}>Event Type</Text>
                    <View style={styles.chipContainer}>
                        {EVENT_TYPES.map((item) => {
                            const isActive = eventTypes.includes(item);
                            return (
                                <TouchableOpacity
                                    key={item}
                                    style={[styles.chip, isActive && styles.chipActive]}
                                    onPress={() => toggleEventType(item)}
                                >
                                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
        ...theme.typography.body,
        fontWeight: 'bold',
    },
    manualText: {
        color: theme.colors.primary,
        fontSize: theme.typography.bodySmall.fontSize,
    },
    sectionTitleOptions: {
        ...theme.typography.body,
        fontWeight: 'bold',
        marginBottom: theme.spacing.sm,
    },
    guestSelectorBox: {
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        ...theme.shadows.sm,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: theme.spacing.xl,
        alignItems: 'center',
    },
    guestItem: {
        paddingVertical: theme.spacing.xs,
        width: '100%',
        alignItems: 'center',
    },
    guestText: {
        fontSize: 16,
        color: '#cbd5e1',
        fontWeight: '600'
    },
    guestTextActive: {
        fontSize: 24,
        color: theme.colors.primary,
        fontWeight: 'bold',
        paddingVertical: 4,
        paddingHorizontal: 20,
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderRadius: theme.borderRadius.md,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
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
