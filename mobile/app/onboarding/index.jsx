import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';

const LOCATIONS = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi'];

export default function Step1() {
    const router = useRouter();
    const { onboardingData, updateOnboardingData } = useOnboarding();
    const [firstName, setFirstName] = useState(onboardingData.firstName || '');
    const [lastName, setLastName] = useState(onboardingData.lastName || '');
    const [location, setLocation] = useState(onboardingData.weddingLocation || '');
    const [errors, setErrors] = useState({});

    const handleContinue = () => {
        const newErrors = {};
        if (!firstName.trim()) newErrors.firstName = 'First name required';
        if (!lastName.trim()) newErrors.lastName = 'Last name required';
        if (!location) newErrors.location = 'Location required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        updateOnboardingData({ firstName, lastName, weddingLocation: location });
        router.push('/onboarding/step2');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.scroll}>
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: '25%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.title}>Let's get to know you</Text>
                        <Text style={styles.subtitle}>We'll ask a few questions to customize your experience.</Text>
                    </View>

                    <Text style={styles.label}>Your Name *</Text>
                    <View style={styles.row}>
                        <View style={styles.inputHalf}>
                            <Input
                                value={firstName}
                                onChangeText={(text) => { setFirstName(text); setErrors(prev => ({ ...prev, firstName: null })); }}
                                placeholder="First Name"
                                error={errors.firstName}
                            />
                        </View>
                        <View style={styles.inputHalf}>
                            <Input
                                value={lastName}
                                onChangeText={(text) => { setLastName(text); setErrors(prev => ({ ...prev, lastName: null })); }}
                                placeholder="Last Name"
                                error={errors.lastName}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Wedding Location *</Text>
                    <View style={styles.chipContainer}>
                        {LOCATIONS.map((loc) => (
                            <TouchableOpacity
                                key={loc}
                                style={[
                                    styles.chip,
                                    location === loc && styles.chipActive
                                ]}
                                onPress={() => { setLocation(loc); setErrors(prev => ({ ...prev, location: null })); }}
                            >
                                <Text style={[styles.chipText, location === loc && styles.chipTextActive]}>
                                    {loc}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}

                </ScrollView>
                <View style={styles.footer}>
                    <Button title="Continue" onPress={handleContinue} />
                </View>
            </KeyboardAvoidingView>
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
        paddingTop: theme.spacing.xl,
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
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.lg,
    },
    inputHalf: {
        flex: 1,
    },
    label: {
        ...theme.typography.body,
        fontWeight: 'bold',
        marginBottom: theme.spacing.sm,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
        justifyContent: 'space-between',
    },
    chip: {
        width: '48%',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    chipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    chipText: {
        ...theme.typography.body,
        color: theme.colors.textSecondary,
    },
    chipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
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
    }
});
