import { useState, useEffect, useCallback } from 'react';
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
  XCircle,
} from 'lucide-react';
import './VendorServices.css';

const EMPTY_PKG = { name: '', description: '', price: '', features: [''] };

const formatPrice = (price) => `PKR ${Number(price).toLocaleString('en-PK')}`;

function VendorServices() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState(null); // null = add, object = edit
  const [form, setForm] = useState(EMPTY_PKG);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirm
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

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Modal helpers ──
  const openAdd = () => {
    setEditingPkg(null);
    setForm(EMPTY_PKG);
    setShowModal(true);
  };

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

  const closeModal = () => {
    setShowModal(false);
    setEditingPkg(null);
    setForm(EMPTY_PKG);
  };

  // ── Form updates ──
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

  // ── Submit (add or update) ──
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Package name is required');
      return;
    }
    if (!form.price || Number(form.price) < 0) {
      toast.error('Enter a valid price');
      return;
    }

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
      const msg = err.response?.data?.message || 'Operation failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete ──
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

  // ── Toggle active ──
  const toggleActive = async (pkg) => {
    try {
      await vendorAPI.updatePackage(pkg._id, { isActive: !pkg.isActive });
      toast.success(pkg.isActive ? 'Package deactivated' : 'Package activated');
      await fetchProfile();
    } catch {
      toast.error('Failed to update package status');
    }
  };

  if (loading) return <Loading fullScreen message="Loading services..." />;

  const packages = vendor?.packages || [];

  return (
    <div className="vendor-services">
      <div className="page-header">
        <div>
          <h1>Service Packages</h1>
          <p className="page-subtitle">
            Create and manage the packages you offer to customers
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Package
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={48} className="empty-icon" />
            <h3>No packages yet</h3>
            <p>
              Add your first service package so customers can see what you offer
              and book your services.
            </p>
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> Add Your First Package
            </button>
          </div>
        </div>
      ) : (
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div key={pkg._id} className={`package-card ${!pkg.isActive ? 'package-inactive' : ''}`}>
              <div className="package-card-header">
                <h3 className="package-card-name">{pkg.name}</h3>
                <div className="package-card-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => toggleActive(pkg)}
                    title={pkg.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {pkg.isActive ? <CheckCircle2 size={16} className="text-success" /> : <XCircle size={16} className="text-muted" />}
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openEdit(pkg)}
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => setDeleteTarget(pkg)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="package-card-price">{formatPrice(pkg.price)}</div>

              {pkg.description && (
                <p className="package-card-desc">{pkg.description}</p>
              )}

              {pkg.features?.length > 0 && (
                <ul className="package-features">
                  {pkg.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}

              {!pkg.isActive && (
                <span className="badge badge-neutral package-inactive-badge">Inactive</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-content service-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPkg ? 'Edit Package' : 'Add Package'}</h2>
              <button type="button" className="modal-close" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="pkgName">Package name *</label>
                <input
                  id="pkgName"
                  type="text"
                  placeholder="e.g. Premium Photography"
                  value={form.name}
                  onChange={updateField('name')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pkgPrice">Price (PKR) *</label>
                <input
                  id="pkgPrice"
                  type="number"
                  min="0"
                  placeholder="e.g. 150000"
                  value={form.price}
                  onChange={updateField('price')}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="pkgDesc">Description</label>
                <textarea
                  id="pkgDesc"
                  rows={3}
                  placeholder="Brief description of what this package includes"
                  value={form.description}
                  onChange={updateField('description')}
                />
              </div>

              <div className="form-group">
                <label>Features</label>
                {form.features.map((f, i) => (
                  <div key={i} className="feature-input-row">
                    <input
                      type="text"
                      placeholder={`Feature ${i + 1}`}
                      value={f}
                      onChange={updateFeature(i)}
                    />
                    {form.features.length > 1 && (
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => removeFeature(i)}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addFeature}>
                  <Plus size={14} /> Add feature
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? (editingPkg ? 'Saving...' : 'Adding...')
                    : (editingPkg ? 'Save Changes' : 'Add Package')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="modal-backdrop" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Package</h3>
            <p>
              Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorServices;
