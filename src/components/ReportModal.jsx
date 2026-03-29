import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Flag, X } from 'lucide-react';
import './ReportModal.css';

function ReportModal({
  isOpen,
  onClose,
  onSubmit,
  title = 'Report Content',
  subtitle = '',
  submitLabel = 'Submit Report',
  submitting = false,
  reasonOptions = [],
}) {
  const [reasonCategory, setReasonCategory] = useState('other');
  const [presetReason, setPresetReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [description, setDescription] = useState('');

  const hasPresets = Array.isArray(reasonOptions) && reasonOptions.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    setReasonCategory(hasPresets ? reasonOptions[0]?.value || 'other' : 'other');
    setPresetReason(hasPresets ? reasonOptions[0]?.label || '' : '');
    setCustomReason('');
    setDescription('');
  }, [isOpen, hasPresets, reasonOptions]);

  useEffect(() => {
    if (!hasPresets) {
      setReasonCategory('other');
      setPresetReason('');
      return;
    }

    const selected = reasonOptions.find((opt) => opt.value === reasonCategory);
    setPresetReason(selected?.label || '');
  }, [reasonCategory, hasPresets, reasonOptions]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanReason = (reasonCategory === 'other' || !hasPresets)
      ? customReason.trim()
      : String(presetReason || '').trim();

    if (!cleanReason) return;

    await onSubmit({
      reasonCategory,
      reason: cleanReason,
      description: description.trim(),
    });
  };

  return createPortal(
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-head">
          <div className="report-modal-title-wrap">
            <span className="report-modal-icon"><Flag size={15} /></span>
            <div>
              <h2 className="report-modal-title">{title}</h2>
              {subtitle && <p className="report-modal-subtitle">{subtitle}</p>}
            </div>
          </div>
          <button type="button" className="report-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="report-form" onSubmit={handleSubmit}>
          {hasPresets && (
            <>
              <label className="report-label" htmlFor="reportReasonCategory">Reason Category <span>*</span></label>
              <select
                id="reportReasonCategory"
                className="report-input"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
              >
                {reasonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </>
          )}

          {(reasonCategory === 'other' || !hasPresets) && (
            <>
              <label className="report-label" htmlFor="reportReasonCustom">Reason <span>*</span></label>
              <input
                id="reportReasonCustom"
                type="text"
                className="report-input"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Explain what you are reporting"
                maxLength={500}
                required
              />
            </>
          )}

          <label className="report-label" htmlFor="reportDetails">Details (optional)</label>
          <textarea
            id="reportDetails"
            className="report-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any context that can help admin review this report"
            maxLength={2000}
            rows={4}
          />

          <div className="report-actions">
            <button type="button" className="report-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="report-btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default ReportModal;
