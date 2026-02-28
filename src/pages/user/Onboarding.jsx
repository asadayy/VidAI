import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import toast from 'react-hot-toast';

import './Onboarding.css';

const LOCATIONS = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi'];
const LOOKING_FOR_OPTIONS = [
    'Wedding Venue', 'Photographer', 'Makeup Artist', 'Decor',
    'Catering', 'Henna Artist', 'Car Rental', 'Wedding Stationery'
];
const EVENT_TYPES = [
    'Baraat', 'Walima', 'Mehndi', 'Nikkah',
    'Engagement', 'Home-based Event', 'Other'
];
const BUDGET_OPTIONS = [
    'Under 10,000',
    '10,000 - 25,000',
    '25,000 - 50,000',
    'Above 50,000'
];

const Onboarding = () => {
    const navigate = useNavigate();
    const { updateUser } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        weddingLocation: '',
        eventDate: '',
        guestCount: 200,
        lookingFor: [],
        eventTypes: [],
        budgets: {}
    });

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
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
            const { data } = await client.post('/auth/onboarding', formData);
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

    return (
        <div className="onboarding-page">
            <div className="onboarding-container">
                {/* Progress Bar */}
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${(step / 4) * 100}%` }}></div>
                </div>

                {step === 1 && (
                    <div className="onboarding-step">
                        <h2>Let's get to know you</h2>
                        <p>We'll ask a few questions to customize your experience.</p>

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
                            <label>Wedding Location *</label>
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
                            <button
                                className="btn-primary"
                                onClick={nextStep}
                                disabled={!formData.firstName || !formData.lastName || !formData.weddingLocation}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="onboarding-step">
                        <h2>When's the Big Day?</h2>
                        <p>Get deals & discounts tailor-made for your wedding day.</p>

                        <div className="form-group">
                            <label>Select Date</label>
                            <input
                                type="date"
                                value={formData.eventDate}
                                onChange={(e) => updateForm('eventDate', e.target.value)}
                                className="form-input"
                            />
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" onClick={nextStep}>
                                {formData.eventDate ? 'Continue' : 'Skip'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="onboarding-step">
                        <h2>Your guests and preferences</h2>
                        <p>We'll find the best match for you based on these details.</p>

                        <div className="form-group">
                            <label>Number of guests: {formData.guestCount}</label>
                            <input
                                type="range"
                                min="50" max="1000" step="50"
                                value={formData.guestCount}
                                onChange={(e) => updateForm('guestCount', parseInt(e.target.value))}
                                className="range-slider"
                            />
                        </div>

                        <div className="form-group">
                            <label>I'm looking for</label>
                            <div className="chip-grid">
                                {LOOKING_FOR_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        className={`chip ${formData.lookingFor.includes(opt) ? 'active' : ''}`}
                                        onClick={() => toggleArrayItem('lookingFor', opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Event Type</label>
                            <div className="chip-grid">
                                {EVENT_TYPES.map(opt => (
                                    <button
                                        key={opt}
                                        className={`chip ${formData.eventTypes.includes(opt) ? 'active' : ''}`}
                                        onClick={() => toggleArrayItem('eventTypes', opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" onClick={nextStep}>Continue</button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="onboarding-step">
                        <h2>Let's Get Some Estimates</h2>
                        <p>Tell us your budget limits for each category.</p>

                        {formData.lookingFor.length === 0 ? (
                            <p className="no-selection">You haven't selected any specific services. You can continue without estimates.</p>
                        ) : (
                            <div className="budget-list">
                                {formData.lookingFor.map(svc => (
                                    <div key={svc} className="form-group">
                                        <label>{svc} Budget</label>
                                        <div className="chip-grid">
                                            {BUDGET_OPTIONS.map(opt => (
                                                <button
                                                    key={opt}
                                                    className={`chip ${formData.budgets[svc] === opt ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            budgets: { ...prev.budgets, [svc]: opt }
                                                        }));
                                                    }}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="onboarding-actions">
                            <button className="btn-secondary" onClick={prevStep}>Back</button>
                            <button className="btn-primary" onClick={handleFinish} disabled={loading}>
                                {loading ? 'Saving...' : 'Finish'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Onboarding;
