import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { useOnboarding } from './_layout';

export default function Step1() {
    const router = useRouter();
    const { onboardingData, updateOnboardingData } = useOnboarding();

    const [firstName, setFirstName] = useState(onboardingData.firstName || '');
    const [lastName, setLastName] = useState(onboardingData.lastName || '');
    const [phone, setPhone] = useState(onboardingData.phone || '');
    const [errors, setErrors] = useState({});

    const handleContinue = () => {
        const newErrors = {};
        if (!firstName.trim()) newErrors.firstName = 'First name is required';
        if (!lastName.trim()) newErrors.lastName = 'Last name is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        updateOnboardingData({ firstName, lastName, phone });
        router.push('/onboarding/step2');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: '25%' }]} />
                    </View>

                    <View style={styles.header}>
                        <Text style={styles.stepLabel}>Step 1 of 4</Text>
                        <Text style={styles.title}>👋 Let's get to know you</Text>
                        <Text style={styles.subtitle}>
                            Tell us a bit about yourself so we can personalize your experience.
                        </Text>
                    </View>

                    <Text style={styles.label}>Your Name *</Text>
                    <View style={styles.row}>
                        <View style={styles.inputHalf}>
                            <Input
                                value={firstName}
                                onChangeText={(text) => {
                                    setFirstName(text);
                                    setErrors(prev => ({ ...prev, firstName: null }));
                                }}
                                placeholder="First Name"
                                error={errors.firstName}
                            />
                        </View>
                        <View style={styles.inputHalf}>
                            <Input
                                value={lastName}
                                onChangeText={(text) => {
                                    setLastName(text);
                                    setErrors(prev => ({ ...prev, lastName: null }));
                                }}
                                placeholder="Last Name"
                                error={errors.lastName}
                            />
                        </View>
                    </View>

                    <Input
                        label="Phone Number"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="e.g. 0300-1234567"
                        keyboardType="phone-pad"
                    />
                </ScrollView>

                <View style={styles.footer}>
                    <Button
                        title="Continue"
                        onPress={handleContinue}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1 },
    scroll: { padding: theme.spacing.lg, paddingTop: theme.spacing.xl },
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
    row: {
        flexDirection: 'row',
        gap: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    inputHalf: { flex: 1 },
    footer: {
        padding: theme.spacing.lg,
        borderTopWidth: 1,
        borderTopColor: '#f3f4f6',
    },
});
