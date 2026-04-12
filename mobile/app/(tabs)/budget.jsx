import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { budgetAPI } from '../../api/budget.js';
import { eventAPI } from '../../api/events.js';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import ProtectedRoute from '../../components/ProtectedRoute';

// -- constants --

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

const PICKS_CATS = [
  { name: 'Venue',         emoji: 'business-outline' },
  { name: 'Catering',      emoji: 'restaurant-outline' },
  { name: 'Photography',   emoji: 'camera-outline' },
  { name: 'Makeup/Mehndi', emoji: 'color-palette-outline' },
  { name: 'Decoration',    emoji: 'flower-outline' },
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

const ALL_EVENT_TYPES = [
  { type: 'dholki',     label: 'Dholki',      emoji: '🥁' },
  { type: 'mayun',      label: 'Mayun',       emoji: '🌼' },
  { type: 'mehndi',     label: 'Mehndi',      emoji: '🌿' },
  { type: 'nikkah',     label: 'Nikkah',      emoji: '💍' },
  { type: 'baraat',     label: 'Baraat',      emoji: '🐴' },
  { type: 'walima',     label: 'Walima',      emoji: '🍽️' },
  { type: 'engagement', label: 'Engagement',  emoji: '💎' },
  { type: 'other',      label: 'Other',       emoji: '✨' },
];

// -- helpers --

function catColor(cat) {
  const key = (cat || '').toLowerCase().split(' ')[0];
  return CATEGORY_COLOR[key] || CATEGORY_COLOR.default;
}

function catInitial(cat) {
  return (cat || '?').charAt(0).toUpperCase();
}

const fmtCurrency = (n) =>
  new Intl.NumberFormat('en-PK', {
    style: 'currency', currency: 'PKR', maximumFractionDigits: 0,
  }).format(n || 0);

// -- EventAllocEditor sub-component (used inside event manager modal) --

function EventAllocEditor({ events, budget, onSave, onDelete, saving }) {
  const totalBudget = budget?.totalBudget || 0;
  const [allocations, setAllocations] = useState(() =>
    events.map(evt => ({
      eventId: evt._id,
      eventType: evt.eventType,
      title: evt.title || EVENT_LABELS[evt.eventType] || evt.eventType,
      color: evt.color || EVENT_COLORS[evt.eventType] || '#64748b',
      allocatedAmount: budget?.events?.find(e => e.weddingEvent?.toString() === evt._id)?.allocatedAmount || 0,
    }))
  );

  useEffect(() => {
    setAllocations(events.map(evt => ({
      eventId: evt._id,
      eventType: evt.eventType,
      title: evt.title || EVENT_LABELS[evt.eventType] || evt.eventType,
      color: evt.color || EVENT_COLORS[evt.eventType] || '#64748b',
      allocatedAmount: budget?.events?.find(e => e.weddingEvent?.toString() === evt._id)?.allocatedAmount || 0,
    })));
  }, [events, budget]);

  const totalAlloc = allocations.reduce((s, a) => s + (Number(a.allocatedAmount) || 0), 0);
  const unallocated = totalBudget - totalAlloc;

  return (
    <View style={styles.emAllocWrap}>
      {allocations.map(alloc => (
        <View key={alloc.eventId} style={styles.emAllocRow}>
          <View style={[styles.emAllocDot, { backgroundColor: alloc.color }]} />
          <Text style={styles.emAllocName}>{alloc.title}</Text>
          <View style={styles.emAllocInputWrap}>
            <Text style={styles.emAllocCurrency}>PKR</Text>
            <TextInput
              style={styles.emAllocInput}
              keyboardType="numeric"
              value={alloc.allocatedAmount ? String(alloc.allocatedAmount) : ''}
              onChangeText={v => {
                setAllocations(prev =>
                  prev.map(a => a.eventId === alloc.eventId ? { ...a, allocatedAmount: v.replace(/[^0-9]/g, '') } : a)
                );
              }}
              placeholder="0"
              placeholderTextColor="#cbd5e1"
            />
          </View>
          <TouchableOpacity
            style={styles.emAllocDelBtn}
            onPress={() => onDelete(alloc.eventId)}
            disabled={saving}
          >
            <Ionicons name="trash-outline" size={14} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ))}

      {/* summary */}
      <View style={styles.emSummary}>
        <View style={styles.emSummaryRow}>
          <Text style={styles.emSummaryLabel}>Total Budget</Text>
          <Text style={styles.emSummaryVal}>{fmtCurrency(totalBudget)}</Text>
        </View>
        <View style={styles.emSummaryRow}>
          <Text style={styles.emSummaryLabel}>Allocated</Text>
          <Text style={styles.emSummaryVal}>{fmtCurrency(totalAlloc)}</Text>
        </View>
        <View style={[styles.emSummaryRow, unallocated < 0 && styles.emSummaryRowOver]}>
          <Text style={[styles.emSummaryLabel, unallocated < 0 && { color: '#ef4444' }]}>
            {unallocated < 0 ? 'Over by' : 'Unallocated'}
          </Text>
          <Text style={[styles.emSummaryVal, unallocated < 0 && { color: '#ef4444' }]}>
            {fmtCurrency(Math.abs(unallocated))}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.emSaveBtn, saving && styles.btnDisabled]}
        onPress={() => onSave(allocations.map(a => ({
          eventId: a.eventId,
          allocatedAmount: Number(a.allocatedAmount) || 0,
        })))}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size={14} color="#fff" />
        ) : (
          <Ionicons name="save-outline" size={14} color="#fff" />
        )}
        <Text style={styles.emSaveBtnText}>{saving ? 'Saving...' : 'Save Allocations'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// -- component --

export default function Budget() {
  const router = useRouter();

  // data
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // actions
  const [aiLoading, setAiLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // create budget modal
  const [createVisible, setCreateVisible] = useState(false);
  const [createAmount, setCreateAmount] = useState('');

  // add/edit item modal
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({ category: '', notes: '', allocatedAmount: '', spentAmount: '' });

  // AI plan visibility
  const [showAiPlan, setShowAiPlan] = useState(true);

  // events
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState(null);

  // event manager
  const [showEventManager, setShowEventManager] = useState(false);
  const [eventSaving, setEventSaving] = useState(false);
  const [editBudgetVisible, setEditBudgetVisible] = useState(false);
  const [editBudgetAmount, setEditBudgetAmount] = useState('');

  // vendor picks
  const [showPicksBuilder, setShowPicksBuilder] = useState(false);
  const [picksCategories, setPicksCategories] = useState([]);
  const [vendorPicks, setVendorPicks] = useState([]);
  const [picksLoading, setPicksLoading] = useState(false);

  useEffect(() => { fetchBudget(); fetchEvents(); }, []);

  const fetchEvents = async () => {
    try {
      const res = await eventAPI.getAll();
      setEvents(res.data?.data?.events || []);
    } catch {
      // Events are optional
    }
  };

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await budgetAPI.getMine();
      setBudget(response.data?.data?.budget || response.data?.budget || null);
    } catch (err) {
      if (err.response?.status !== 404) Toast.show({ type: 'error', text1: 'Failed to load budget' });
      setBudget(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBudget(); };

  const handleCreateBudget = async () => {
    if (!createAmount || isNaN(createAmount) || Number(createAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return;
    }
    try {
      await budgetAPI.create({ totalBudget: Number(createAmount) });
      Toast.show({ type: 'success', text1: 'Budget created!' });
      setCreateVisible(false);
      setCreateAmount('');
      fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to create budget' });
    }
  };

  const handleUpdateBudget = async () => {
    if (!editBudgetAmount || isNaN(editBudgetAmount) || Number(editBudgetAmount) <= 0) {
      Toast.show({ type: 'error', text1: 'Please enter a valid amount' });
      return;
    }
    try {
      await budgetAPI.create({ totalBudget: Number(editBudgetAmount) });
      Toast.show({ type: 'success', text1: 'Budget updated!' });
      setEditBudgetVisible(false);
      setEditBudgetAmount('');
      fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update budget' });
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      Toast.show({ type: 'info', text1: 'Generating AI budget plan...' });
      await budgetAPI.generateAIPlan(activeEventId);
      setShowAiPlan(true);
      Toast.show({ type: 'success', text1: 'AI Plan generated!' });
      fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to generate AI plan' });
    } finally {
      setAiLoading(false);
    }
  };

  const openItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        category: item.category || '',
        notes: item.notes || '',
        allocatedAmount: item.allocatedAmount?.toString() || '',
        spentAmount: item.spentAmount?.toString() || '',
        weddingEvent: item.weddingEvent || '',
      });
    } else {
      setEditingItem(null);
      setItemForm({ category: '', notes: '', allocatedAmount: '', spentAmount: '', weddingEvent: activeEventId || '' });
    }
    setItemModalVisible(true);
  };

  const closeItemModal = () => {
    setItemModalVisible(false);
    setEditingItem(null);
    setItemForm({ category: '', notes: '', allocatedAmount: '', spentAmount: '' });
  };

  const handleSaveItem = async () => {
    if (!itemForm.category.trim() || !itemForm.allocatedAmount) {
      Toast.show({ type: 'error', text1: 'Category and estimated amount are required' });
      return;
    }
    try {
      const data = {
        category: itemForm.category.trim(),
        notes: itemForm.notes.trim(),
        allocatedAmount: Number(itemForm.allocatedAmount),
        spentAmount: Number(itemForm.spentAmount) || 0,
      };
      if (itemForm.weddingEvent) data.weddingEvent = itemForm.weddingEvent;
      if (editingItem) {
        await budgetAPI.updateItem(editingItem._id, data);
        Toast.show({ type: 'success', text1: 'Item updated!' });
      } else {
        await budgetAPI.addItem(data);
        Toast.show({ type: 'success', text1: 'Item added!' });
      }
      closeItemModal();
      fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save item' });
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    try {
      await budgetAPI.deleteItem(deleteTarget._id);
      Toast.show({ type: 'success', text1: 'Item deleted' });
      setDeleteTarget(null);
      fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete item' });
    }
  };

  // vendor picks helpers
  const togglePicksCat = (name) => {
    setPicksCategories(prev => {
      const exists = prev.find(c => c.name === name);
      return exists ? prev.filter(c => c.name !== name) : [...prev, { name, percentage: '' }];
    });
  };

  const updatePicksPct = (name, value) => {
    setPicksCategories(prev => prev.map(c => c.name === name ? { ...c, percentage: value } : c));
  };

  const picksTotal = picksCategories.reduce((s, c) => s + (Number(c.percentage) || 0), 0);
  const picksValid = picksCategories.length > 0
    && picksTotal > 0
    && picksTotal <= 100
    && picksCategories.every(c => Number(c.percentage) > 0);

  const handleGetVendorPicks = async () => {
    if (!picksValid) {
      Toast.show({ type: 'error', text1: 'Each category needs a % > 0, total cannot exceed 100' });
      return;
    }
    try {
      setPicksLoading(true);
      Toast.show({ type: 'info', text1: 'Finding best vendors...' });
      const res = await budgetAPI.recommendVendors(
        picksCategories.map(c => ({ name: c.name, percentage: Number(c.percentage) })),
        activeEventId
      );
      const picks = res.data?.data?.picks || [];
      setVendorPicks(picks);
      if (picks.length === 0) {
        Toast.show({ type: 'error', text1: 'No vendors found for these categories' });
      } else {
        Toast.show({ type: 'success', text1: `Found ${picks.length} vendor recommendation(s)!` });
        setShowPicksBuilder(false);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to get vendor recommendations' });
    } finally {
      setPicksLoading(false);
    }
  };

  // event manager handlers
  const handleAddEvent = async (eventType) => {
    try {
      setEventSaving(true);
      await eventAPI.create({ eventType, title: EVENT_LABELS[eventType] || eventType });
      Toast.show({ type: 'success', text1: `${EVENT_LABELS[eventType] || eventType} added!` });
      await fetchEvents();
      await fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to add event' });
    } finally {
      setEventSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      setEventSaving(true);
      await eventAPI.delete(eventId);
      if (activeEventId === eventId) setActiveEventId(null);
      Toast.show({ type: 'success', text1: 'Event removed' });
      await fetchEvents();
      await fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to delete event' });
    } finally {
      setEventSaving(false);
    }
  };

  const handleSaveAllocations = async (allocations) => {
    try {
      setEventSaving(true);
      await eventAPI.updateAllocations(allocations);
      Toast.show({ type: 'success', text1: 'Allocations saved!' });
      await fetchBudget();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to save allocations' });
    } finally {
      setEventSaving(false);
    }
  };

  // -- derived values --
  const allItems = budget?.items || [];
  const filteredItems = activeEventId
    ? allItems.filter(i => i.weddingEvent?.toString() === activeEventId)
    : allItems;

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

  if (loading) return <Loading fullScreen message="Loading budget..." />;

  // -- setup screen --
  if (!budget) {
    return (
      <ProtectedRoute roles="user">
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.setupWrap}>
            <View style={styles.setupCard}>
              <View style={styles.setupIconWrap}>
                <Ionicons name="wallet" size={36} color={theme.colors.primary} />
              </View>
              <Text style={styles.setupTitle}>Set Your Wedding Budget</Text>
              <Text style={styles.setupSub}>
                Enter your total budget to start planning and tracking expenses.
              </Text>
              <Text style={styles.inputLabel}>Total Budget (PKR)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2,500,000"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="numeric"
                value={createAmount}
                onChangeText={setCreateAmount}
              />
              <TouchableOpacity style={styles.setupBtn} onPress={handleCreateBudget}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.setupBtnText}>Start Planning</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </ProtectedRoute>
    );
  }

  // -- main screen --
  return (
    <ProtectedRoute roles="user">
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          {/* hero */}
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="bar-chart" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={styles.heroTitle}>Budget Planner</Text>
                <Text style={styles.heroSub}>{filteredItems.length} expense categories tracked</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={[styles.heroBtnAI, aiLoading && styles.btnDisabled]}
                onPress={handleGenerateAI}
                disabled={aiLoading}
              >
                {aiLoading
                  ? <ActivityIndicator size={13} color="#fff" />
                  : <Ionicons name="sparkles" size={13} color="#fff" />}
                <Text style={styles.heroBtnAIText}>{aiLoading ? 'Generating...' : 'AI Plan'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroBtnPicks, showPicksBuilder && styles.heroBtnPicksActive]}
                onPress={() => setShowPicksBuilder(b => !b)}
              >
                <Ionicons name="storefront-outline" size={13} color={showPicksBuilder ? '#fff' : theme.colors.primary} />
                <Text style={[styles.heroBtnPicksText, showPicksBuilder && { color: '#fff' }]}>Picks</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroBtnAdd} onPress={() => openItemModal()}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.heroBtnAddText}>Add Item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroBtnEvents}
                onPress={() => setShowEventManager(true)}
              >
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={styles.heroBtnEventsText}>Events</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* event tabs (only with 2+ events) */}
          {showEventTabs && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.eventTabsContent}
              style={styles.eventTabsWrap}
            >
              <TouchableOpacity
                style={[styles.eventTab, !activeEventId && styles.eventTabActive]}
                onPress={() => setActiveEventId(null)}
              >
                <Text style={[styles.eventTabText, !activeEventId && styles.eventTabTextActive]}>
                  All Events
                </Text>
              </TouchableOpacity>
              {events.map(evt => {
                const evtColor = evt.color || EVENT_COLORS[evt.eventType] || '#64748b';
                const isActive = activeEventId === evt._id;
                return (
                  <TouchableOpacity
                    key={evt._id}
                    style={[
                      styles.eventTab,
                      isActive && [styles.eventTabActive, { borderBottomColor: evtColor }],
                    ]}
                    onPress={() => setActiveEventId(evt._id)}
                  >
                    <View style={[styles.eventTabDot, { backgroundColor: evtColor }]} />
                    <Text style={[styles.eventTabText, isActive && { color: evtColor, fontWeight: '700' }]}>
                      {evt.title || EVENT_LABELS[evt.eventType] || evt.eventType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.eventTabGear}
                onPress={() => setShowEventManager(true)}
              >
                <Ionicons name="settings-outline" size={16} color="#94a3b8" />
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* 4 stat tiles */}
          <View style={styles.statsGrid}>
            <View style={[styles.statTile, styles.statTileRose]}>
              <Ionicons name="wallet-outline" size={18} color="#D7385E" />
              <Text style={styles.statLabel}>Total Budget</Text>
              <Text style={[styles.statValue, { color: '#D7385E' }]}>{fmtCurrency(activeBudgetTotal)}</Text>
              <TouchableOpacity
                style={styles.statEditBtn}
                onPress={() => { setEditBudgetAmount(String(budget?.totalBudget || '')); setEditBudgetVisible(true); }}
              >
                <Ionicons name="pencil-outline" size={13} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <View style={[styles.statTile, styles.statTileViolet]}>
              <Ionicons name="flag-outline" size={18} color="#7c3aed" />
              <Text style={styles.statLabel}>Estimated</Text>
              <Text style={[styles.statValue, { color: '#7c3aed' }]}>{fmtCurrency(totalAllocated)}</Text>
            </View>
            <View style={[styles.statTile, styles.statTileAmber]}>
              <Ionicons name="trending-down-outline" size={18} color="#d97706" />
              <Text style={styles.statLabel}>Actual Spent</Text>
              <Text style={[styles.statValue, { color: '#d97706' }]}>{fmtCurrency(totalSpent)}</Text>
            </View>
            <View style={[styles.statTile, isOver ? styles.statTileRed : isWarning ? styles.statTileAmber : styles.statTileGreen]}>
              <Ionicons name={isOver ? 'trending-down-outline' : 'trending-up-outline'} size={18} color={isOver ? '#dc2626' : isWarning ? '#d97706' : '#059669'} />
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: isOver ? '#dc2626' : isWarning ? '#d97706' : '#059669' }]}>
                {fmtCurrency(remaining)}
              </Text>
            </View>
          </View>

          {/* progress card */}
          <View style={styles.progressCard}>
            <View style={styles.progressCardStripe} />
            <View style={styles.progressHead}>
              <Text style={styles.progressTitle}>Budget Overview</Text>
              <Text style={[styles.progressPct, isOver && styles.progressPctOver]}>
                {spentPct.toFixed(1)}% spent
              </Text>
            </View>
            {/* dual-layer progress bar */}
            <View style={styles.progressTrack}>
              {/* allocated (lighter, behind) */}
              <View style={[styles.progressAllocFill, { width: `${allocPct}%` }]} />
              {/* spent (on top) */}
              <View style={[
                styles.progressSpentFill,
                { width: `${spentPct}%` },
                isOver && styles.progressSpentFillOver,
                isWarning && styles.progressSpentFillWarn,
              ]} />
            </View>
            <View style={styles.progressLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.legendText}>Spent</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#c4b5fd' }]} />
                <Text style={styles.legendText}>Estimated</Text>
              </View>
            </View>
            {isOver && (
              <View style={styles.alertOver}>
                <Ionicons name="warning" size={14} color="#dc2626" />
                <Text style={styles.alertOverText}>
                  Exceeded budget by {fmtCurrency(Math.abs(remaining))}
                </Text>
              </View>
            )}
            {isWarning && !isOver && (
              <View style={styles.alertWarn}>
                <Ionicons name="warning" size={14} color="#d97706" />
                <Text style={styles.alertWarnText}>
                  {spentPct.toFixed(0)}% of your budget has been spent — review your expenses.
                </Text>
              </View>
            )}
          </View>

          {/* vendor picks builder */}
          {showPicksBuilder && (
            <View style={styles.picksBuilder}>
              <View style={styles.picksBuilderStripe} />
              <View style={styles.picksBuilderHead}>
                <View style={styles.picksBuilderTitleRow}>
                  <Ionicons name="storefront" size={18} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.picksBuilderTitle}>AI Vendor Picks</Text>
                    <Text style={styles.picksBuilderSub}>
                      Select categories and allocate % of your budget. AI finds the best match.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowPicksBuilder(false)}>
                  <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* category toggles */}
              <View style={styles.catToggleGrid}>
                {PICKS_CATS.map(cat => {
                  const sel = picksCategories.some(c => c.name === cat.name);
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.catToggle, sel && styles.catToggleSel]}
                      onPress={() => togglePicksCat(cat.name)}
                    >
                      <Ionicons name={cat.emoji} size={14} color={sel ? '#fff' : theme.colors.text} />
                      <Text style={[styles.catToggleText, sel && styles.catToggleTextSel]}>{cat.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* percentage inputs */}
              {picksCategories.length > 0 && (
                <View style={styles.pctRows}>
                  {picksCategories.map(cat => (
                    <View key={cat.name} style={styles.pctRow}>
                      <Text style={styles.pctLabel}>
                        {PICKS_CATS.find(c => c.name === cat.name)?.emoji
                          ? '' : ''}{cat.name}
                      </Text>
                      <View style={styles.pctInputWrap}>
                        <TextInput
                          style={styles.pctInput}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={theme.colors.textSecondary}
                          value={cat.percentage}
                          onChangeText={v => updatePicksPct(cat.name, v)}
                          maxLength={3}
                        />
                        <Text style={styles.pctSymbol}>%</Text>
                      </View>
                    </View>
                  ))}
                  <Text style={[
                    styles.pctSum,
                    picksTotal > 100 ? styles.pctSumErr : picksTotal > 0 ? styles.pctSumOk : {},
                  ]}>
                    Allocated: {picksTotal}%
                    {picksTotal > 100
                      ? ' — exceeds 100%, please reduce'
                      : picksTotal > 0 && picksTotal < 100
                      ? ` — ${100 - picksTotal}% left`
                      : picksTotal === 100 ? ' — fully allocated' : ''}
                  </Text>
                  <TouchableOpacity
                    style={[styles.picksSearchBtn, (!picksValid || picksLoading) && styles.btnDisabled]}
                    onPress={handleGetVendorPicks}
                    disabled={!picksValid || picksLoading}
                  >
                    {picksLoading
                      ? <ActivityIndicator size={14} color="#fff" />
                      : <Ionicons name="arrow-forward" size={14} color="#fff" />}
                    <Text style={styles.picksSearchBtnText}>
                      {picksLoading ? 'Finding vendors...' : 'Find Best Vendors'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* vendor picks results */}
          {vendorPicks.length > 0 && (
            <View style={styles.picksResults}>
              <View style={styles.picksResultsHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.picksResultsTitle}>Your Vendor Picks</Text>
                  <Text style={styles.picksResultsSub}>AI-matched vendors for your budget and preferences.</Text>
                </View>
                <TouchableOpacity
                  style={styles.changePicksBtn}
                  onPress={() => { setVendorPicks([]); setShowPicksBuilder(true); }}
                >
                  <Ionicons name="refresh" size={13} color={theme.colors.primary} />
                  <Text style={styles.changePicksBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picksGridContent}>
                {vendorPicks.map((pick, i) => (
                  <View key={i} style={styles.pickCard}>
                    <View style={styles.pickStripe} />
                    {pick.vendor?.coverImage ? (
                      <Image source={{ uri: pick.vendor.coverImage }} style={styles.pickCover} resizeMode="cover" />
                    ) : (
                      <View style={styles.pickCoverPlaceholder}>
                        <Ionicons name="storefront" size={28} color={theme.colors.textSecondary} />
                      </View>
                    )}
                    <View style={styles.pickBody}>
                      <View style={styles.pickCatRow}>
                        <View style={styles.pickCatBadge}>
                          <Text style={styles.pickCatText}>{pick.category}</Text>
                        </View>
                        <Text style={styles.pickPct}>{pick.percentage}%</Text>
                      </View>
                      <Text style={styles.pickName} numberOfLines={1}>{pick.vendor?.businessName}</Text>
                      <View style={styles.pickMeta}>
                        {pick.vendor?.city && (
                          <View style={styles.pickMetaRow}>
                            <Ionicons name="location-outline" size={11} color={theme.colors.textSecondary} />
                            <Text style={styles.pickMetaText}>{pick.vendor.city}</Text>
                          </View>
                        )}
                        {pick.vendor?.ratingsAverage > 0 && (
                          <View style={styles.pickMetaRow}>
                            <Ionicons name="star" size={11} color="#f59e0b" />
                            <Text style={styles.pickMetaText}>{pick.vendor.ratingsAverage.toFixed(1)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.pickBudget}>
                        <Text style={styles.pickBudgetLabel}>Your budget</Text>
                        <Text style={styles.pickBudgetVal}>{fmtCurrency(pick.budgetAmount)}</Text>
                      </View>
                      {pick.vendor?.startingPrice > 0 && (
                        <Text style={styles.pickStarting}>From {fmtCurrency(pick.vendor.startingPrice)}</Text>
                      )}
                      {pick.reasoning && (
                        <Text style={styles.pickReason} numberOfLines={3}>{pick.reasoning}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.pickViewBtn}
                        onPress={() => router.push(`/vendors/${pick.vendor?.slug}`)}
                      >
                        <Text style={styles.pickViewBtnText}>View Vendor</Text>
                        <Ionicons name="arrow-forward" size={12} color={theme.colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* AI plan card */}
          {activeAiPlan?.allocations?.length > 0 && showAiPlan && (
            <View style={styles.aiCard}>
              <View style={styles.aiStripe} />
              <View style={styles.aiHead}>
                <Ionicons name="sparkles" size={20} color="#7c3aed" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiTitle}>AI Budget Recommendations</Text>
                  {activeAiPlan.summary && <Text style={styles.aiSummary}>{activeAiPlan.summary}</Text>}
                </View>
                <TouchableOpacity onPress={() => setShowAiPlan(false)} style={styles.aiCloseBtn}>
                  <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.aiAllocsGrid}>
                {activeAiPlan.allocations.map((a, i) => (
                  <View key={i} style={styles.aiAllocBlock}>
                    <Text style={styles.aiAllocCat}>{a.category.replace(/_/g, ' ')}</Text>
                    <Text style={styles.aiAllocAmt}>{fmtCurrency(a.amount)}</Text>
                    <View style={styles.aiAllocPctBadge}>
                      <Text style={styles.aiAllocPct}>{a.percentage}%</Text>
                    </View>
                    {a.explanation && <Text style={styles.aiAllocNote}>{a.explanation}</Text>}
                  </View>
                ))}
              </View>
              {activeAiPlan.tips?.length > 0 && (
                <View style={styles.aiTips}>
                  <View style={styles.aiTipsHead}>
                    <Ionicons name="checkmark-circle" size={15} color="#059669" />
                    <Text style={styles.aiTipsTitle}>Pro Tips</Text>
                  </View>
                  {activeAiPlan.tips.map((tip, i) => (
                    <View key={i} style={styles.aiTipRow}>
                      <Text style={styles.aiTipBullet}>{'\u2022'}</Text>
                      <Text style={styles.aiTipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* budget items list */}
          <View style={styles.bookedSection}>
            <View style={styles.bookedHead}>
              <Text style={styles.bookedTitle}>Budget Items</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {filteredItems.length > 0 && (
                  <View style={styles.bookedCountBadge}>
                    <Text style={styles.bookedCountText}>{filteredItems.length}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.bookedAddBtn} onPress={() => openItemModal()}>
                  <Ionicons name="add" size={14} color={theme.colors.primary} />
                  <Text style={styles.bookedAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {filteredItems.length > 0 ? (
              filteredItems.map(item => {
                const color = catColor(item.category);
                const overItem = (item.spentAmount || 0) > (item.allocatedAmount || 0);
                return (
                  <View key={item._id} style={[styles.bookedItem, { borderLeftColor: color }]}>
                    <View style={[styles.bookedAvatar, { backgroundColor: color }]}>
                      <Text style={styles.bookedAvatarText}>{catInitial(item.category)}</Text>
                    </View>
                    <View style={styles.bookedInfo}>
                      <Text style={styles.bookedCat}>{item.category}</Text>
                      {item.notes ? <Text style={styles.bookedNote} numberOfLines={1}>{item.notes}</Text> : null}
                      <View style={styles.bookedAmounts}>
                        <Text style={styles.bookedAmtEst}>{fmtCurrency(item.allocatedAmount)}</Text>
                        <Text style={styles.bookedAmtSep}>{'→'}</Text>
                        <Text style={[styles.bookedAmtSpent, overItem && styles.bookedAmtOver]}>
                          {fmtCurrency(item.spentAmount || 0)} spent
                        </Text>
                      </View>
                    </View>
                    <View style={styles.bookedActions}>
                      <TouchableOpacity style={styles.bookedBtnEdit} onPress={() => openItemModal(item)}>
                        <Ionicons name="pencil" size={13} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.bookedBtnDel} onPress={() => setDeleteTarget(item)}>
                        <Ionicons name="trash" size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.bookedEmpty}>
                <Ionicons name="receipt-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={styles.bookedEmptyText}>No items yet. Add your first budget item or generate an AI plan.</Text>
              </View>
            )}
          </View>


        </ScrollView>

        {/* add/edit item modal */}
        <Modal
          visible={itemModalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeItemModal}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeItemModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <Text style={styles.modalSheetTitle}>{editingItem ? 'Edit Item' : 'Add Budget Item'}</Text>
              <TouchableOpacity onPress={closeItemModal}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Category *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Venue, Catering, Photography"
                placeholderTextColor={theme.colors.textSecondary}
                value={itemForm.category}
                onChangeText={v => setItemForm(f => ({ ...f, category: v }))}
              />
              {events.length > 1 && (
                <View>
                  <Text style={styles.inputLabel}>Event</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[styles.eventPill, !itemForm.weddingEvent && styles.eventPillActive]}
                      onPress={() => setItemForm(f => ({ ...f, weddingEvent: '' }))}
                    >
                      <Text style={[styles.eventPillText, !itemForm.weddingEvent && styles.eventPillTextActive]}>General</Text>
                    </TouchableOpacity>
                    {events.map(evt => {
                      const isSelected = itemForm.weddingEvent === evt._id;
                      return (
                        <TouchableOpacity
                          key={evt._id}
                          style={[styles.eventPill, isSelected && [styles.eventPillActive, { backgroundColor: evt.color || EVENT_COLORS[evt.eventType] || theme.colors.primary }]]}
                          onPress={() => setItemForm(f => ({ ...f, weddingEvent: evt._id }))}
                        >
                          <Text style={[styles.eventPillText, isSelected && styles.eventPillTextActive]}>
                            {evt.title || EVENT_LABELS[evt.eventType] || evt.eventType}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Estimated Amount (PKR) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    value={itemForm.allocatedAmount}
                    onChangeText={v => setItemForm(f => ({ ...f, allocatedAmount: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Spent Amount (PKR)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSecondary}
                    keyboardType="numeric"
                    value={itemForm.spentAmount}
                    onChangeText={v => setItemForm(f => ({ ...f, spentAmount: v }))}
                  />
                </View>
              </View>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.inputTA]}
                placeholder="Additional details..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
                value={itemForm.notes}
                onChangeText={v => setItemForm(f => ({ ...f, notes: v }))}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveBtnText}>{editingItem ? 'Save Changes' : 'Add Item'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>

        {/* delete confirmation modal */}
        <Modal
          visible={!!deleteTarget}
          transparent
          animationType="fade"
          onRequestClose={() => setDeleteTarget(null)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeleteTarget(null)} />
          <View style={styles.deleteSheet}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="warning" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.deleteTitle}>Delete Item?</Text>
            <Text style={styles.deleteSub}>
              Remove <Text style={{ fontWeight: '700', color: theme.colors.text }}>{deleteTarget?.category}</Text> from your budget?{' '}
              This cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={handleDeleteItem}>
                <Text style={styles.deleteConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* edit total budget modal */}
        <Modal
          visible={editBudgetVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setEditBudgetVisible(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setEditBudgetVisible(false)} />
          <View style={styles.deleteSheet}>
            <View style={[styles.deleteIconWrap, { backgroundColor: '#fdf2f8' }]}>  
              <Ionicons name="wallet-outline" size={28} color="#D7385E" />
            </View>
            <Text style={styles.deleteTitle}>Edit Total Budget</Text>
            <Text style={styles.deleteSub}>Update your overall wedding budget amount.</Text>
            <TextInput
              style={[styles.setupInput, { marginVertical: 12 }]}
              placeholder="Enter new amount (PKR)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={editBudgetAmount}
              onChangeText={setEditBudgetAmount}
            />
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => { setEditBudgetVisible(false); setEditBudgetAmount(''); }}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.deleteConfirmBtn, { backgroundColor: '#D7385E' }]} onPress={handleUpdateBudget}>
                <Text style={styles.deleteConfirmText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* event manager modal */}
        <Modal
          visible={showEventManager}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEventManager(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEventManager(false)} />
          <View style={styles.emSheet}>
            <View style={styles.emHeader}>
              <Text style={styles.emHeaderTitle}>Manage Events</Text>
              <TouchableOpacity onPress={() => setShowEventManager(false)}>
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* current events */}
              <Text style={styles.emSectionTitle}>Your Events & Budget Split</Text>
              {events.length === 0 ? (
                <Text style={styles.emEmpty}>No events yet. Add your first event below.</Text>
              ) : (
                <EventAllocEditor
                  events={events}
                  budget={budget}
                  onSave={handleSaveAllocations}
                  onDelete={handleDeleteEvent}
                  saving={eventSaving}
                />
              )}

              {/* add event */}
              {(() => {
                const usedTypes = events.map(e => e.eventType);
                const available = ALL_EVENT_TYPES.filter(t => !usedTypes.includes(t.type));
                if (available.length === 0) return null;
                return (
                  <View style={styles.emAddSection}>
                    <Text style={styles.emSectionTitle}>Add an Event</Text>
                    <View style={styles.emTypeGrid}>
                      {available.map(t => (
                        <TouchableOpacity
                          key={t.type}
                          style={styles.emTypeBtn}
                          onPress={() => handleAddEvent(t.type)}
                          disabled={eventSaving}
                        >
                          <Text style={styles.emTypeEmoji}>{t.emoji}</Text>
                          <Text style={styles.emTypeLabel}>{t.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })()}
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ProtectedRoute>
  );
}

// -- styles --

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },

  // setup screen
  setupWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  setupCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 18,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
    elevation: 4,
  },
  setupIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: '#fce7f3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  setupTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: 8 },
  setupSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  setupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: theme.colors.primary, borderRadius: 10,
    paddingHorizontal: 24, paddingVertical: 13, marginTop: 8, width: '100%', justifyContent: 'center',
  },
  setupBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // hero
  hero: {
    flexDirection: 'column',
    backgroundColor: theme.colors.white, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, gap: 10,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  heroIconWrap: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: '#fce7f3',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  heroSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  heroActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  heroBtnAI: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  heroBtnAIText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroBtnPicks: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: theme.colors.primary, backgroundColor: theme.colors.white,
  },
  heroBtnPicksActive: { backgroundColor: theme.colors.primary },
  heroBtnPicksText: { color: theme.colors.primary, fontSize: 12, fontWeight: '600' },
  heroBtnAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  heroBtnAddText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // event tabs
  eventTabsWrap: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    maxHeight: 48,
  },
  eventTabsContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: 'center',
  },
  eventTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  eventTabActive: {
    borderBottomColor: theme.colors.primary,
  },
  eventTabDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  eventTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  eventTabTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },

  // event pills (in item modal)
  eventPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  eventPillActive: {
    backgroundColor: theme.colors.primary,
  },
  eventPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  eventPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },

  // stat tiles
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 10,
  },
  statTile: {
    width: '48%', backgroundColor: theme.colors.white, borderRadius: 12, padding: 14,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)', elevation: 2,
  },
  statTileRose:   { borderTopWidth: 3, borderTopColor: '#D7385E' },
  statTileViolet: { borderTopWidth: 3, borderTopColor: '#7c3aed' },
  statTileAmber:  { borderTopWidth: 3, borderTopColor: '#d97706' },
  statTileGreen:  { borderTopWidth: 3, borderTopColor: '#059669' },
  statTileRed:    { borderTopWidth: 3, borderTopColor: '#dc2626' },
  statLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 6, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  statEditBtn: {
    position: 'absolute', top: 6, right: 6, padding: 4, borderRadius: 6,
  },

  // progress card
  progressCard: {
    backgroundColor: theme.colors.white, marginHorizontal: 12, borderRadius: 14,
    padding: 16, marginBottom: 12, overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)', elevation: 2,
  },
  progressCardStripe: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary,
  },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  progressPct: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  progressPctOver: { color: '#dc2626' },
  progressTrack: {
    height: 8, backgroundColor: theme.colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 8, position: 'relative',
  },
  progressAllocFill: {
    position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: '#c4b5fd', borderRadius: 99,
  },
  progressSpentFill: {
    position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 99,
  },
  progressSpentFillOver: { backgroundColor: '#ef4444' },
  progressSpentFillWarn: { backgroundColor: '#f59e0b' },
  progressLegend: { flexDirection: 'row', gap: 16, marginBottom: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: theme.colors.textSecondary },
  alertOver: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginTop: 10,
  },
  alertOverText: { fontSize: 12, color: '#dc2626', flex: 1 },
  alertWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 10,
  },
  alertWarnText: { fontSize: 12, color: '#d97706', flex: 1 },

  // vendor picks builder
  picksBuilder: {
    backgroundColor: theme.colors.white, marginHorizontal: 12, borderRadius: 14,
    padding: 16, marginBottom: 12, overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)', elevation: 2,
  },
  picksBuilderStripe: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary,
  },
  picksBuilderHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  picksBuilderTitleRow: { flexDirection: 'row', gap: 10, flex: 1 },
  picksBuilderTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  picksBuilderSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 17 },
  catToggleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  catToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface,
  },
  catToggleSel: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catToggleText: { fontSize: 13, color: theme.colors.text, fontWeight: '500' },
  catToggleTextSel: { color: '#fff' },
  pctRows: { gap: 10 },
  pctRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pctLabel: { fontSize: 13, color: theme.colors.text, fontWeight: '500', flex: 1 },
  pctInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8,
    backgroundColor: theme.colors.surface, paddingHorizontal: 10, paddingVertical: 6,
    minWidth: 70,
  },
  pctInput: { fontSize: 14, color: theme.colors.text, textAlign: 'right', minWidth: 36 },
  pctSymbol: { fontSize: 13, color: theme.colors.textSecondary },
  pctSum: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  pctSumOk: { color: '#059669' },
  pctSumErr: { color: '#dc2626' },
  picksSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center',
    backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 12, marginTop: 8,
  },
  picksSearchBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // vendor picks results
  picksResults: {
    backgroundColor: theme.colors.white, marginHorizontal: 12, borderRadius: 14,
    padding: 16, marginBottom: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)', elevation: 2,
  },
  picksResultsHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  picksResultsTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  picksResultsSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  changePicksBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: theme.colors.primary,
  },
  changePicksBtnText: { fontSize: 12, color: theme.colors.primary, fontWeight: '600' },
  picksGridContent: { gap: 12, paddingVertical: 4 },
  pickCard: {
    width: 210, backgroundColor: theme.colors.surface, borderRadius: 12,
    overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border,
  },
  pickStripe: { height: 3, backgroundColor: theme.colors.primary },
  pickCover: { width: '100%', height: 100, backgroundColor: theme.colors.border },
  pickCoverPlaceholder: {
    width: '100%', height: 100, backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  pickBody: { padding: 10 },
  pickCatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  pickCatBadge: {
    backgroundColor: '#fce7f3', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2,
  },
  pickCatText: { fontSize: 10, fontWeight: '700', color: theme.colors.primary },
  pickPct: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  pickName: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginBottom: 5 },
  pickMeta: { gap: 3, marginBottom: 8 },
  pickMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pickMetaText: { fontSize: 11, color: theme.colors.textSecondary },
  pickBudget: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  pickBudgetLabel: { fontSize: 10, color: theme.colors.textSecondary },
  pickBudgetVal: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  pickStarting: { fontSize: 10, color: theme.colors.textSecondary, marginBottom: 5 },
  pickReason: {
    fontSize: 11, color: theme.colors.textSecondary, lineHeight: 16, marginBottom: 8,
    borderLeftWidth: 2, borderLeftColor: theme.colors.border, paddingLeft: 8,
  },
  pickViewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 7, paddingVertical: 7,
  },
  pickViewBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },

  // AI plan card
  aiCard: {
    backgroundColor: theme.colors.white, marginHorizontal: 12, borderRadius: 14,
    padding: 16, marginBottom: 12, overflow: 'hidden',
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)', elevation: 2,
  },
  aiStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#7c3aed' },
  aiHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14 },
  aiCloseBtn: { padding: 4 },
  aiTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  aiSummary: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 17 },
  aiAllocsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  aiAllocBlock: {
    width: '47%', backgroundColor: theme.colors.surface, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: theme.colors.border,
  },
  aiAllocCat: { fontSize: 11, color: theme.colors.textSecondary, textTransform: 'capitalize', marginBottom: 3 },
  aiAllocAmt: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  aiAllocPctBadge: {
    backgroundColor: '#ede9fe', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start',
  },
  aiAllocPct: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },
  aiAllocNote: { fontSize: 11, color: theme.colors.textSecondary, lineHeight: 15, marginTop: 5 },
  aiTips: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  aiTipsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  aiTipsTitle: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  aiTipRow: { flexDirection: 'row', gap: 6, marginBottom: 5 },
  aiTipBullet: { color: '#059669', fontSize: 14, lineHeight: 18 },
  aiTipText: { fontSize: 12, color: '#065f46', flex: 1, lineHeight: 18 },

  // expense items
  itemsSection: { paddingHorizontal: 12, marginBottom: 4 },
  itemsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  itemsTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  itemsCountBadge: {
    backgroundColor: theme.colors.surface, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: theme.colors.border,
  },
  itemsCountText: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '600' },
  itemCard: {
    backgroundColor: theme.colors.white, borderRadius: 12, marginBottom: 10,
    borderLeftWidth: 4, padding: 14,
    boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.05)', elevation: 2,
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  itemAvatar: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  itemInfo: { flex: 1 },
  itemCat: { fontSize: 14, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  itemNote: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  itemBtns: { flexDirection: 'row', gap: 8 },
  itemBtnEdit: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface,
  },
  itemBtnDel: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5',
  },
  itemAmounts: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingBottom: 10, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  itemAmtBlock: { flex: 1, alignItems: 'center' },
  itemAmtLabel: { fontSize: 10, color: theme.colors.textSecondary, marginBottom: 2 },
  itemAmtVal: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  itemAmtValOver: { color: '#ef4444' },
  itemBarTrack: {
    height: 5, backgroundColor: theme.colors.border, borderRadius: 99, overflow: 'hidden', marginBottom: 4,
  },
  itemBarFill: { height: '100%', borderRadius: 99 },
  itemPct: { fontSize: 10, color: theme.colors.textSecondary, textAlign: 'right' },

  // empty items
  emptyItems: {
    backgroundColor: theme.colors.white, borderRadius: 14, padding: 24,
    alignItems: 'center', marginBottom: 12,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.04)', elevation: 1,
  },
  emptyItemsTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 12, marginBottom: 4 },
  emptyItemsSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  emptyItemsActions: { flexDirection: 'row', gap: 10 },
  emptyAIBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#7c3aed', borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10,
  },
  emptyAIBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 10,
  },
  emptyAddBtnText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },

  // modal overlay + sheet
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%', paddingHorizontal: 18, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  modalSheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  modalSheetTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },

  // form inputs
  inputLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputTA: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  saveBtn: {
    backgroundColor: theme.colors.primary, borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginTop: 20, marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // delete modal
  deleteSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, alignItems: 'center',
  },
  deleteIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fef3c7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  deleteTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  deleteSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  deleteActions: { flexDirection: 'row', gap: 10, width: '100%' },
  deleteCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center',
  },
  deleteCancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  deleteConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#ef4444', alignItems: 'center',
  },
  deleteConfirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // shared
  btnDisabled: { opacity: 0.55 },

  // compact booked items list
  bookedSection: { paddingHorizontal: 12, marginBottom: 16 },
  bookedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  bookedTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  bookedCountBadge: {
    backgroundColor: theme.colors.surface, borderRadius: 10,
    paddingHorizontal: 9, paddingVertical: 2, borderWidth: 1, borderColor: theme.colors.border,
  },
  bookedCountText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  bookedAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 7,
    paddingHorizontal: 9, paddingVertical: 5,
  },
  bookedAddBtnText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  bookedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.white, borderRadius: 10, borderLeftWidth: 4,
    paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.04)', elevation: 1,
  },
  bookedAvatar: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bookedAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  bookedInfo: { flex: 1 },
  bookedCat: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textTransform: 'capitalize' },
  bookedNote: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 1 },
  bookedAmounts: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  bookedAmtEst: { fontSize: 11, color: theme.colors.textSecondary },
  bookedAmtSep: { fontSize: 10, color: theme.colors.border },
  bookedAmtSpent: { fontSize: 11, fontWeight: '600', color: '#059669' },
  bookedAmtOver: { color: '#ef4444' },
  bookedActions: { flexDirection: 'row', gap: 6 },
  bookedBtnEdit: {
    width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: theme.colors.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface,
  },
  bookedBtnDel: {
    width: 28, height: 28, borderRadius: 7, borderWidth: 1, borderColor: '#fecaca',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff5f5',
  },
  bookedEmpty: {
    backgroundColor: theme.colors.white, borderRadius: 12, padding: 20,
    alignItems: 'center', gap: 8,
  },
  bookedEmptyText: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  // Events button in hero
  heroBtnEvents: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  heroBtnEventsText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Gear icon in event tabs
  eventTabGear: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1',
    alignItems: 'center', justifyContent: 'center', marginLeft: 2,
  },

  // Event Manager Modal
  emSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: theme.colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '85%', paddingHorizontal: 18, paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  emHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  emHeaderTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  emSectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 10 },
  emEmpty: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', paddingVertical: 16 },

  // allocations editor
  emAllocWrap: { marginBottom: 18 },
  emAllocRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  emAllocDot: { width: 10, height: 10, borderRadius: 5 },
  emAllocName: { fontSize: 13, fontWeight: '600', color: '#334155', minWidth: 70, textTransform: 'capitalize' },
  emAllocInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8,
    paddingHorizontal: 8,
  },
  emAllocCurrency: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  emAllocInput: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e293b', paddingVertical: 8 },
  emAllocDelBtn: {
    width: 28, height: 28, borderRadius: 7,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff5f5',
    alignItems: 'center', justifyContent: 'center',
  },

  // summary
  emSummary: {
    backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginTop: 10,
    borderWidth: 1, borderColor: '#e2e8f0', gap: 4,
  },
  emSummaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  emSummaryRowOver: {},
  emSummaryLabel: { fontSize: 12, color: '#64748b' },
  emSummaryVal: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
  emSaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 12, marginTop: 12,
  },
  emSaveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // add event type grid
  emAddSection: { marginTop: 8, marginBottom: 12 },
  emTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emTypeBtn: {
    width: '22%', alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  emTypeEmoji: { fontSize: 22, marginBottom: 4 },
  emTypeLabel: { fontSize: 11, fontWeight: '600', color: '#475569', textTransform: 'capitalize' },
});
