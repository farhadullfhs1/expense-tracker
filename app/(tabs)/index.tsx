import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  Expense,
  ExpenseCategory,
  dayKey,
  formatCurrencyFromPaise,
  formatDate,
  useExpenses,
} from '@/context/ExpenseContext';
import { exportExpenses, ExportMode } from '@/lib/exportWorkbook';

const categories: { label: ExpenseCategory; icon: keyof typeof Feather.glyphMap }[] = [
  { label: 'Food', icon: 'coffee' },
  { label: 'Travel', icon: 'navigation' },
  { label: 'Shopping', icon: 'shopping-bag' },
  { label: 'Bills', icon: 'file-text' },
  { label: 'Health', icon: 'heart' },
  { label: 'Other', icon: 'more-horizontal' },
];

function currencyPaise(value: string): number {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1_000_000 && Math.round(parsed * 100) === parsed * 100 ? Math.round(parsed * 100) : 0;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, isLoading, usageDays, isUnlocked, addExpense, deleteExpense } = useExpenses();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [note, setNote] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const todayKey = dayKey(new Date());

  const todaysExpenses = useMemo(
    () => expenses.filter((expense) => expense.date === todayKey),
    [expenses, todayKey],
  );
  const todayTotal = useMemo(
    () => todaysExpenses.reduce((sum, expense) => sum + expense.amountPaise, 0),
    [todaysExpenses],
  );

  async function handleAdd() {
    const amountPaise = currencyPaise(amount);
    if (amountPaise <= 0) {
      Alert.alert('Enter a valid amount', 'Use an amount from ₹0.01 to ₹10,00,000 with at most two decimal places.');
      return;
    }
    await addExpense({ amountPaise, category, note });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmount('');
    setNote('');
    Keyboard.dismiss();
  }

  function confirmDelete(expense: Expense) {
    Alert.alert('Delete expense?', `${formatCurrencyFromPaise(expense.amountPaise)} at ${expense.category} will be removed.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteExpense(expense.id),
      },
    ]);
  }

  async function handleExport(mode: ExportMode) {
    setIsExporting(true);
    try {
      await exportExpenses(expenses, mode);
      setExportOpen(false);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Export unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsExporting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading your expenses</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={todaysExpenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 112 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.teal }]}>PERSONAL FINANCE</Text>
                <Text style={[styles.title, { color: colors.navy }]}>Good to see you.</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Keep today's spending simple.</Text>
              </View>
              <View style={[styles.calendarIcon, { backgroundColor: colors.amberSoft }]}>
                <Feather name="calendar" size={20} color={colors.primary} />
              </View>
            </View>

            <View style={[styles.totalCard, { backgroundColor: colors.navy }]}>
              <View style={styles.totalTopLine}>
                <Text style={styles.totalLabel}>TODAY'S SPENDING</Text>
                <View style={[styles.todayPill, { backgroundColor: colors.teal }]}>
                  <Text style={styles.todayPillText}>Today</Text>
                </View>
              </View>
              <Text style={styles.totalAmount}>{formatCurrencyFromPaise(todayTotal)}</Text>
              <Text style={styles.totalHint}>
                {todaysExpenses.length === 0
                  ? 'Start with your first expense'
                  : `${todaysExpenses.length} ${todaysExpenses.length === 1 ? 'entry' : 'entries'} recorded`}
              </Text>
              <View style={styles.totalAccent}>
                <View style={[styles.accentDot, { backgroundColor: colors.primary }]} />
                <View style={[styles.accentLine, { backgroundColor: colors.teal }]} />
                <View style={[styles.accentDot, { backgroundColor: colors.primary }]} />
              </View>
            </View>

            <View style={styles.sectionHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>Add expense</Text>
                <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>What did you spend on?</Text>
              </View>
              <Text style={[styles.dateLabel, { color: colors.mutedForeground }]}>
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>

            <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.amountInputWrap, { backgroundColor: colors.muted }]}>
                <Text style={[styles.rupee, { color: colors.teal }]}>₹</Text>
                <TextInput
                  testID="amount-input"
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="decimal-pad"
                  style={[styles.amountInput, { color: colors.navy }]}
                  accessibilityLabel="Expense amount"
                />
              </View>
              <TextInput
                testID="note-input"
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.noteInput, { color: colors.navy, borderColor: colors.border }]}
                maxLength={60}
              />
              <Text style={[styles.chooseLabel, { color: colors.mutedForeground }]}>Category</Text>
              <View style={styles.categoryGrid}>
                {categories.map((item) => {
                  const selected = item.label === category;
                  return (
                    <Pressable
                      key={item.label}
                      testID={`category-${item.label.toLowerCase()}`}
                      onPress={() => setCategory(item.label)}
                      style={({ pressed }) => [
                        styles.categoryChip,
                        {
                          backgroundColor: selected ? colors.accent : colors.background,
                          borderColor: selected ? colors.teal : colors.border,
                          opacity: pressed ? 0.72 : 1,
                        },
                      ]}
                    >
                      <Feather name={item.icon} size={15} color={selected ? colors.tealDark : colors.mutedForeground} />
                      <Text style={[styles.categoryText, { color: selected ? colors.tealDark : colors.mutedForeground }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                testID="add-expense"
                onPress={handleAdd}
                style={({ pressed }) => [
                  styles.addButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 },
                ]}
              >
                <Text style={styles.addButtonText}>Add expense</Text>
                <Feather name="arrow-up-right" size={18} color={colors.white} />
              </Pressable>
            </View>

            <View style={styles.listHeading}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>Today's expenses</Text>
                <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>
                  {todaysExpenses.length ? 'Swipe into a clearer view of your day' : 'Your entries will show up here'}
                </Text>
              </View>
              {todaysExpenses.length > 0 && (
                <Text style={[styles.listTotal, { color: colors.teal }]}>{formatCurrencyFromPaise(todayTotal)}</Text>
              )}
            </View>
          </>
        }
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            colors={colors}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.amberSoft }]}>
              <Feather name="coffee" size={20} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>Nothing logged yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add your first expense above and your daily total will update instantly.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={[styles.insightPrompt, { backgroundColor: colors.accent }]}>
            <View style={[styles.insightIcon, { backgroundColor: colors.white }]}>
              <Feather name={isUnlocked ? 'bar-chart-2' : 'lock'} size={18} color={colors.tealDark} />
            </View>
            <View style={styles.insightCopy}>
              <Text style={[styles.insightTitle, { color: colors.tealDark }]}>
                {isUnlocked ? 'Your insights are ready' : `${Math.min(usageDays, 30)} of 30 days tracked`}
              </Text>
              <Text style={[styles.insightText, { color: colors.tealDark }]}>
                {isUnlocked
                  ? 'Open Insights for week, month and year comparisons.'
                  : 'Keep logging daily to unlock analytics and Excel export after one month.'}
              </Text>
            </View>
            {isUnlocked && (
              <Pressable onPress={() => setExportOpen(true)} testID="export-button">
                <Feather name="download" size={20} color={colors.tealDark} />
              </Pressable>
            )}
          </View>
        }
      />

      <Modal visible={exportOpen} transparent animationType="slide" onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.exportSheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.navy }]}>Export your records</Text>
                <Text style={[styles.sheetCaption, { color: colors.mutedForeground }]}>
                  Choose how monthly data should be organized.
                </Text>
              </View>
              <Pressable onPress={() => setExportOpen(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <ExportOption
              colors={colors}
              icon="layers"
              title="One workbook, monthly sheets"
              description="Best for a complete yearly record in one Excel file."
              onPress={() => handleExport('sheets')}
              disabled={isExporting}
            />
            <ExportOption
              colors={colors}
              icon="file"
              title="Separate file for each month"
              description="Creates one Excel file per month in your records."
              onPress={() => handleExport('files')}
              disabled={isExporting}
            />
            {isExporting && <ActivityIndicator color={colors.primary} style={styles.exportSpinner} />}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ExpenseRow({
  expense,
  colors,
  onDelete,
}: {
  expense: Expense;
  colors: ReturnType<typeof useColors>;
  onDelete: () => void;
}) {
  const category = categories.find((item) => item.label === expense.category) ?? categories[5];
  return (
    <Pressable
      onLongPress={onDelete}
      delayLongPress={450}
      style={({ pressed }) => [
        styles.expenseRow,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
        <Feather name={category.icon} size={18} color={colors.teal} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowCategory, { color: colors.navy }]}>{expense.category}</Text>
        <Text style={[styles.rowNote, { color: colors.mutedForeground }]}>
          {expense.note || `Added ${formatDate(expense.date)}`} · Hold to delete
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: colors.navy }]}>{formatCurrencyFromPaise(expense.amountPaise)}</Text>
    </Pressable>
  );
}

function ExportOption({
  colors,
  icon,
  title,
  description,
  onPress,
  disabled,
}: {
  colors: ReturnType<typeof useColors>;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.exportOption,
        { borderColor: colors.border, backgroundColor: pressed ? colors.muted : colors.background },
      ]}
    >
      <View style={[styles.exportIcon, { backgroundColor: colors.amberSoft }]}>
        <Feather name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.exportCopy}>
        <Text style={[styles.exportTitle, { color: colors.navy }]}>{title}</Text>
        <Text style={[styles.exportDescription, { color: colors.mutedForeground }]}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.7, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 5 },
  calendarIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  totalCard: { borderRadius: 24, padding: 22, marginBottom: 27, overflow: 'hidden' },
  totalTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: '#b9c5c0', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.3 },
  todayPill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 5 },
  todayPillText: { color: '#ffffff', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  totalAmount: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 42, letterSpacing: -1.4, marginTop: 12 },
  totalHint: { color: '#b9c5c0', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  totalAccent: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 20 },
  accentDot: { width: 6, height: 6, borderRadius: 3 },
  accentLine: { width: 45, height: 3, borderRadius: 2 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.4 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  dateLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, paddingBottom: 2 },
  formCard: { borderRadius: 22, borderWidth: 1, padding: 14, marginBottom: 28 },
  amountInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, height: 64, paddingHorizontal: 17 },
  rupee: { fontFamily: 'Inter_700Bold', fontSize: 25, marginRight: 9 },
  amountInput: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 30, padding: 0 },
  noteInput: { borderBottomWidth: 1, fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 14, marginHorizontal: 3 },
  chooseLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 15, marginBottom: 9, marginHorizontal: 3 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 },
  categoryText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  addButton: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 16 },
  addButtonText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 14 },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  listTotal: { fontFamily: 'Inter_700Bold', fontSize: 15, paddingBottom: 2 },
  expenseRow: { minHeight: 70, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 9 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  rowCopy: { flex: 1 },
  rowCategory: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  rowNote: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  rowAmount: { fontFamily: 'Inter_700Bold', fontSize: 15, marginLeft: 8 },
  emptyState: { alignItems: 'center', borderWidth: 1, borderRadius: 20, padding: 24, marginBottom: 12 },
  emptyIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5, maxWidth: 270 },
  insightPrompt: { borderRadius: 18, padding: 14, marginTop: 10, flexDirection: 'row', alignItems: 'center' },
  insightIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  insightCopy: { flex: 1, paddingRight: 7 },
  insightTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  insightText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(23,33,43,0.45)', justifyContent: 'flex-end' },
  exportSheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: '#dfe6df', alignSelf: 'center', marginBottom: 22 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  sheetCaption: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 5 },
  exportOption: { minHeight: 76, borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  exportIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  exportCopy: { flex: 1 },
  exportTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  exportDescription: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4 },
  exportSpinner: { marginTop: 4 },
});
