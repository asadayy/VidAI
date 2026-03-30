import { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
    Calendar, MapPin, Clock, Check, ChevronRight, ChevronLeft,
    Sparkles, Download, Heart, Palette, AlignLeft,
    Image as ImageIcon, Loader2, RefreshCw, Mail
} from 'lucide-react';
import html2canvas from 'html2canvas';
import client from '../../api/client';
import './InvitationGenerator.css';

const THEMES = [
    { id: 'Modern Minimalist', name: 'Modern Minimalist', emoji: '◻️', desc: 'Clean lines, simple elegance' },
    { id: 'Traditional/Ornate', name: 'Traditional', emoji: '🏛️', desc: 'Royal borders, classic fonts' },
    { id: 'Floral/Bohemian', name: 'Floral / Boho', emoji: '🌸', desc: 'Natural motifs, soft textures' },
    { id: 'Whimsical', name: 'Whimsical', emoji: '✨', desc: 'Playful fonts, vibrant colors' },
];

const TONES = [
    { id: 'Formal', name: 'Formal', emoji: '🎩', desc: '"The honour of your presence is requested…"' },
    { id: 'Casual/Modern', name: 'Casual / Modern', emoji: '🥂', desc: '"We\'re getting married! Come celebrate with us!"' },
    { id: 'Poetic', name: 'Poetic', emoji: '📜', desc: 'Short verses and heartfelt emotional quotes' },
];

const STEPS = [
    { n: 1, label: 'Essentials' },
    { n: 2, label: 'Style' },
    { n: 3, label: 'Tone' },
    { n: 4, label: 'Preview' },
];

// Strip markdown bold/italic syntax from AI-generated text
const stripMarkdown = (text = '') =>
    text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/\_\_(.+?)\_\_()/g, '$1')
        .replace(/\_(.+?)\_/g, '$1')
        .trim();

