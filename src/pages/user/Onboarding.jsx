import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import toast from 'react-hot-toast';

import './Onboarding.css';

const LOCATIONS = ['Islamabad', 'Rawalpindi'];

const EVENT_TYPES = [
    'Baraat', 'Walima', 'Mehndi', 'Nikkah',
    'Engagement', 'Other'
];

const VENUE_TYPES = [
    'Banquet Hall', 'Outdoor Garden', 'Farmhouse',
    'Marquee'
];

const FOOD_OPTIONS = [
    'Full Buffet', 'Hi-Tea', 'Sit-down Dinner',
    'Mixed / Fusion', 'No Preference'
];

const TOTAL_STEPS = 4;

const Onboarding = () => {
    const navigate = useNavigate();
    const { updateUser } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1 – Personal Details
        firstName: '',
        lastName: '',
        phone: '',
        // Step 2 – Event Planning
        eventTypes: [],
        eventDate: '',
        weddingLocation: '',
        // Step 3 – Venue & Guests
        venueType: '',
        guestCount: 200,
        foodPreference: '',
        // Step 4 – Budget
        totalBudget: '',
    });

    const nextStep = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const updateForm = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

    const toggleArrayItem = (key, value) => {
        setFormData(prev => {
            const arr = prev[key];
            if (arr.includes(value)) {
                return { ...prev, [key]: arr.filter(i => i !== value) };
            }
            return { ...prev, [key]: [...arr, value] };
        });
    };

    const handleFinish = async () => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                totalBudget: formData.totalBudget ? Number(formData.totalBudget) : 0,
                guestCount: Number(formData.guestCount),
            };
            const { data } = await client.post('/auth/onboarding', payload);
            if (data.success) {
                updateUser(data.data.user);
                toast.success('Onboarding complete!');
                navigate('/user');
            }
        } catch {
            toast.error('Failed to save details. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Format number with commas for display
    const formatPKR = (val) => {
        if (!val) return '';
        return Number(val).toLocaleString('en-PK');
    };

    return (
        <div className="onboarding-page">
            <div className="onboarding-container">
                {/* Step indicator */}
                <div className="onboarding-stepper">
                    {[1, 2, 3, 4].map((n, i) => (
                        <React.Fragment key={n}>
                            <span className={`dot ${step >= n ? 'active' : ''} ${step === n ? 'current' : ''}`}>{n}</span>
                            {i < 3 && <span className={`line ${step > n ? 'done' : ''}`} />}
                        </React.Fragment>
                    ))}
                </div>

                {/* ── Step 1: Personal Details ── */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <h2>👋 Let's get to know you</h2>
                        <p>Tell us a bit about yourself so we can personalize your experience.</p>

                        <div className="form-group-row">
                            <div className="form-group">
                                <label>First Name *</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => updateForm('firstName', e.target.value)}
                                    placeholder="e.g. Haris"
                                />
                            </div>
                            <div className="form-group">
                                <label>Last Name *</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => updateForm('lastName', e.target.value)}
                                    placeholder="e.g. Ismail"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => updateForm('phone', e.target.value)}
                                placeholder="e.g. 0300-1234567"
                            />
                        </div>

                        <div className="onboarding-actions">
                            <button
                                className="btn-primary"
                                onClick={nextStep}
                                disabled={!formData.firstName || !formData.lastName}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Event Planning ── */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <h2>🎉 What are you planning?</h2>
                        <p>Tell us about the event so we can find the best vendors for you.</p>

                        <div className="form-group">
                            <label>What event(s) are you planning? *</label>
                            <div className="chip-grid">
                                {EVENT_TYPES.map(evt => (
                                    <button
                                        key={evt}
                                        className={`chip ${formData.eventTypes.includes(evt) ? 'active' : ''}`}
                                        onClick={() => toggleArrayItem('eventTypes', evt)}
                                    >
                                        {evt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>When's the big day?</label>
                            <input
                                type="date"
                                value={formData.eventDate}
                                onChange={(e) => updateForm('eventDate', e.target.value)}
                                className="form-input"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="form-group">
                            <label>Preferred Location *</label>
                            <div className="chip-grid">
                                {LOCATIONS.map(loc => (
                                    <button
                                        key={loc}
                                        className={`chip ${formData.weddingLocation === loc ? 'active' : ''}`}
                                        onClick={() => updateForm('weddingLocation', loc)}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button
                                className="btn-primary"
                                onClick={nextStep}
                                disabled={formData.eventTypes.length === 0 || !formData.weddingLocation}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Venue & Guests ── */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <h2>🏛️ Venue & Guest Preferences</h2>
                        <p>Help us understand your ideal setup.</p>

                        <div className="form-group">
                            <label>What kind of venue do you want? *</label>
                            <div className="chip-grid">
                                {VENUE_TYPES.map(v => (
                                    <button
                                        key={v}
                                        className={`chip ${formData.venueType === v ? 'active' : ''}`}
                                        onClick={() => updateForm('venueType', v)}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>How many guests do you expect? <strong>{formData.guestCount}</strong></label>
                            <input
                                type="range"
                                min="20" max="2000" step="10"
                                value={formData.guestCount}
                                onChange={(e) => updateForm('guestCount', parseInt(e.target.value))}
                                className="range-slider"
                            />
                            <div className="range-labels">
                                <span>20</span>
                                <span>500</span>
                                <span>1000</span>
                                <span>2000</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>What kind of food do you want to serve?</label>
                            <div className="chip-grid">
                                {FOOD_OPTIONS.map(f => (
                                    <button
                                        key={f}
                                        className={`chip ${formData.foodPreference === f ? 'active' : ''}`}
                                        onClick={() => updateForm('foodPreference', f)}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button
                                className="btn-primary"
                                onClick={nextStep}
                                disabled={!formData.venueType}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 4: Budget ── */}
                {step === 4 && (
                    <div className="onboarding-step">
                        <h2>💰 What's your budget?</h2>
                        <p>Set a total budget for your event. You can always change it later in the Budget Planner.</p>

                        <div className="form-group budget-input-group">
                            <label>Total Event Budget (PKR)</label>
                            <div className="budget-input-wrapper">
                                <span className="currency-prefix">Rs.</span>
                                <input
                                    type="number"
                                    value={formData.totalBudget}
                                    onChange={(e) => updateForm('totalBudget', e.target.value)}
                                    placeholder="e.g. 500000"
                                    min="0"
                                    className="budget-input"
                                />
                            </div>
                            {formData.totalBudget && (
                                <p className="budget-display">
                                    Rs. {formatPKR(formData.totalBudget)}
                                </p>
                            )}
                        </div>

                        <div className="budget-quick-picks">
                            <label>Quick pick:</label>
                            <div className="chip-grid">
                                {[200000, 500000, 1000000, 2000000, 5000000].map(amt => (
                                    <button
                                        key={amt}
                                        className={`chip ${Number(formData.totalBudget) === amt ? 'active' : ''}`}
                                        onClick={() => updateForm('totalBudget', amt.toString())}
                                    >
                                        Rs. {formatPKR(amt)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                                {loading ? 'Saving...' : 'Finish Setup'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Onboarding;
