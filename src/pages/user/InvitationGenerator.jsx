import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    Calendar,
    MapPin,
    Clock,
    Type,
    Palette,
    Monitor,
    Image as ImageIcon,
    Check,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Download,
    Share2
} from 'lucide-react';
import client from '../../api/client';
import Loading from '../../components/Loading';
import './InvitationGenerator.css';

const THEMES = [
    { id: 'Modern Minimalist', name: 'Modern Minimalist', desc: 'Clean lines and simple elegance' },
    { id: 'Traditional/Ornate', name: 'Traditional', desc: 'Royal borders and classic fonts' },
    { id: 'Floral/Bohemian', name: 'Floral/Boho', desc: 'Natural motifs and soft textures' },
    { id: 'Whimsical', name: 'Whimsical', desc: 'Playful fonts and vibrant colors' }
];

const TONES = [
    { id: 'Formal', name: 'Formal', desc: '"The honour of your presence..." ' },
    { id: 'Casual/Modern', name: 'Casual', desc: '"We’re getting married! Join us."' },
    { id: 'Poetic', name: 'Poetic', desc: 'Short verses and emotional quotes' }
];

const InvitationGenerator = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generatedInvitation, setGeneratedInvitation] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        essentials: {
            names: '',
            date: '',
            time: '',
            venueName: '',
            venueCity: '',
            mapLink: ''
        },
        style: {
            theme: 'Modern Minimalist',
            colorPalette: 'Classic Black and White',
            orientation: 'Portrait',
            imagery: ''
        },
        tone: 'Formal'
    });

    const updateEssentials = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            essentials: { ...prev.essentials, [name]: value }
        }));
    };

    const updateStyle = (field, value) => {
        setFormData(prev => ({
            ...prev,
            style: { ...prev.style, [field]: value }
        }));
    };

    const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const response = await client.post('/invitations/generate', formData);
            setGeneratedInvitation(response.data.data);
            setStep(4);
            toast.success('Invitation generated with Gemini AI!');
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Failed to generate invitation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="form-step-content">
            <h3>1. The Essentials</h3>
            <p className="step-subtitle">All the important details for your big day.</p>

            <div className="form-group">
                <label>Names</label>
                <input
                    type="text"
                    name="names"
                    placeholder="e.g., Sarah & Ahmad or Mr. & Mrs. Khan"
                    value={formData.essentials.names}
                    onChange={updateEssentials}
                    className="form-input"
                />
            </div>

            <div className="grid-2">
                <div className="form-group">
                    <label>Date</label>
                    <input
                        type="date"
                        name="date"
                        value={formData.essentials.date}
                        onChange={updateEssentials}
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label>Time</label>
                    <input
                        type="time"
                        name="time"
                        value={formData.essentials.time}
                        onChange={updateEssentials}
                        className="form-input"
                    />
                </div>
            </div>

            <div className="form-group">
                <label>Venue Name</label>
                <input
                    type="text"
                    name="venueName"
                    placeholder="e.g., Pearl Continental"
                    value={formData.essentials.venueName}
                    onChange={updateEssentials}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label>City</label>
                <input
                    type="text"
                    name="venueCity"
                    placeholder="Lahore"
                    value={formData.essentials.venueCity}
                    onChange={updateEssentials}
                    className="form-input"
                />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="form-step-content">
            <h3>2. The Style</h3>
            <p className="step-subtitle">Define the visual vibe of your card.</p>

            <div className="form-group">
                <label>Theme</label>
                <div className="options-grid">
                    {THEMES.map(theme => (
                        <div
                            key={theme.id}
                            className={`option-card ${formData.style.theme === theme.id ? 'selected' : ''}`}
                            onClick={() => updateStyle('theme', theme.id)}
                        >
                            <strong>{theme.name}</strong>
                            <p style={{ fontSize: '0.7rem' }}>{theme.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label>Color Palette</label>
                <input
                    type="text"
                    placeholder="e.g., Gold & Navy, Sage & Pink"
                    value={formData.style.colorPalette}
                    onChange={(e) => updateStyle('colorPalette', e.target.value)}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label>Orientation</label>
                <div className="options-grid">
                    <div
                        className={`option-card ${formData.style.orientation === 'Portrait' ? 'selected' : ''}`}
                        onClick={() => updateStyle('orientation', 'Portrait')}
                    >
                        Portrait
                    </div>
                    <div
                        className={`option-card ${formData.style.orientation === 'Landscape' ? 'selected' : ''}`}
                        onClick={() => updateStyle('orientation', 'Landscape')}
                    >
                        Landscape
                    </div>
                </div>
            </div>

            <div className="form-group">
                <label>Imagery / Motifs (Optional)</label>
                <input
                    type="text"
                    placeholder="e.g., Roses, Minimalist Line Art"
                    value={formData.style.imagery}
                    onChange={(e) => updateStyle('imagery', e.target.value)}
                    className="form-input"
                />
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="form-step-content">
            <h3>3. Tone of Voice</h3>
            <p className="step-subtitle">How should your invitation sound?</p>

            <div className="form-group">
                {TONES.map(tone => (
                    <div
                        key={tone.id}
                        className={`option-card mb-3 ${formData.tone === tone.id ? 'selected' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, tone: tone.id }))}
                        style={{ textAlign: 'left', padding: '1.25rem' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <strong>{tone.name}</strong>
                            {formData.tone === tone.id && <Check size={18} color="var(--pink)" />}
                        </div>
                        <p style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: '#666' }}>{tone.desc}</p>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '3rem', textAlign: 'center' }}>
                <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
                    {loading ? 'Crafting with AI...' : 'Generate My Invitation'}
                    {!loading && <Sparkles size={18} style={{ marginLeft: '0.5rem' }} />}
                </button>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="form-step-content text-center">
            <div className="success-icon" style={{ margin: '0 auto 1.5rem' }}>
                <Check size={40} color="white" />
            </div>
            <h3>Your Invitation is Ready!</h3>
            <p>Gemini AI has crafted a personalized invitation for you.</p>

            <div className="action-buttons-grid mt-4">
                <button className="user-login-btn" style={{ width: '100%' }}>
                    <Download size={18} /> Download Image
                </button>
                <button className="view-profile-btn" style={{ width: '100%', margin: 0 }}>
                    <Share2 size={18} /> Share Link
                </button>
            </div>

            <button onClick={() => setStep(1)} className="mt-4" style={{ border: 'none', background: 'none', color: 'var(--gray-500)', cursor: 'pointer' }}>
                Edit & Regenerate
            </button>
        </div>
    );

    // Live Preview Component
    const Preview = () => {
        const { essentials, style, tone } = formData;
        const content = generatedInvitation?.generatedContent || {
            headline: 'Join Us for a Special Celebration',
            bodyText: 'Together with our families, we invite you to celebrate our wedding day.',
            footerText: 'We can\'t wait to share this moment with you.',
            rsvpInfo: 'Please RSVP soon.'
        };

        return (
            <div className={`invitation-preview theme-${style.theme.toLowerCase().replace(/[^a-z]/g, '_')} ${style.orientation.toLowerCase()}`}>
                <div className="card-header">{content.headline}</div>
                <div className="card-names">{essentials.names || 'Names Here'}</div>
                <div className="card-body">{content.bodyText}</div>
                <div className="card-venue">
                    <MapPin size={16} /> {essentials.venueName || 'Venue'}
                    <br /> {essentials.venueCity || 'City'}
                </div>
                <div className="card-date-time">
                    <Calendar size={16} /> {essentials.date || 'Date'} | <Clock size={16} /> {essentials.time || 'Time'}
                </div>
                <div className="card-rsvp">{content.rsvpInfo}</div>
            </div>
        );
    };

    return (
        <div className="invitation-generator-container">
            <div className="generator-form-card">
                <div className="wizard-steps">
                    {[1, 2, 3, 4].map(s => (
                        <div
                            key={s}
                            className={`step-indicator ${step === s ? 'active' : step > s ? 'completed' : ''}`}
                        >
                            {step > s ? <Check size={18} /> : s}
                        </div>
                    ))}
                </div>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}

                {step < 3 && (
                    <div className="wizard-actions">
                        <button
                            className="search-button"
                            style={{ backgroundColor: '#95a5a6' }}
                            onClick={handleBack}
                            disabled={step === 1}
                        >
                            <ChevronLeft size={18} /> Back
                        </button>
                        <button className="search-button" onClick={handleNext}>
                            Next <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>

            <div className="preview-container">
                <h3 className="mb-4">Live Preview</h3>
                <Preview />
                <p className="mt-3 text-muted" style={{ fontSize: '0.8rem' }}>* Appearance may vary slightly on different devices</p>
            </div>
        </div>
    );
};

export default InvitationGenerator;
