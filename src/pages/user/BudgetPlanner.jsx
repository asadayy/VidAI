import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Sparkles, Brain, X,
  Wallet, TrendingUp, TrendingDown, Target,
  ChevronRight, AlertTriangle, CheckCircle2, BarChart3,
  Star, MapPin, ArrowUpRight, Store, CalendarPlus, Settings2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { budgetAPI } from '../../api/budget';
import { eventAPI } from '../../api/index';
import { useAuth } from '../../context/AuthContext';
import './BudgetPlanner.css';

const PICKS_CATS = [
  { name: 'Venue',         emoji: '🏛️' },
  { name: 'Catering',      emoji: '🍽️' },
  { name: 'Photography',   emoji: '📸' },
  { name: 'Makeup/Mehndi', emoji: '💄' },
  { name: 'Decoration',    emoji: '🎨' },
];

const EVENT_LABELS = {
  dholki: 'Dholki', mehndi: 'Mehndi', mayun: 'Mayun', nikkah: 'Nikkah',
  baraat: 'Baraat', walima: 'Walima', engagement: 'Engagement',
  wedding: 'Wedding', full_wedding: 'Full Wedding', other: 'Other',
};

const EVENT_COLORS = {
  dholki: '#f59e0b', mehndi: '#10b981', mayun: '#eab308', nikkah: '#6366f1',
  baraat: '#D7385E', walima: '#8b5cf6', engagement: '#ec4899', other: '#64748b',
};

const CATEGORY_COLOR = {
  venue:        '#D7385E',
  catering:     '#f59e0b',
  photography:  '#6366f1',
  videography:  '#8b5cf6',
  decoration:   '#ec4899',
  music:        '#3b82f6',
  flowers:      '#10b981',
  attire:       '#f97316',
  transport:    '#14b8a6',
  invitation:   '#64748b',
  default:      '#94a3b8',
};

function catColor(cat) {
  const key = (cat || '').toLowerCase().split(' ')[0];
  return CATEGORY_COLOR[key] || CATEGORY_COLOR.default;
}

function catInitial(cat) {
  return (cat || '?').charAt(0).toUpperCase();
}

function fmtCurrency(amount) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR' }).format(amount || 0);
}

