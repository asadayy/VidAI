import { Stack } from 'expo-router';
import React, { createContext, useContext, useState } from 'react';

const OnboardingContext = createContext(null);

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
}

export default function OnboardingLayout() {
    const [onboardingData, setOnboardingData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        eventTypes: [],
        eventDate: '',
        weddingLocation: '',
        venueType: '',
        guestCount: 200,
        foodPreference: '',
        totalBudget: '',
    });

    const updateOnboardingData = (data) => {
        setOnboardingData(prev => ({ ...prev, ...data }));
    };

    return (
        <OnboardingContext.Provider value={{ onboardingData, updateOnboardingData }}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'slide_from_right'
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="step2" />
                <Stack.Screen name="step3" />
                <Stack.Screen name="step4" />
            </Stack>
        </OnboardingContext.Provider>
    );
}
