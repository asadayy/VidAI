import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { vendorAPI } from '../../api/vendors';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Package,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
} from 'lucide-react';
import './VendorServices.css';

const EMPTY_PKG = { name: '', description: '', price: '', features: [''] };

const formatPrice = (price) =>
  `PKR ${Number(price).toLocaleString('en-PK')}`;

/* ─── Package Card ──────────────────────────────────────────────── */
function PackageCard({ pkg, onEdit, onDelete, onToggle }) {
  return (
    <div
      className={`vsc-card${!pkg.isActive ? ' vsc-card--inactive' : ''}`}
      style={{ '--vsc-accent': pkg.isActive ? '#D7385E' : '#9ca3af' }}
    >
      <div className="vsc-card-accent" />

      {/* Status badge */}
      <div className="vsc-card-status">
        <span className={`vsc-status-dot${pkg.isActive ? ' vsc-status-dot--active' : ''}`} />
        <span className="vsc-status-label">{pkg.isActive ? 'Active' : 'Inactive'}</span>
      </div>

      {/* Name + actions row */}
      <div className="vsc-card-top">
        <h3 className="vsc-card-name">{pkg.name}</h3>
        <div className="vsc-card-actions">
          <button
            type="button"
            className="vsc-icon-btn"
            onClick={() => onToggle(pkg)}
            title={pkg.isActive ? 'Deactivate' : 'Activate'}
          >
            {pkg.isActive
              ? <ToggleRight size={18} style={{ color: '#10B981' }} />
              : <ToggleLeft size={18} style={{ color: '#9ca3af' }} />}
          </button>
          <button
            type="button"
            className="vsc-icon-btn"
            onClick={() => onEdit(pkg)}
            title="Edit package"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            className="vsc-icon-btn vsc-icon-btn--danger"
            onClick={() => onDelete(pkg)}
            title="Delete package"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Price */}
      <div className="vsc-card-price">{formatPrice(pkg.price)}</div>

      {/* Description */}
      {pkg.description && (
        <p className="vsc-card-desc">{pkg.description}</p>
      )}

      {/* Features */}
      {pkg.features?.length > 0 && (
        <ul className="vsc-features">
          {pkg.features.map((f, i) => (
            <li key={i} className="vsc-feature-item">
              <CheckCircle2 size={13} className="vsc-feature-check" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
function VendorServices() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null);
  const [form, setForm] = useState(EMPTY_PKG);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await vendorAPI.getMyProfile();
      setVendor(data.data.vendor);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Create your vendor profile first');
      } else {
        toast.error('Failed to load services');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  /* modal helpers */
  const openAdd = () => { setEditingPkg(null); setForm(EMPTY_PKG); setShowModal(true); };
  const openEdit = (pkg) => {
    setEditingPkg(pkg);
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      price: String(pkg.price),
      features: pkg.features?.length > 0 ? [...pkg.features] : [''],
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditingPkg(null); setForm(EMPTY_PKG); };

  /* form helpers */
  const updateField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  const updateFeature = (index) => (e) =>
    setForm((prev) => {
      const features = [...prev.features];
      features[index] = e.target.value;
      return { ...prev, features };
    });
  const addFeature = () =>
    setForm((prev) => ({ ...prev, features: [...prev.features, ''] }));
  const removeFeature = (index) =>
    setForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));

  /* submit */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Package name is required'); return; }
    if (!form.price || Number(form.price) < 0) { toast.error('Enter a valid price'); return; }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      features: form.features.filter((f) => f.trim() !== ''),
    };

    setSubmitting(true);
    try {
      if (editingPkg) {
        await vendorAPI.updatePackage(editingPkg._id, payload);
        toast.success('Package updated');
      } else {
        await vendorAPI.addPackage(payload);
        toast.success('Package added');
      }
      closeModal();
      await fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await vendorAPI.deletePackage(deleteTarget._id);
      toast.success('Package deleted');
      setDeleteTarget(null);
      await fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* toggle */
  const toggleActive = async (pkg) => {
    try {
      await vendorAPI.updatePackage(pkg._id, { isActive: !pkg.isActive });
      toast.success(pkg.isActive ? 'Package deactivated' : 'Package activated');
      await fetchProfile();
    } catch {
      toast.error('Failed to update package status');
    }
  };

  if (loading) return <Loading fullScreen message="Loading services…" />;

  const packages = vendor?.packages || [];
  const activeCount = packages.filter((p) => p.isActive).length;

  return (
    <div className="vsc-page">

      {/* ── Header ── */}
      <div className="vsc-header">
        <div className="vsc-header-left">
          <h1 className="vsc-title">Service Packages</h1>
          <p className="vsc-subtitle">
            Create and manage the packages you offer to customers
          </p>
        </div>
        <button type="button" className="vsc-btn vsc-btn--primary" onClick={openAdd}>
          <Plus size={16} />
          Add Package
        </button>
      </div>

      {/* ── Stats bar ── */}
      {packages.length > 0 && (
        <div className="vsc-stats-bar">
          <div className="vsc-stat">
            <span className="vsc-stat-value">{packages.length}</span>
            <span className="vsc-stat-label">Total</span>
          </div>
          <div className="vsc-stat-divider" />
          <div className="vsc-stat">
            <span className="vsc-stat-value vsc-stat-value--green">{activeCount}</span>
            <span className="vsc-stat-label">Active</span>
          </div>
          <div className="vsc-stat-divider" />
          <div className="vsc-stat">
            <span className="vsc-stat-value vsc-stat-value--gray">{packages.length - activeCount}</span>
            <span className="vsc-stat-label">Inactive</span>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {packages.length === 0 ? (
        <div className="vsc-empty">
          <div className="vsc-empty-icon-wrap">
            <Package size={32} />
          </div>
          <h3 className="vsc-empty-title">No packages yet</h3>
          <p className="vsc-empty-text">
            Add your first service package so customers can see what you offer
            and book your services.
          </p>
          <button type="button" className="vsc-btn vsc-btn--primary" onClick={openAdd}>
            <Plus size={16} /> Add Your First Package
          </button>
        </div>
      ) : (
        <div className="vsc-grid">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={pkg}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
              onToggle={toggleActive}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit modal (portal) ── */}
      {showModal && createPortal(
        <div className="vsc-backdrop" onClick={closeModal}>
          <div className="vsc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vsc-modal-header">
              <div className="vsc-modal-title-row">
                <div className="vsc-modal-icon-wrap">
                  <Package size={18} />
                </div>
                <h2 className="vsc-modal-title">
                  {editingPkg ? 'Edit Package' : 'New Package'}
                </h2>
              </div>
              <button type="button" className="vsc-modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form className="vsc-form" onSubmit={handleSubmit}>
              <div className="vsc-field">
                <label className="vsc-label" htmlFor="pkgName">Package name <span className="vsc-required">*</span></label>
                <input
                  id="pkgName"
                  className="vsc-input"
                  type="text"
                  placeholder="e.g. Premium Photography"
                  value={form.name}
                  onChange={updateField('name')}
                  required
                />
              </div>

              <div className="vsc-field">
                <label className="vsc-label" htmlFor="pkgPrice">Price (PKR) <span className="vsc-required">*</span></label>
                <div className="vsc-input-prefix-wrap">
                  <span className="vsc-input-prefix">PKR</span>
                  <input
                    id="pkgPrice"
                    className="vsc-input vsc-input--prefixed"
                    type="number"
                    min="0"
                    placeholder="150000"
                    value={form.price}
                    onChange={updateField('price')}
                    required
                  />
                </div>
              </div>

              <div className="vsc-field">
                <label className="vsc-label" htmlFor="pkgDesc">Description</label>
                <textarea
                  id="pkgDesc"
                  className="vsc-textarea"
                  rows={3}
                  placeholder="Brief description of what this package includes"
                  value={form.description}
                  onChange={updateField('description')}
                />
              </div>

              <div className="vsc-field">
                <label className="vsc-label">Features</label>
                <div className="vsc-features-list">
                  {form.features.map((f, i) => (
                    <div key={i} className="vsc-feature-row">
                      <CheckCircle2 size={14} className="vsc-feature-row-icon" />
                      <input
                        className="vsc-input"
                        type="text"
                        placeholder={`Feature ${i + 1}`}
                        value={f}
                        onChange={updateFeature(i)}
                      />
                      {form.features.length > 1 && (
                        <button
                          type="button"
                          className="vsc-icon-btn vsc-icon-btn--danger"
                          onClick={() => removeFeature(i)}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="vsc-add-feature-btn" onClick={addFeature}>
                  <Plus size={13} /> Add feature
                </button>
              </div>

              <div className="vsc-modal-footer">
                <button type="button" className="vsc-btn vsc-btn--ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="vsc-btn vsc-btn--primary" disabled={submitting}>
                  {submitting
                    ? (editingPkg ? 'Saving…' : 'Adding…')
                    : (editingPkg ? 'Save Changes' : 'Add Package')}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete confirmation (portal) ── */}
      {deleteTarget && createPortal(
        <div className="vsc-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="vsc-modal vsc-modal--confirm" onClick={(e) => e.stopPropagation()}>
            <div className="vsc-confirm-icon-wrap">
              <AlertTriangle size={28} />
            </div>
            <h3 className="vsc-confirm-title">Delete Package?</h3>
            <p className="vsc-confirm-text">
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="vsc-modal-footer vsc-modal-footer--center">
              <button
                type="button"
                className="vsc-btn vsc-btn--ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="vsc-btn vsc-btn--danger"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default VendorServices;