/* ── Delete Confirmation Modal ── */
function DeleteModal({ itemName, onConfirm, onCancel }) {
  return createPortal(
    <div className="bp-overlay" onClick={onCancel}>
      <div className="bp-modal bp-modal--delete" onClick={(e) => e.stopPropagation()}>
        <div className="bp-modal-icon bp-modal-icon--warn">
          <AlertTriangle size={26} />
        </div>
        <h3 className="bp-modal-title">Delete Item?</h3>
        <p className="bp-modal-sub">
          Remove <strong>{itemName}</strong> from your budget? This cannot be undone.
        </p>
        <div className="bp-modal-row">
          <button className="bp-btn bp-btn--ghost" onClick={onCancel}>Cancel</button>
          <button className="bp-btn bp-btn--danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Edit Total Budget Modal ── */
function EditBudgetModal({ amount, setAmount, onSave, onClose }) {
  return createPortal(
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-modal bp-modal--delete" onClick={(e) => e.stopPropagation()}>
        <div className="bp-modal-icon" style={{ background: '#fdf2f8', color: '#D7385E' }}>
          <Wallet size={26} />
        </div>
        <h3 className="bp-modal-title">Edit Total Budget</h3>
        <p className="bp-modal-sub">Update your overall wedding budget amount.</p>
        <form onSubmit={onSave}>
          <input
            type="number"
            className="bp-input"
            placeholder="Enter new amount (PKR)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            autoFocus
          />
          <div className="bp-modal-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="bp-btn bp-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="bp-btn bp-btn--rose">Update</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ── Add / Edit Item Modal ── */
function ItemModal({ editingItem, itemForm, setItemForm, onSave, onClose, events }) {
  return createPortal(
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bp-modal-head">
          <h3 className="bp-modal-title">{editingItem ? 'Edit Item' : 'Add Budget Item'}</h3>
          <button className="bp-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={onSave} className="bp-modal-form">
          <div className="bp-form-group">
            <label className="bp-label">Category *</label>
            <input
              className="bp-input"
              placeholder="e.g. Venue, Catering, Photography"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              required
            />
          </div>
          {events.length > 1 && (
            <div className="bp-form-group">
              <label className="bp-label">Event</label>
              <select
                className="bp-input"
                value={itemForm.weddingEvent || ''}
                onChange={(e) => setItemForm({ ...itemForm, weddingEvent: e.target.value })}
              >
                <option value="">— General (all events) —</option>
                {events.map(evt => (
                  <option key={evt._id} value={evt._id}>
                    {evt.title || EVENT_LABELS[evt.eventType] || evt.eventType}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="bp-form-group">
            <label className="bp-label">Notes</label>
            <input
              className="bp-input"
              placeholder="Additional details..."
              value={itemForm.notes}
              onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
            />
          </div>
          <div className="bp-form-row">
            <div className="bp-form-group">
              <label className="bp-label">Estimated Amount *</label>
              <input
                type="number"
                className="bp-input"
                placeholder="0"
                value={itemForm.allocatedAmount}
                onChange={(e) => setItemForm({ ...itemForm, allocatedAmount: e.target.value })}
                required
              />
            </div>
            <div className="bp-form-group">
              <label className="bp-label">Spent Amount</label>
              <input
                type="number"
                className="bp-input"
                placeholder="0"
                value={itemForm.spentAmount}
                onChange={(e) => setItemForm({ ...itemForm, spentAmount: e.target.value })}
              />
            </div>
          </div>
          <div className="bp-modal-row">
            <button type="button" className="bp-btn bp-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="bp-btn bp-btn--primary">
              {editingItem ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

const ALL_EVENT_TYPES = [
  { type: 'dholki',     label: 'Dholki',     emoji: '🥁' },
  { type: 'mayun',      label: 'Mayun',      emoji: '🌿' },
  { type: 'mehndi',     label: 'Mehndi',     emoji: '✋' },
  { type: 'nikkah',     label: 'Nikkah',     emoji: '📜' },
  { type: 'baraat',     label: 'Baraat',     emoji: '🐎' },
  { type: 'walima',     label: 'Walima',     emoji: '🍽️' },
  { type: 'engagement', label: 'Engagement', emoji: '💍' },
  { type: 'other',      label: 'Other',      emoji: '✨' },
];

/* ── Event Manager Modal ── */
function EventManagerModal({ events, totalBudget, onAddEvent, onDeleteEvent, onSaveAllocations, onClose, saving }) {
  const existingTypes = events.map(e => e.eventType);
  const availableTypes = ALL_EVENT_TYPES.filter(t => !existingTypes.includes(t.type));
  const [allocations, setAllocations] = useState(() =>
    events.map(e => ({ eventId: e._id, eventType: e.eventType, title: e.title, color: e.color, amount: e.allocatedBudget || 0 }))
  );
  const totalAlloc = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const unallocated = (totalBudget || 0) - totalAlloc;

  // Sync allocations when events change (after add/delete)
  useEffect(() => {
    setAllocations(
      events.map(e => {
        const existing = allocations.find(a => a.eventId === e._id);
        return { eventId: e._id, eventType: e.eventType, title: e.title, color: e.color, amount: existing?.amount ?? e.allocatedBudget ?? 0 };
      })
    );
  }, [events]);

  return createPortal(
    <div className="bp-overlay" onClick={onClose}>
      <div className="bp-modal bp-modal--events" onClick={e => e.stopPropagation()}>
        <div className="bp-modal-head">
          <h3 className="bp-modal-title"><Settings2 size={18} /> Manage Events</h3>
          <button className="bp-modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Current events + allocations */}
        <div className="bp-em-section">
          <p className="bp-em-subtitle">Your Events &amp; Budget Split</p>
          {allocations.length === 0 && (
            <p className="bp-em-empty">No events yet. Add your first event below.</p>
          )}
          {allocations.map(alloc => (
            <div key={alloc.eventId} className="bp-em-row">
              <span
                className="bp-em-dot"
                style={{ background: alloc.color || EVENT_COLORS[alloc.eventType] || '#64748b' }}
              />
              <span className="bp-em-name">
                {alloc.title || EVENT_LABELS[alloc.eventType] || alloc.eventType}
              </span>
              <div className="bp-em-input-wrap">
                <span className="bp-em-currency">PKR</span>
                <input
                  type="number"
                  className="bp-em-input"
                  value={alloc.amount}
                  onChange={e => {
                    const val = e.target.value;
                    setAllocations(prev => prev.map(a =>
                      a.eventId === alloc.eventId ? { ...a, amount: val === '' ? '' : Number(val) } : a
                    ));
                  }}
                  min="0"
                />
              </div>
              <button
                className="bp-icon-btn bp-icon-btn--del"
                title="Remove event"
                onClick={() => onDeleteEvent(alloc.eventId)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {allocations.length > 0 && (
            <div className="bp-em-summary">
              <div className="bp-em-summary-row">
                <span>Total Budget</span>
                <span className="bp-em-summary-val">{fmtCurrency(totalBudget)}</span>
              </div>
              <div className="bp-em-summary-row">
                <span>Allocated</span>
                <span className="bp-em-summary-val">{fmtCurrency(totalAlloc)}</span>
              </div>
              <div className={`bp-em-summary-row ${unallocated < 0 ? 'bp-em-summary-row--over' : ''}`}>
                <span>Unallocated</span>
                <span className="bp-em-summary-val">{fmtCurrency(unallocated)}</span>
              </div>
            </div>
          )}
          {allocations.length > 0 && (
            <button
              className="bp-btn bp-btn--primary bp-btn--full"
              disabled={saving}
              onClick={() => onSaveAllocations(allocations.map(a => ({
                eventId: a.eventId,
                allocatedBudget: Number(a.amount) || 0,
              })))}
            >
              {saving ? 'Saving...' : 'Save Allocations'}
            </button>
          )}
        </div>

        {/* Add event */}
        {availableTypes.length > 0 && (
          <div className="bp-em-section">
            <p className="bp-em-subtitle">Add an Event</p>
            <div className="bp-em-type-grid">
              {availableTypes.map(t => (
                <button
                  key={t.type}
                  className="bp-em-type-btn"
                  onClick={() => onAddEvent(t.type)}
                  disabled={saving}
                >
                  <span className="bp-em-type-emoji">{t.emoji}</span>
                  <span className="bp-em-type-label">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bp-modal-row">
          <button className="bp-btn bp-btn--ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ── Main Component ── */
const BudgetPlanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createAmount, setCreateAmount] = useState('');
  const [itemForm, setItemForm] = useState({ category: '', notes: '', allocatedAmount: '', spentAmount: '' });
  const [picksCategories, setPicksCategories] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vidai_picks_cats') || '[]'); } catch { return []; }
  });
  const [vendorPicks, setVendorPicks] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vidai_vendor_picks') || '[]'); } catch { return []; }
  });
  const [picksLoading, setPicksLoading] = useState(false);
  const [showAiPlan, setShowAiPlan] = useState(true);
  const [showPicksBuilder, setShowPicksBuilder] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('vidai_vendor_picks') || '[]').length === 0; } catch { return true; }
  });
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(null); // null = "All"
  const [showEventManager, setShowEventManager] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');
  const [eventSaving, setEventSaving] = useState(false);

  useEffect(() => {
    sessionStorage.setItem('vidai_picks_cats', JSON.stringify(picksCategories));
  }, [picksCategories]);

  useEffect(() => {
    sessionStorage.setItem('vidai_vendor_picks', JSON.stringify(vendorPicks));
  }, [vendorPicks]);

  useEffect(() => { fetchBudget(); fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await eventAPI.getAll();
      const evts = res.data?.data?.events || [];
      setEvents(evts);
    } catch {
      // Events are optional — silently fail
    }
  };

  const handleAddEvent = async (eventType) => {
    try {
      setEventSaving(true);
      await eventAPI.create({ eventType });
      toast.success(`${EVENT_LABELS[eventType] || eventType} event added!`);
      await Promise.all([fetchEvents(), fetchBudget()]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add event');
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setEventSaving(true);
      await eventAPI.delete(eventId);
      // If the deleted event was active, reset to "All"
      if (activeEventId === eventId) setActiveEventId(null);
      toast.success('Event removed');
      await Promise.all([fetchEvents(), fetchBudget()]);
    } catch {
      toast.error('Failed to remove event');
    } finally {
      setEventSaving(false);
    }
  };

  const handleSaveAllocations = async (allocations) => {
    try {
      setEventSaving(true);
      await eventAPI.updateAllocations(allocations);
      toast.success('Budget allocations saved!');
      await Promise.all([fetchEvents(), fetchBudget()]);
    } catch {
      toast.error('Failed to save allocations');
    } finally {
      setEventSaving(false);
    }
  };

  useEffect(() => {
    const autoCreate = async () => {
      if (!loading && !budget && user?.onboarding?.totalBudget && user.onboarding.totalBudget > 0) {
        try {
          await budgetAPI.create({ totalBudget: Number(user.onboarding.totalBudget) });
          await fetchBudget();
        } catch {
          setCreateAmount(user.onboarding.totalBudget.toString());
        }
      }
    };
    autoCreate();
  }, [loading, budget, user]);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await budgetAPI.getMine();
      const budgetData = response.data?.data?.budget || response.data?.budget;
      setBudget(budgetData);
      // Keep dashboard summary cache in sync
      queryClient.invalidateQueries({ queryKey: ['budget', 'summary'] });
    } catch (error) {
      if (error.response?.status !== 404) toast.error('Failed to load budget');
      setBudget(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!createAmount || isNaN(createAmount) || Number(createAmount) <= 0) {
      toast.error('Please enter a valid amount'); return;
    }
    try {
      await budgetAPI.create({ totalBudget: Number(createAmount) });
      toast.success('Budget created!');
      await fetchBudget();
    } catch {
      toast.error('Failed to create budget');
      setLoading(false);
    }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    if (!editBudgetAmount || isNaN(editBudgetAmount) || Number(editBudgetAmount) <= 0) {
      toast.error('Please enter a valid amount'); return;
    }
    try {
      await budgetAPI.create({ totalBudget: Number(editBudgetAmount) });
      toast.success('Budget updated!');
      setEditBudgetOpen(false);
      setEditBudgetAmount('');
      await fetchBudget();
    } catch {
      toast.error('Failed to update budget');
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      toast.loading('Generating AI budget plan...', { id: 'ai-toast' });
      await budgetAPI.generateAIPlan(activeEventId);
      setShowAiPlan(true);
      toast.success('AI Plan generated!', { id: 'ai-toast' });
      fetchBudget();
    } catch {
      toast.error('Failed to generate AI plan', { id: 'ai-toast' });
    } finally {
      setAiLoading(false);
    }
  };

  const picksTotal = picksCategories.reduce((s, c) => s + (Number(c.percentage) || 0), 0);
  const picksValid = picksCategories.length > 0
    && picksTotal > 0
    && picksTotal <= 100
    && picksCategories.every(c => Number(c.percentage) > 0);

  const togglePicksCat = (name) => {
    setPicksCategories(prev => {
      const existing = prev.find(c => c.name === name);
      if (existing) return prev.filter(c => c.name !== name);
      return [...prev, { name, percentage: '' }];
    });
  };

  const updatePicksPct = (name, value) => {
    setPicksCategories(prev =>
      prev.map(c => c.name === name ? { ...c, percentage: value } : c)
    );
  };

  const handleGetVendorPicks = async () => {
    if (!picksValid) { toast.error('Each category needs a percentage between 1–100, and total cannot exceed 100%'); return; }
    try {
      setPicksLoading(true);
      toast.loading('Finding best vendors...', { id: 'picks-toast' });
      const res = await budgetAPI.recommendVendors(
        picksCategories.map(c => ({ name: c.name, percentage: Number(c.percentage) })),
        activeEventId
      );
      const picks = res.data?.data?.picks || [];
      setVendorPicks(picks);
      if (picks.length === 0) {
        toast.error('No vendors found for these categories.', { id: 'picks-toast' });
      } else {
        toast.success(`Found ${picks.length} vendor recommendation(s)!`, { id: 'picks-toast' });
        setShowPicksBuilder(false);
      }
    } catch {
      toast.error('Failed to get vendor recommendations.', { id: 'picks-toast' });
    } finally {
      setPicksLoading(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const data = {
        category: itemForm.category,
        notes: itemForm.notes,
        allocatedAmount: Number(itemForm.allocatedAmount),
        spentAmount: Number(itemForm.spentAmount) || 0,
      };
      if (itemForm.weddingEvent) data.weddingEvent = itemForm.weddingEvent;
      if (editingItem) {
        await budgetAPI.updateItem(editingItem._id, data);
        toast.success('Item updated');
      } else {
        await budgetAPI.addItem(data);
        toast.success('Item added');
      }
      closeModal();
      fetchBudget();
    } catch {
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      await budgetAPI.deleteItem(deleteTarget._id);
      toast.success('Item deleted');
      setDeleteTarget(null);
      fetchBudget();
    } catch {
      toast.error('Failed to delete item');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({ category: item.category, notes: item.notes || '', allocatedAmount: item.allocatedAmount, spentAmount: item.spentAmount || '', weddingEvent: item.weddingEvent || '' });
    } else {
      setEditingItem(null);
      setItemForm({ category: '', notes: '', allocatedAmount: '', spentAmount: '', weddingEvent: activeEventId || '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingItem(null); };

  /* ── Loading ── */
  if (loading && !budget) {
    return (
      <div className="bp-loading">
        <div className="bp-loading-spinner" />
        <span>Loading your budget...</span>
      </div>
    );
  }

  /* ── Create Budget ── */
  if (!budget && !loading) {
    return (
      <div className="bp-setup-wrap">
        <div className="bp-setup-card">
          <div className="bp-setup-icon"><Wallet size={36} /></div>
          <h2 className="bp-setup-title">Set Your Wedding Budget</h2>
          <p className="bp-setup-sub">Enter your total budget to start planning and tracking expenses.</p>
          <form onSubmit={handleCreateBudget} className="bp-setup-form">
            <div className="bp-form-group">
              <label className="bp-label">Total Budget (PKR)</label>
              <input
                type="number"
                className="bp-input bp-input--lg"
                placeholder="e.g. 2500000"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
              />
            </div>
            <button type="submit" className="bp-btn bp-btn--primary bp-btn--full">
              <Plus size={18} /> Start Planning
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Totals ── */
  const allItems = budget?.items || [];
  const filteredItems = activeEventId
    ? allItems.filter(i => i.weddingEvent?.toString() === activeEventId)
    : allItems;

  // Get the active event's AI plan, or the master AI plan
  const activeAiPlan = activeEventId
    ? budget?.events?.find(e => e.weddingEvent?.toString() === activeEventId)?.aiPlan
    : budget?.aiPlan;

  const totalAllocated = filteredItems.reduce((s, i) => s + (i.allocatedAmount || 0), 0);
  const totalSpent     = filteredItems.reduce((s, i) => s + (i.spentAmount || 0), 0);
  const activeEventEntry = activeEventId
    ? budget?.events?.find(e => e.weddingEvent?.toString() === activeEventId)
    : null;
  const activeBudgetTotal = activeEventId
    ? (activeEventEntry?.allocatedAmount ?? budget?.totalBudget ?? 0)
    : (budget?.totalBudget ?? 0);
  const remaining      = activeBudgetTotal - totalSpent;
  const spentPct       = activeBudgetTotal ? Math.min(100, (totalSpent / activeBudgetTotal) * 100) : 0;
  const allocPct       = activeBudgetTotal ? Math.min(100, (totalAllocated / activeBudgetTotal) * 100) : 0;
  const isOver         = remaining < 0;
  const isWarning      = !isOver && spentPct >= 80;
  const showEventTabs  = events.length > 1;

  return (
    <div className="bp-page">

      {/* ── Hero ── */}
      <div className="bp-hero">
        <div className="bp-hero-glow" />
        <div className="bp-hero-content">
          <div className="bp-hero-icon"><BarChart3 size={28} /></div>
          <div>
            <h1 className="bp-hero-title">Budget Planner</h1>
            <p className="bp-hero-sub">{filteredItems.length} expense categories tracked</p>
          </div>
        </div>
        <div className="bp-hero-actions">
          <button className="bp-btn bp-btn--ai" onClick={handleGenerateAI} disabled={aiLoading}>
            {aiLoading ? <Sparkles size={16} className="bp-spin" /> : <Brain size={16} />}
            {aiLoading ? 'Generating...' : 'AI Plan'}
          </button>
          <button
            className={`bp-btn bp-btn--picks ${showPicksBuilder ? 'bp-btn--picks--active' : ''}`}
            onClick={() => setShowPicksBuilder(b => !b)}
          >
            <Store size={16} /> Vendor Picks
          </button>
          <button className="bp-btn bp-btn--events" onClick={() => setShowEventManager(true)}>
            <CalendarPlus size={16} /> {events.length > 0 ? 'Events' : 'Add Events'}
          </button>
          <button className="bp-btn bp-btn--add" onClick={() => openModal()}>
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* ── Event Tabs (only with 2+ events) ── */}
      {showEventTabs && (
        <div className="bp-event-tabs">
          <button
            className={`bp-event-tab ${!activeEventId ? 'bp-event-tab--active' : ''}`}
            onClick={() => setActiveEventId(null)}
          >
            All Events
          </button>
          {events.map(evt => (
            <button
              key={evt._id}
              className={`bp-event-tab ${activeEventId === evt._id ? 'bp-event-tab--active' : ''}`}
              style={{
                '--evt-color': evt.color || EVENT_COLORS[evt.eventType] || '#64748b',
              }}
              onClick={() => setActiveEventId(evt._id)}
            >
              <span
                className="bp-event-tab-dot"
                style={{ background: evt.color || EVENT_COLORS[evt.eventType] || '#64748b' }}
              />
              {evt.title || EVENT_LABELS[evt.eventType] || evt.eventType}
            </button>
          ))}
          <button
            className="bp-event-tab bp-event-tab--add"
            onClick={() => setShowEventManager(true)}
            title="Manage events"
          >
            <Settings2 size={14} />
          </button>
        </div>
      )}

      {/* ── Stat Tiles ── */}
      <div className="bp-stats">
        <div className="bp-stat bp-stat--rose">
          <div className="bp-stat-icon"><Wallet size={20} /></div>
          <div className="bp-stat-body">
            <span className="bp-stat-label">Total Budget</span>
            <span className="bp-stat-value">{fmtCurrency(activeBudgetTotal)}</span>
          </div>
          <button
            className="bp-stat-edit"
            title="Edit total budget"
            onClick={() => { setEditBudgetAmount(String(budget?.totalBudget || '')); setEditBudgetOpen(true); }}
          >
            <Edit2 size={14} />
          </button>
        </div>
        <div className="bp-stat bp-stat--violet">
          <div className="bp-stat-icon"><Target size={20} /></div>
          <div className="bp-stat-body">
            <span className="bp-stat-label">Estimated Cost</span>
            <span className="bp-stat-value">{fmtCurrency(totalAllocated)}</span>
          </div>
        </div>
        <div className="bp-stat bp-stat--amber">
          <div className="bp-stat-icon"><TrendingDown size={20} /></div>
          <div className="bp-stat-body">
            <span className="bp-stat-label">Actual Spent</span>
            <span className="bp-stat-value">{fmtCurrency(totalSpent)}</span>
          </div>
        </div>
        <div className={`bp-stat ${isOver ? 'bp-stat--red' : isWarning ? 'bp-stat--amber' : 'bp-stat--green'}`}>
          <div className="bp-stat-icon">
            {isOver ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
          </div>
          <div className="bp-stat-body">
            <span className="bp-stat-label">Remaining</span>
            <span className="bp-stat-value">{fmtCurrency(remaining)}</span>
          </div>
        </div>
      </div>

      {/* ── Overall Progress ── */}
      <div className="bp-progress-card">
        <div className="bp-card-stripe" />
        <div className="bp-progress-head">
          <span className="bp-progress-title">Budget Overview</span>
          <span className={`bp-progress-pct ${isOver ? 'bp-progress-pct--over' : ''}`}>{spentPct.toFixed(1)}% spent</span>
        </div>
        <div className="bp-progress-track">
          <div
            className={`bp-progress-fill ${isOver ? 'bp-progress-fill--over' : isWarning ? 'bp-progress-fill--warn' : ''}`}
            style={{ width: `${spentPct}%` }}
          />
          <div className="bp-progress-alloc" style={{ width: `${allocPct}%` }} />
        </div>
        <div className="bp-progress-legend">
          <span className="bp-legend-dot bp-legend-dot--spent" /> Spent &nbsp;
          <span className="bp-legend-dot bp-legend-dot--alloc" /> Estimated
        </div>
        {isOver && (
          <div className="bp-alert bp-alert--over">
            <AlertTriangle size={15} /> You have exceeded your budget by {fmtCurrency(Math.abs(remaining))}
          </div>
        )}
        {isWarning && !isOver && (
          <div className="bp-alert bp-alert--warn">
            <AlertTriangle size={15} /> {spentPct.toFixed(0)}% of your budget has been spent — review your expenses.
          </div>
        )}
      </div>

      {/* ── Vendor Picks Builder ── */}
      {showPicksBuilder && (
        <div className="bp-picks-builder">
          <div className="bp-card-stripe" />
          <div className="bp-picks-builder-head">
            <div className="bp-picks-builder-title-row">
              <Store size={20} className="bp-picks-builder-icon" />
              <div>
                <h2 className="bp-picks-builder-title">AI Vendor Picks</h2>
                <p className="bp-picks-builder-sub">Select categories and allocate budget percentages. AI will find the best vendor for each.</p>
              </div>
            </div>
            <button className="bp-modal-close" onClick={() => setShowPicksBuilder(false)}><X size={18} /></button>
          </div>

          <div className="bp-cat-toggle-grid">
            {PICKS_CATS.map(cat => {
              const selected = picksCategories.some(c => c.name === cat.name);
              return (
                <button
                  key={cat.name}
                  className={`bp-cat-toggle ${selected ? 'bp-cat-toggle--sel' : ''}`}
                  onClick={() => togglePicksCat(cat.name)}
                >
                  <span className="bp-cat-toggle-emoji">{cat.emoji}</span>
                  {cat.name}
                </button>
              );
            })}
          </div>

          {picksCategories.length > 0 && (
            <div className="bp-pct-rows">
              {picksCategories.map(cat => (
                <div key={cat.name} className="bp-pct-row">
                  <span className="bp-pct-label">
                    {PICKS_CATS.find(c => c.name === cat.name)?.emoji} {cat.name}
                  </span>
                  <div className="bp-pct-input-wrap">
                    <input
                      type="number"
                      className="bp-pct-input"
                      placeholder="0"
                      min="1"
                      max="100"
                      value={cat.percentage}
                      onChange={e => updatePicksPct(cat.name, e.target.value)}
                    />
                    <span className="bp-pct-symbol">%</span>
                  </div>
                </div>
              ))}
              <div className={`bp-pct-sum ${picksTotal > 100 ? 'bp-pct-sum--err' : picksTotal > 0 ? 'bp-pct-sum--ok' : ''}`}>
                Allocated: {picksTotal}%
                {picksTotal > 100
                  ? ' — exceeds 100%, please reduce'
                  : picksTotal > 0 && picksTotal < 100
                  ? ` — ${100 - picksTotal}% of budget left unallocated`
                  : picksTotal === 100
                  ? ' — full budget allocated'
                  : ''}
              </div>
              <button
                className="bp-btn bp-btn--primary bp-btn--full"
                onClick={handleGetVendorPicks}
                disabled={!picksValid || picksLoading}
              >
                {picksLoading ? <Sparkles size={16} className="bp-spin" /> : <ArrowUpRight size={16} />}
                {picksLoading ? 'Finding vendors...' : 'Find Best Vendors →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Vendor Picks Results ── */}
      {vendorPicks.length > 0 && (
        <div className="bp-picks-results">
          <div className="bp-picks-results-head">
            <Store size={20} className="bp-picks-builder-icon" />
            <div>
              <h2 className="bp-picks-results-title">Your Vendor Picks</h2>
              <p className="bp-picks-results-sub">AI-matched vendors based on your preferences and budget.</p>
            </div>
            <button
              className="bp-picks-change-btn"
              onClick={() => {
                setVendorPicks([]);
                sessionStorage.removeItem('vidai_vendor_picks');
                setShowPicksBuilder(true);
              }}
              title="Change percentages and get new picks"
            >
              <Edit2 size={14} /> Change Picks
            </button>
          </div>
          <div className="bp-picks-grid">
            {vendorPicks.map((pick, i) => (
              <div key={i} className="bp-pick-card">
                <div className="bp-pick-card-stripe" />
                {pick.vendor.coverImage ? (
                  <img className="bp-pick-cover" src={pick.vendor.coverImage} alt={pick.vendor.businessName} />
                ) : (
                  <div className="bp-pick-cover-placeholder">
                    <Store size={32} />
                  </div>
                )}
                <div className="bp-pick-body">
                  <div className="bp-pick-cat-row">
                    <span className="bp-pick-cat-badge">
                      {PICKS_CATS.find(c => c.name === pick.category)?.emoji} {pick.category}
                    </span>
                    <span className="bp-pick-pct">{pick.percentage}%</span>
                  </div>
                  <h3 className="bp-pick-name">{pick.vendor.businessName}</h3>
                  <div className="bp-pick-meta">
                    {pick.vendor.city && (
                      <span className="bp-pick-city"><MapPin size={13} /> {pick.vendor.city}</span>
                    )}
                    {pick.vendor.ratingsAverage > 0 && (
                      <span className="bp-pick-rating"><Star size={13} /> {pick.vendor.ratingsAverage.toFixed(1)}</span>
                    )}
                  </div>
                  <div className="bp-pick-budget">
                    <span className="bp-pick-budget-label">Your budget</span>
                    <span className="bp-pick-budget-val">{fmtCurrency(pick.budgetAmount)}</span>
                  </div>
                  {pick.vendor.startingPrice > 0 && (
                    <div className="bp-pick-starting">Starting from {fmtCurrency(pick.vendor.startingPrice)}</div>
                  )}
                  {pick.reasoning && <p className="bp-pick-reason">{pick.reasoning}</p>}
                  <button
                    className="bp-pick-view-btn"
                    onClick={() => navigate(`/user/vendors/${pick.vendor.slug}`)}
                  >
                    View Vendor <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Plan ── */}
      {activeAiPlan?.allocations?.length > 0 && showAiPlan && (
        <div className="bp-ai-card">
          <div className="bp-ai-stripe" />
          <div className="bp-ai-head">
            <Brain size={22} className="bp-ai-brain" />
            <div style={{ flex: 1 }}>
              <h2 className="bp-ai-title">AI Budget Recommendations</h2>
              {activeAiPlan.summary && <p className="bp-ai-summary">{activeAiPlan.summary}</p>}
            </div>
            <button className="bp-ai-close" onClick={() => setShowAiPlan(false)} title="Dismiss"><X size={16} /></button>
          </div>
          <div className="bp-ai-grid">
            {activeAiPlan.allocations.map((a, i) => (
              <div key={i} className="bp-ai-alloc">
                <div className="bp-ai-alloc-cat">{a.category.replace(/_/g, ' ')}</div>
                <div className="bp-ai-alloc-amt">{fmtCurrency(a.amount)}</div>
                <div className="bp-ai-alloc-pct">{a.percentage}%</div>
                {a.explanation && <div className="bp-ai-alloc-note">{a.explanation}</div>}
              </div>
            ))}
          </div>
          {activeAiPlan.tips?.length > 0 && (
            <div className="bp-ai-tips">
              <div className="bp-ai-tips-head">
                <CheckCircle2 size={16} /> Pro Tips
              </div>
              <ul className="bp-ai-tips-list">
                {activeAiPlan.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Budget Items ── */}
      <div className="bp-booked-section">
        <div className="bp-booked-head">
          <h2 className="bp-booked-title">Budget Items</h2>
          <div className="bp-booked-head-right">
            {filteredItems.length > 0 && (
              <span className="bp-booked-count">{filteredItems.length}</span>
            )}
            <button className="bp-btn bp-btn--add bp-btn--sm" onClick={() => openModal()}>
              <Plus size={14} /> Add Item
            </button>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="bp-booked-list">
            {filteredItems.map((item) => {
              const color = catColor(item.category);
              const overItem = (item.spentAmount || 0) > (item.allocatedAmount || 0);
              return (
                <div key={item._id} className="bp-booked-item" style={{ borderLeftColor: color }}>
                  <div className="bp-booked-avatar" style={{ background: color }}>
                    {catInitial(item.category)}
                  </div>
                  <div className="bp-booked-info">
                    <span className="bp-booked-cat">{item.category}</span>
                    {item.notes && <span className="bp-booked-note">{item.notes}</span>}
                    <div className="bp-booked-amounts">
                      <span className="bp-booked-est">{fmtCurrency(item.allocatedAmount)}</span>
                      <span className="bp-booked-arrow">&rarr;</span>
                      <span className={`bp-booked-spent ${overItem ? 'bp-booked-spent--over' : ''}`}>
                        {fmtCurrency(item.spentAmount || 0)} spent
                      </span>
                    </div>
                  </div>
                  <div className="bp-booked-btns">
                    <button className="bp-icon-btn bp-icon-btn--edit" onClick={() => openModal(item)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="bp-icon-btn bp-icon-btn--del" onClick={() => setDeleteTarget(item)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bp-booked-empty">
            <Wallet size={32} className="bp-booked-empty-icon" />
            <p>No items yet. Add your first budget item or generate an AI plan.</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {isModalOpen && (
        <ItemModal
          editingItem={editingItem}
          itemForm={itemForm}
          setItemForm={setItemForm}
          onSave={handleSaveItem}
          onClose={closeModal}
          events={events}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          itemName={deleteTarget.category}
          onConfirm={handleDeleteItem}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      {editBudgetOpen && (
        <EditBudgetModal
          amount={editBudgetAmount}
          setAmount={setEditBudgetAmount}
          onSave={handleUpdateBudget}
          onClose={() => { setEditBudgetOpen(false); setEditBudgetAmount(''); }}
        />
      )}
      {showEventManager && (
        <EventManagerModal
          events={events}
          totalBudget={budget?.totalBudget || 0}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
          onSaveAllocations={handleSaveAllocations}
          onClose={() => setShowEventManager(false)}
          saving={eventSaving}
        />
      )}
    </div>
  );
};

export default BudgetPlanner;
