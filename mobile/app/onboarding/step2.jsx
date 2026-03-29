import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';

const EVENT_TYPES = ['Baraat', 'Walima', 'Mehndi', 'Nikkah', 'Engagement', 'Dholki', 'Other'];
const LOCATIONS = ['Islamabad', 'Rawalpindi'];

export default function Step2() {
    const router = useRouter();
    const { onboardingData, updateOnboardingData } = useOnboarding();

    const [eventTypes, setEventTypes] = useState(onboardingData.eventTypes || []);
    const [eventDate, setEventDate] = useState(
        onboardingData.eventDate ? new Date(onboardingData.eventDate) : null
    );
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [location, setLocation] = useState(onboardingData.weddingLocation || '');
    const [errors, setErrors] = useState({});

    const toggleEventType = (item) => {
        setEventTypes(prev =>
            prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
        );
        setErrors(prev => ({ ...prev, eventTypes: null }));
    };

    const handleDateChange = (event, selectedDate) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) setEventDate(selectedDate);
    };

    const formatDate = (date) => {
        if (!date) return 'Select date';
        return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const handleContinue = () => {
        const newErrors = {};
        if (eventTypes.length === 0) newErrors.eventTypes = 'Please select at least one event';
        if (!location) newErrors.location = 'Please select a location';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        updateOnboardingData({
            eventTypes,
            eventDate: eventDate ? eventDate.toISOString() : '',
            weddingLocation: location,
        });
        router.push('/onboarding/step3');
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
                        <View style={[styles.progressBar, { width: '50%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.stepLabel}>Step 2 of 4</Text>
                        <Text style={styles.title}>🎉 What are you planning?</Text>
                        <Text style={styles.subtitle}>
                            Tell us about your event so we can find the best vendors for you.
                        </Text>
                    </View>

                    {/* Event Types */}
                    <Text style={styles.label}>What event(s) are you planning? *</Text>
                    <View style={styles.chipGrid}>
                        {EVENT_TYPES.map((evt) => {
                            const active = eventTypes.includes(evt);
                            return (
                                <TouchableOpacity
                                    key={evt}
                                    style={[styles.chip, active && styles.chipActive]}
                                    onPress={() => toggleEventType(evt)}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                        {evt}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors.eventTypes && <Text style={styles.errorText}>{errors.eventTypes}</Text>}

                    {/* Event Date */}
                    <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
                        When's the big day?
                    </Text>
                    <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Feather name="calendar" size={18} color={eventDate ? theme.colors.primary : theme.colors.textSecondary} />
                        <Text style={[styles.dateBtnText, eventDate && styles.dateBtnTextActive]}>
                            {formatDate(eventDate)}
                        </Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={eventDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                            minimumDate={new Date()}
                            onChange={handleDateChange}
                        />
                    )}

                    {/* Location */}
                    <Text style={[styles.label, { marginTop: theme.spacing.lg }]}>
                        Preferred Location *
                    </Text>
                    <View style={styles.chipGrid}>
                        {LOCATIONS.map((loc) => {
                            const active = location === loc;
                            return (
                                <TouchableOpacity
                                    key={loc}
                                    style={[styles.chip, styles.chipWide, active && styles.chipActive]}
                                    onPress={() => {
                                        setLocation(loc);
                                        setErrors(prev => ({ ...prev, location: null }));
                                    }}
                                >
                                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                                        {loc}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
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
    chipWide: {
        paddingHorizontal: theme.spacing.xl,
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
    dateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: theme.borderRadius.md,
        backgroundColor: '#fafafa',
    },
    dateBtnText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    dateBtnTextActive: {
        color: theme.colors.text,
        fontWeight: '500',
    },
    errorText: {
        color: theme.colors.danger,
        fontSize: theme.typography.bodySmall.fontSize,
        marginTop: theme.spacing.xs,
    },
    footer: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
});
