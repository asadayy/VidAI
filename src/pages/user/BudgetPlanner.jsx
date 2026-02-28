import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Sparkles, Brain, Save, X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { budgetAPI } from '../../api/budget';
import { useAuth } from '../../context/AuthContext';
import './BudgetPlanner.css';

const BudgetPlanner = () => {
  const { user } = useAuth();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form states
  const [createAmount, setCreateAmount] = useState('');
  const [itemForm, setItemForm] = useState({
    category: '',
    notes: '',
    allocatedAmount: '',
    spentAmount: ''
  });

  useEffect(() => {
    fetchBudget();
  }, []);

  useEffect(() => {
    if (user?.onboarding?.budgets && !budget && createAmount === '') {
      let total = 0;
      Object.values(user.onboarding.budgets).forEach(val => {
        if (val === 'Under 10,000') total += 10000;
        else if (val === '10,000 - 25,000') total += 25000;
        else if (val === '25,000 - 50,000') total += 50000;
        else if (val === 'Above 50,000') total += 75000;
      });
      if (total > 0) {
        setCreateAmount(total.toString());
      }
    }
  }, [user, budget, createAmount]);

  // Debug: Log budget state changes
  useEffect(() => {
    console.log('Budget state changed:', budget);
    console.log('Loading state:', loading);
  }, [budget, loading]);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await budgetAPI.getMine();
      console.log('Fetched budget response:', response.data); // Debug log
      // Axios returns response.data, which contains {success, data: {budget}}
      // So we need response.data.data.budget
      const budgetData = response.data?.data?.budget || response.data?.budget;
      setBudget(budgetData);
      console.log('Budget set to:', budgetData); // Debug log
    } catch (error) {
      if (error.response && error.response.status === 404) {
        setBudget(null);
      } else {
        console.error('Error fetching budget:', error);
        toast.error('Failed to load budget');
      }
    } finally {
      setLoading(false);
      console.log('Loading set to false'); // Debug log
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    if (!createAmount || isNaN(createAmount) || Number(createAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      console.log('Creating budget with amount:', createAmount); // Debug log
      await budgetAPI.create({ totalBudget: Number(createAmount) });
      toast.success('Budget created successfully!');
      console.log('Budget created, fetching...'); // Debug log
      await fetchBudget(); // Wait for fetchBudget to complete
      console.log('Fetch complete'); // Debug log
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget');
      setLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      toast.loading('Generating AI budget plan...', { id: 'ai-toast' });
      await budgetAPI.generateAIPlan();
      toast.success('AI Plan generated!', { id: 'ai-toast' });
      fetchBudget();
    } catch (error) {
      console.error('Error generating AI plan:', error);
      toast.error('Failed to generate AI plan', { id: 'ai-toast' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      const data = {
        category: itemForm.category,
        notes: itemForm.notes,
        allocatedAmount: Number(itemForm.allocatedAmount),
        spentAmount: Number(itemForm.spentAmount) || 0
      };

      if (editingItem) {
        await budgetAPI.updateItem(editingItem._id, data);
        toast.success('Item updated');
      } else {
        await budgetAPI.addItem(data);
        toast.success('Item added');
      }
      closeModal();
      fetchBudget();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Failed to save item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await budgetAPI.deleteItem(itemId);
      toast.success('Item deleted');
      fetchBudget();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        category: item.category,
        notes: item.notes || '',
        allocatedAmount: item.allocatedAmount,
        spentAmount: item.spentAmount || ''
      });
    } else {
      setEditingItem(null);
      setItemForm({
        category: '',
        notes: '',
        allocatedAmount: '',
        spentAmount: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR'
    }).format(amount || 0);
  };

  console.log('Render - budget:', budget, 'loading:', loading, 'budget truthy:', !!budget); // Debug log

  if (loading && !budget) {
    console.log('Showing loading spinner');
    return <div className="loading-spinner">Loading budget...</div>;
  }

  // Create Budget View
  if (!budget && !loading) {
    console.log('Showing create budget form'); // Debug log
    return (
      <div className="create-budget-container">
        <h2 className="create-budget-title">Create Your Wedding Budget</h2>
        <form onSubmit={handleCreateBudget}>
          <div className="budget-input-group">
            <label className="form-label">Total Budget Amount</label>
            <input
              type="number"
              className="budget-input"
              placeholder="e.g. 25000"
              value={createAmount}
              onChange={(e) => setCreateAmount(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary">
            <Plus size={20} style={{ marginRight: '8px', display: 'inline' }} />
            Start Planning
          </button>
        </form>
      </div>
    );
  }

  // If we reach here, budget exists
  console.log('Showing budget planner with budget:', budget);

  // Calculate totals
  const totalAllocated = budget?.items?.reduce((sum, item) => sum + (item.allocatedAmount || 0), 0) || 0;
  const totalSpent = budget?.items?.reduce((sum, item) => sum + (item.spentAmount || 0), 0) || 0;
  const remaining = (budget?.totalBudget || 0) - totalSpent;

  return (
    <div className="budget-planner-container">
      <div className="budget-header">
        <h1 className="budget-title">Budget Planner</h1>
      </div>

      <div className="budget-summary">
        <div className="summary-card">
          <span className="summary-label">Total Budget</span>
          <span className="summary-value">{formatCurrency(budget.totalBudget)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Estimated Cost</span>
          <span className="summary-value">{formatCurrency(totalAllocated)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Actual Spent</span>
          <span className="summary-value">{formatCurrency(totalSpent)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Remaining</span>
          <span className={`summary-value ${remaining >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>
      </div>

      <div className="budget-actions">
        <button
          className="btn-ai-generate"
          onClick={handleGenerateAI}
          disabled={aiLoading}
        >
          {aiLoading ? <Sparkles className="spin" size={20} /> : <Brain size={20} />}
          {aiLoading ? 'Generating...' : 'Generate AI Plan'}
        </button>
        <button className="btn-add-item" onClick={() => openModal()}>
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* AI Plan Section */}
      {budget.aiPlan && budget.aiPlan.allocations && budget.aiPlan.allocations.length > 0 && (
        <div className="ai-plan-section" style={{ margin: '2rem 0', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={24} style={{ color: '#6366f1' }} />
            AI Budget Recommendations
          </h2>
          {budget.aiPlan.summary && (
            <p style={{ marginBottom: '1rem', color: '#666' }}>{budget.aiPlan.summary}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {budget.aiPlan.allocations.map((allocation, index) => (
              <div key={index} style={{ padding: '1rem', background: 'white', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                  {allocation.category.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#6366f1', marginBottom: '0.5rem' }}>
                  {formatCurrency(allocation.amount)} ({allocation.percentage}%)
                </div>
                {allocation.explanation && (
                  <div style={{ fontSize: '0.875rem', color: '#666' }}>{allocation.explanation}</div>
                )}
              </div>
            ))}
          </div>
          {budget.aiPlan.tips && budget.aiPlan.tips.length > 0 && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '600' }}>💡 Tips</h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                {budget.aiPlan.tips.map((tip, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem', fontSize: '0.875rem' }}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="budget-items-list">
        <table className="items-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Estimated</th>
              <th>Actual</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {budget?.items?.length > 0 ? (
              budget.items.map((item) => (
                <tr key={item._id}>
                  <td>{item.category}</td>
                  <td>{item.notes}</td>
                  <td>{formatCurrency(item.allocatedAmount)}</td>
                  <td>{formatCurrency(item.spentAmount)}</td>
                  <td>
                    <div className="item-actions">
                      <button className="btn-icon edit" onClick={() => openModal(item)}>
                        <Edit2 size={18} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDeleteItem(item._id)}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                  No budget items yet. Add one or use AI to generate a plan!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Venue, Catering"
                  value={itemForm.category}
                  onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Item details"
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Allocated Amount</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  value={itemForm.allocatedAmount}
                  onChange={(e) => setItemForm({ ...itemForm, allocatedAmount: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Spent Amount</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  value={itemForm.spentAmount}
                  onChange={(e) => setItemForm({ ...itemForm, spentAmount: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-save">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetPlanner;