const InvitationGenerator = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [generatedInvitation, setGeneratedInvitation] = useState(null);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
    const [imageGenerating, setImageGenerating] = useState(false);
    const previewRef = useRef(null); // kept for live preview card ref

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

    const handleDownloadPreview = async () => {
        if (!previewRef.current) return;
        try {
            const canvas = await html2canvas(previewRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: null,
            });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `invitation-preview-${Date.now()}.png`;
            link.click();
            toast.success('Preview downloaded!');
        } catch {
            toast.error('Could not capture preview.');
        }
    };

    const handleDownloadImage = async () => {
        if (!generatedImageUrl) return;
        try {
            // Convert base64 data URL → Blob → object URL for reliable download
            const res = await fetch(generatedImageUrl);
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `invitation-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            toast.success('Invitation downloaded!');
        } catch {
            // Fallback: direct data URL download
            const link = document.createElement('a');
            link.href = generatedImageUrl;
            link.download = `invitation-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Invitation downloaded!');
        }
    };

    const handleGenerate = async () => {
        setLoading(true);
        setGeneratedImageUrl(null);
        try {
            // Step 1: Generate invitation text
            const response = await client.post('/invitations/generate', formData);
            const invitationData = response.data.data;
            setGeneratedInvitation(invitationData);
            setStep(4);
            toast.success('Invitation text generated!');

            // Step 2: Generate image via HuggingFace FLUX.1-dev
            setImageGenerating(true);
            try {
                const imageResponse = await client.post('/invitations/generate-image', {
                    essentials: formData.essentials,
                    style: formData.style,
                    tone: formData.tone,
                    generatedContent: invitationData.generatedContent,
                });
                const { imageBase64, mimeType } = imageResponse.data.data;
                setGeneratedImageUrl(`data:${mimeType};base64,${imageBase64}`);
                toast.success('Invitation image ready!');
            } catch (imgErr) {
                console.error('Image generation error:', imgErr);
                toast.error('Could not generate invitation image.');
            } finally {
                setImageGenerating(false);
            }
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Failed to generate invitation. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <div className="ig-step">
            <div className="ig-step-head">
                <Heart size={20} className="ig-step-icon" />
                <div>
                    <h3 className="ig-step-title">The Essentials</h3>
                    <p className="ig-step-sub">All the important details for your big day.</p>
                </div>
            </div>

            <div className="ig-field">
                <label className="ig-label">Couple Names</label>
                <input type="text" name="names"
                    placeholder="e.g., Sarah & Ahmad or Mr. & Mrs. Khan"
                    value={formData.essentials.names}
                    onChange={updateEssentials}
                    className="ig-input" />
            </div>

            <div className="ig-row-2">
                <div className="ig-field">
                    <label className="ig-label"><Calendar size={14} /> Date</label>
                    <input type="date" name="date"
                        value={formData.essentials.date}
                        onChange={updateEssentials}
                        className="ig-input" />
                </div>
                <div className="ig-field">
                    <label className="ig-label"><Clock size={14} /> Time</label>
                    <input type="time" name="time"
                        value={formData.essentials.time}
                        onChange={updateEssentials}
                        className="ig-input" />
                </div>
            </div>

            <div className="ig-field">
                <label className="ig-label"><MapPin size={14} /> Venue Name</label>
                <input type="text" name="venueName"
                    placeholder="e.g., Pearl Continental"
                    value={formData.essentials.venueName}
                    onChange={updateEssentials}
                    className="ig-input" />
            </div>

            <div className="ig-field">
                <label className="ig-label">City</label>
                <input type="text" name="venueCity"
                    placeholder="e.g., Islamabad"
                    value={formData.essentials.venueCity}
                    onChange={updateEssentials}
                    className="ig-input" />
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="ig-step">
            <div className="ig-step-head">
                <Palette size={20} className="ig-step-icon" />
                <div>
                    <h3 className="ig-step-title">The Style</h3>
                    <p className="ig-step-sub">Define the visual vibe of your card.</p>
                </div>
            </div>

            <div className="ig-field">
                <label className="ig-label">Theme</label>
                <div className="ig-cards-grid">
                    {THEMES.map(t => (
                        <button key={t.id}
                            className={`ig-opt-card ${formData.style.theme === t.id ? 'ig-opt-card--sel' : ''}`}
                            onClick={() => updateStyle('theme', t.id)}>
                            <span className="ig-opt-emoji">{t.emoji}</span>
                            <strong className="ig-opt-name">{t.name}</strong>
                            <span className="ig-opt-desc">{t.desc}</span>
                            {formData.style.theme === t.id && <Check size={14} className="ig-opt-check" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ig-field">
                <label className="ig-label"><Palette size={14} /> Color Palette</label>
                <input type="text"
                    placeholder="e.g., Gold & Navy, Rose Gold, Sage & Pink"
                    value={formData.style.colorPalette}
                    onChange={(e) => updateStyle('colorPalette', e.target.value)}
                    className="ig-input" />
            </div>

            <div className="ig-field">
                <label className="ig-label">Orientation</label>
                <div className="ig-row-2">
                    {['Portrait', 'Landscape'].map(o => (
                        <button key={o}
                            className={`ig-orient-btn ${formData.style.orientation === o ? 'ig-orient-btn--sel' : ''}`}
                            onClick={() => updateStyle('orientation', o)}>
                            <span className={`ig-orient-icon ig-orient-icon--${o.toLowerCase()}`} />
                            {o}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ig-field">
                <label className="ig-label"><ImageIcon size={14} /> Imagery / Motifs <span className="ig-optional">(optional)</span></label>
                <input type="text"
                    placeholder="e.g., Roses, Minimalist Line Art, Mandala"
                    value={formData.style.imagery}
                    onChange={(e) => updateStyle('imagery', e.target.value)}
                    className="ig-input" />
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="ig-step">
            <div className="ig-step-head">
                <AlignLeft size={20} className="ig-step-icon" />
                <div>
                    <h3 className="ig-step-title">Tone of Voice</h3>
                    <p className="ig-step-sub">How should your invitation sound?</p>
                </div>
            </div>

            <div className="ig-tone-list">
                {TONES.map(t => (
                    <button key={t.id}
                        className={`ig-tone-card ${formData.tone === t.id ? 'ig-tone-card--sel' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, tone: t.id }))}>
                        <span className="ig-tone-emoji">{t.emoji}</span>
                        <div className="ig-tone-body">
                            <strong className="ig-tone-name">{t.name}</strong>
                            <span className="ig-tone-desc">{t.desc}</span>
                        </div>
                        <span className={`ig-tone-dot ${formData.tone === t.id ? 'ig-tone-dot--sel' : ''}`}>
                            {formData.tone === t.id && <Check size={12} />}
                        </span>
                    </button>
                ))}
            </div>

            <div className="ig-generate-wrap">
                <button className="ig-generate-btn" onClick={handleGenerate} disabled={loading}>
                    {loading
                        ? <><Loader2 size={18} className="ig-spin" /> Crafting your invitation…</>
                        : <><Sparkles size={18} /> Generate My Invitation</>}
                </button>
                <p className="ig-generate-note">Powered by Gemini AI · Usually takes 15–30 seconds</p>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="ig-step ig-step--result">
            <div className="ig-result-badge">
                <Check size={22} />
            </div>
            <h3 className="ig-result-title">Your Invitation is Ready!</h3>
            <p className="ig-result-sub">Crafted by Gemini AI</p>

            {/* AI Image */}
            {generatedImageUrl ? (
                <div className="ig-image-wrap">
                    <img
                        src={generatedImageUrl}
                        alt="AI-generated invitation"
                        className="ig-invite-img"
                    />
                    <button className="ig-img-download" onClick={handleDownloadImage} title="Download invitation">
                        <Download size={18} />
                        <span>Download</span>
                    </button>
                </div>
            ) : imageGenerating ? (
                <div className="ig-img-loading">
                    <Loader2 size={28} className="ig-spin" />
                    <p>Generating image with Gemini AI…</p>
                    <span>This may take ~20 seconds</span>
                </div>
            ) : null}

            {!imageGenerating && !generatedImageUrl && (
                <div className="ig-img-loading">
                    <ImageIcon size={28} />
                    <p>Image will appear here</p>
                </div>
            )}

            <button className="ig-regen-btn" onClick={() => { setStep(1); setGeneratedImageUrl(null); }}>
                <RefreshCw size={15} /> Edit & Regenerate
            </button>
        </div>
    );

    // Live Preview
    const Preview = () => {
        const { essentials, style } = formData;
        const content = generatedInvitation?.generatedContent || {
            headline: 'Join Us for a Special Celebration',
            bodyText: 'Together with our families, we invite you to celebrate our wedding day.',
            footerText: 'We cannot wait to share this moment with you.',
            rsvpInfo: 'Kindly RSVP at your earliest convenience.',
        };
        const themeKey = `theme-${style.theme.toLowerCase().replace(/[^a-z]/g, '_')}`;
        return (
            <div ref={previewRef} className={`ig-preview-card ${themeKey} ${style.orientation.toLowerCase()}`}>
                <div className="ig-pc-header">{stripMarkdown(content.headline)}</div>
                <div className="ig-pc-names">{stripMarkdown(essentials.names) || 'Names Here'}</div>
                <div className="ig-pc-divider" />
                <div className="ig-pc-body">{stripMarkdown(content.bodyText)}</div>
                <div className="ig-pc-venue">
                    <MapPin size={13} />
                    <span>{essentials.venueName || 'Venue'}{essentials.venueCity ? `, ${essentials.venueCity}` : ''}</span>
                </div>
                <div className="ig-pc-datetime">
                    <span><Calendar size={12} /> {essentials.date || 'Date'}</span>
                    <span className="ig-pc-sep">·</span>
                    <span><Clock size={12} /> {essentials.time || 'Time'}</span>
                </div>
                <div className="ig-pc-footer">{stripMarkdown(content.footerText)}</div>
                <div className="ig-pc-rsvp">{stripMarkdown(content.rsvpInfo)}</div>
            </div>
        );
    };

    return (
        <div className="ig-page">
            {/* Form card */}
            <div className="ig-form-card">

                {/* Stepper */}
                <div className="ig-stepper">
                    <div className="ig-stepper-line" />
                    {STEPS.map(s => (
                        <div key={s.n} className="ig-stepper-item">
                            <div className={`ig-stepper-dot ${
                                step === s.n ? 'ig-stepper-dot--active' :
                                step > s.n  ? 'ig-stepper-dot--done' : ''
                            }`}>
                                {step > s.n ? <Check size={13} /> : s.n}
                            </div>
                            <span className={`ig-stepper-label ${step === s.n ? 'ig-stepper-label--active' : ''}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}

                {step < 3 && (
                    <div className="ig-nav">
                        <button className="ig-nav-btn ig-nav-btn--back" onClick={handleBack} disabled={step === 1}>
                            <ChevronLeft size={16} /> Back
                        </button>
                        <button className="ig-nav-btn ig-nav-btn--next" onClick={handleNext}>
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                )}
                {step === 3 && (
                    <div className="ig-nav">
                        <button className="ig-nav-btn ig-nav-btn--back" onClick={handleBack}>
                            <ChevronLeft size={16} /> Back
                        </button>
                    </div>
                )}
            </div>

            {/* Preview panel */}
            <div className="ig-preview-panel">
                <div className="ig-preview-label">
                    <Mail size={14} /> Live Preview
                </div>
                <div className="ig-preview-wrap">
                    <Preview />
                    <button className="ig-preview-dl" onClick={handleDownloadPreview} title="Download preview">
                        <Download size={15} />
                        <span>Download Preview</span>
                    </button>
                </div>
                <p className="ig-preview-note">* Appearance may differ slightly in the final image</p>
            </div>
        </div>
    );
};

export default InvitationGenerator;
