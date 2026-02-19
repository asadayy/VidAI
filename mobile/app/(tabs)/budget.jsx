import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { budgetAPI } from '../../api/budget.js';
import Loading from '../../components/Loading';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

export default function Budget() {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [createAmount, setCreateAmount] = useState('');
  const [itemForm, setItemForm] = useState({
    category: '',
    notes: '',
    allocatedAmount: '',
    spentAmount: '',
  });

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const response = await budgetAPI.getMine();
      const budgetData = response.data?.data?.budget || response.data?.budget;
      setBudget(budgetData);
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching budget:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to load budget',
        });
      }
      setBudget(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBudget();
  };

  const handleCreateBudget = async () => {
    if (!createAmount || isNaN(createAmount) || Number(createAmount) <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Please enter a valid amount',
      });
      return;
    }

    try {
      await budgetAPI.create({ totalBudget: Number(createAmount) });
      Toast.show({
        type: 'success',
        text1: 'Budget created successfully!',
      });
      setIsModalOpen(false);
      setCreateAmount('');
      fetchBudget();
    } catch (error) {
      console.error('Error creating budget:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to create budget',
      });
    }
  };

  const handleGenerateAI = async () => {
    try {
      setAiLoading(true);
      Toast.show({
        type: 'info',
        text1: 'Generating AI budget plan...',
      });
      await budgetAPI.generateAIPlan();
      Toast.show({
        type: 'success',
        text1: 'AI Plan generated!',
      });
      fetchBudget();
    } catch (error) {
      console.error('Error generating AI plan:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to generate AI plan',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!itemForm.category || !itemForm.allocatedAmount) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in all required fields',
      });
      return;
    }

    try {
      const data = {
        category: itemForm.category,
        notes: itemForm.notes,
        allocatedAmount: Number(itemForm.allocatedAmount),
        spentAmount: Number(itemForm.spentAmount) || 0,
      };

      if (editingItem) {
        await budgetAPI.updateItem(editingItem._id, data);
        Toast.show({
          type: 'success',
          text1: 'Budget item updated!',
        });
      } else {
        await budgetAPI.addItem(data);
        Toast.show({
          type: 'success',
          text1: 'Budget item added!',
        });
      }

      setIsItemModalOpen(false);
      setEditingItem(null);
      setItemForm({ category: '', notes: '', allocatedAmount: '', spentAmount: '' });
      fetchBudget();
    } catch (error) {
      console.error('Error saving item:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to save budget item',
      });
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await budgetAPI.deleteItem(itemId);
      Toast.show({
        type: 'success',
        text1: 'Budget item deleted!',
      });
      fetchBudget();
    } catch (error) {
      console.error('Error deleting item:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to delete budget item',
      });
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setItemForm({
      category: item.category || '',
      notes: item.notes || '',
      allocatedAmount: item.allocatedAmount?.toString() || '',
      spentAmount: item.spentAmount?.toString() || '',
    });
    setIsItemModalOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return <Loading fullScreen message="Loading budget..." />;
  }

  if (!budget) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <EmptyState
            icon={<Ionicons name="wallet-outline" size={48} color={theme.colors.textSecondary} />}
            title="No Budget Set"
            message="Create a budget to start tracking your wedding expenses"
          />
          <Button
            title="Create Budget"
            onPress={() => setIsModalOpen(true)}
            style={styles.createButton}
          />
        </ScrollView>

        {/* Create Budget Modal */}
        <Modal
          visible={isModalOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setIsModalOpen(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Budget</Text>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalLabel}>Total Budget (PKR) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter total budget"
                keyboardType="numeric"
                value={createAmount}
                onChangeText={setCreateAmount}
              />
              <Button
                title="Create"
                onPress={handleCreateBudget}
                style={styles.modalButton}
              />
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  const totalBudget = budget.totalBudget || 0;
  const totalSpent = budget.items?.reduce((sum, item) => sum + (item.spentAmount || 0), 0) || 0;
  const remaining = totalBudget - totalSpent;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* Budget Overview */}
        <Card style={styles.overviewCard}>
          <Text style={styles.cardTitle}>Budget Overview</Text>
          <View style={styles.budgetStats}>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetLabel}>Total Budget</Text>
              <Text style={styles.budgetValue}>{formatCurrency(totalBudget)}</Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetLabel}>Spent</Text>
              <Text style={styles.budgetValue}>{formatCurrency(totalSpent)}</Text>
            </View>
            <View style={styles.budgetStat}>
              <Text style={styles.budgetLabel}>Remaining</Text>
              <Text style={[styles.budgetValue, remaining < 0 && styles.budgetValueDanger]}>
                {formatCurrency(remaining)}
              </Text>
            </View>
          </View>
          {totalBudget > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min((totalSpent / totalBudget) * 100, 100)}%` },
                ]}
              />
            </View>
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Generate AI Plan"
            onPress={handleGenerateAI}
            loading={aiLoading}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title="Add Item"
            onPress={() => {
              setEditingItem(null);
              setItemForm({ category: '', notes: '', allocatedAmount: '', spentAmount: '' });
              setIsItemModalOpen(true);
            }}
            style={styles.actionButton}
          />
        </View>

        {/* Budget Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Budget Items</Text>
          {budget.items && budget.items.length > 0 ? (
            budget.items.map((item) => (
              <Card key={item._id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemCategory}>
                      {item.category?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                    {item.notes && (
                      <Text style={styles.itemNotes}>{item.notes}</Text>
                    )}
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEditModal(item)}>
                      <Ionicons name="pencil" size={20} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(item._id)}>
                      <Ionicons name="trash" size={20} color={theme.colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.itemAmounts}>
                  <View style={styles.itemAmount}>
                    <Text style={styles.itemAmountLabel}>Allocated</Text>
                    <Text style={styles.itemAmountValue}>
                      {formatCurrency(item.allocatedAmount)}
                    </Text>
                  </View>
                  <View style={styles.itemAmount}>
                    <Text style={styles.itemAmountLabel}>Spent</Text>
                    <Text style={styles.itemAmountValue}>
                      {formatCurrency(item.spentAmount)}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <EmptyState
              icon={<Ionicons name="list-outline" size={48} color={theme.colors.textSecondary} />}
              title="No budget items"
              message="Add items to track your expenses"
            />
          )}
        </View>
      </View>

      {/* Add/Edit Item Modal */}
      <Modal
        visible={isItemModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsItemModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingItem ? 'Edit Item' : 'Add Budget Item'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setIsItemModalOpen(false);
                setEditingItem(null);
                setItemForm({ category: '', notes: '', allocatedAmount: '', spentAmount: '' });
              }}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Category *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Venue, Catering, Photography"
              value={itemForm.category}
              onChangeText={(text) => setItemForm({ ...itemForm, category: text })}
            />

            <Text style={styles.modalLabel}>Allocated Amount (PKR) *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter allocated amount"
              keyboardType="numeric"
              value={itemForm.allocatedAmount}
              onChangeText={(text) => setItemForm({ ...itemForm, allocatedAmount: text })}
            />

            <Text style={styles.modalLabel}>Spent Amount (PKR)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter spent amount"
              keyboardType="numeric"
              value={itemForm.spentAmount}
              onChangeText={(text) => setItemForm({ ...itemForm, spentAmount: text })}
            />

            <Text style={styles.modalLabel}>Notes</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Additional notes..."
              multiline
              numberOfLines={4}
              value={itemForm.notes}
              onChangeText={(text) => setItemForm({ ...itemForm, notes: text })}
            />

            <Button
              title={editingItem ? 'Update Item' : 'Add Item'}
              onPress={handleSaveItem}
              style={styles.modalButton}
            />
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  createButton: {
    marginTop: theme.spacing.lg,
  },
  overviewCard: {
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  budgetStat: {
    flex: 1,
  },
  budgetLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  budgetValue: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  budgetValueDanger: {
    color: theme.colors.danger,
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
  },
  itemsSection: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  itemCard: {
    marginBottom: theme.spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  itemNotes: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  itemAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  itemAmount: {
    alignItems: 'center',
  },
  itemAmountLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  itemAmountValue: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  modalLabel: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    backgroundColor: theme.colors.white,
  },
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalButton: {
    marginTop: theme.spacing.lg,
  },
});
