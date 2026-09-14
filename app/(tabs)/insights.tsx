import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  dayKey,
  ExpenseCategory,
  formatCurrencyFromPaise,
  parseDayKey,
  useExpenses,
} from '@/context/ExpenseContext';

type Period = 'week' | 'month' | 'year';
const periods: { label: string; value: Period }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];
const categoryColors: Record<ExpenseCategory, string> = {
  Food: '#f5a524',
  Travel: '#3f8c71',
  Shopping: '#7a77c8',
  Bills: '#db6d5f',
  Health: '#4b9bb3',
  Other: '#89968c',
};

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return new Date(result.getFullYear(), result.getMonth(), result.getDate());
}

function periodStart(period: Period, offset: number): Date {
  const now = new Date();
  if (period === 'week') {
    const start = startOfWeek(now);
    start.setDate(start.getDate() + offset * 7);
    return start;
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return new Date(now.getFullYear() + offset, 0, 1);
}

function periodEnd(period: Period, offset: number): Date {
  const start = periodStart(period, offset);
  if (period === 'week') {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
  }
  if (period === 'month') return new Date(start.getFullYear(), start.getMonth() + 1, 0);
  return new Date(start.getFullYear(), 11, 31);
}

function between(value: string, start: Date, end: Date): boolean {
  const date = parseDayKey(value).getTime();
  return date >= start.getTime() && date <= end.getTime();
}

function periodName(period: Period): string {
  return period === 'week' ? 'this week' : period === 'month' ? 'this month' : 'this year';
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, isLoading, isUnlocked, usageDays } = useExpenses();
  const [period, setPeriod] = useState<Period>('week');

  const current = useMemo(() => {
    const start = periodStart(period, 0);
    const end = periodEnd(period, 0);
    return expenses.filter((expense) => between(expense.date, start, end));
  }, [expenses, period]);
  const previous = useMemo(() => {
    const start = periodStart(period, -1);
    const end = periodEnd(period, -1);
    return expenses.filter((expense) => between(expense.date, start, end));
  }, [expenses, period]);
  const currentTotal = current.reduce((sum, expense) => sum + expense.amountPaise, 0);
  const previousTotal = previous.reduce((sum, expense) => sum + expense.amountPaise, 0);
  const difference = currentTotal - previousTotal;
  const categoryTotals = useMemo(() => {
    const totals = new Map<ExpenseCategory, number>();
    current.forEach((expense) => totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amountPaise));
    return Array.from(totals.entries()).sort(([, a], [, b]) => b - a);
  }, [current]);
  const dailyBars = useMemo(() => {
    const bars: { label: string; value: number }[] = [];
    const start = period === 'week' ? periodStart('week', 0) : new Date();
    for (let index = 6; index >= 0; index -= 1) {
      const date = new Date(start);
      date.setDate(start.getDate() - index);
      const key = dayKey(date);
      const total = expenses
        .filter((expense) => expense.date === key)
        .reduce((sum, expense) => sum + expense.amountPaise, 0);
      bars.push({ label: date.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 2), value: total });
    }
    return bars;
  }, [expenses, period]);
  const maxBar = Math.max(...dailyBars.map((bar) => bar.value), 1);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!isUnlocked) {
    return (
      <View style={[styles.lockedScreen, { backgroundColor: colors.background, paddingTop: insets.top + 24 }]}>
        <View style={[styles.lockIcon, { backgroundColor: colors.amberSoft }]}>
          <Feather name="lock" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.navy }]}>Insights unlock after one month</Text>
        <Text style={[styles.lockText, { color: colors.mutedForeground }]}>
          Track your spending across 30 different days to see meaningful week, month and year comparisons.
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.min(usageDays / 30, 1) * 100}%` }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.tealDark }]}>{usageDays} of 30 days tracked</Text>
        <Text style={[styles.lockFootnote, { color: colors.mutedForeground }]}>
          This keeps early data from making your comparisons misleading.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.teal }]}>SPENDING PATTERNS</Text>
          <Text style={[styles.title, { color: colors.navy }]}>Insights</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>A clearer read on your money.</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}>
          <Feather name="activity" size={20} color={colors.tealDark} />
        </View>
      </View>

      <View style={[styles.periodPicker, { backgroundColor: colors.muted }]}>
        {periods.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => setPeriod(item.value)}
            style={[styles.periodButton, period === item.value && { backgroundColor: colors.card }]}
          >
            <Text style={[styles.periodText, { color: period === item.value ? colors.navy : colors.mutedForeground }]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.navy }]}>
        <Text style={styles.summaryLabel}>SPENT {periodName(period).toUpperCase()}</Text>
        <Text style={styles.summaryAmount}>{formatCurrencyFromPaise(currentTotal)}</Text>
        <View style={styles.comparisonLine}>
          <Feather name={difference <= 0 ? 'trending-down' : 'trending-up'} size={17} color={difference <= 0 ? '#8ed0ad' : '#f7bd74'} />
          <Text style={[styles.comparisonText, { color: difference <= 0 ? '#bce8ce' : '#ffd9a8' }]}>
            {difference === 0
              ? 'Same as the previous period'
              : `${formatCurrencyFromPaise(Math.abs(difference))} ${difference > 0 ? 'more' : 'less'} than before`}
          </Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.navy }]}>Last 7 days</Text>
      <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>A quick view of your daily rhythm</Text>
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.chart}>
          {dailyBars.map((bar) => (
            <View key={bar.label + bar.value} style={styles.barColumn}>
              <Text style={[styles.barValue, { color: colors.mutedForeground }]}>
                {bar.value > 0 ? formatCurrencyFromPaise(bar.value) : ''}
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { backgroundColor: colors.primary, height: `${Math.max((bar.value / maxBar) * 100, bar.value ? 10 : 3)}%` }]} />
              </View>
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{bar.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.navy, marginTop: 25 }]}>Where it goes</Text>
      <Text style={[styles.sectionCaption, { color: colors.mutedForeground }]}>Your top categories for {periodName(period)}</Text>
      <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {categoryTotals.length === 0 ? (
          <Text style={[styles.noData, { color: colors.mutedForeground }]}>No expenses in this period yet.</Text>
        ) : (
          categoryTotals.map(([category, total]) => (
            <View key={category} style={styles.categoryRow}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColors[category] }]} />
              <Text style={[styles.categoryName, { color: colors.navy }]}>{category}</Text>
              <View style={[styles.categoryProgress, { backgroundColor: colors.muted }]}>
                <View style={[styles.categoryProgressFill, { backgroundColor: categoryColors[category], width: `${(total / currentTotal) * 100}%` }]} />
              </View>
               <Text style={[styles.categoryAmount, { color: colors.navy }]}>{formatCurrencyFromPaise(total)}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.7, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, letterSpacing: -0.8 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 5 },
  headerIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  periodPicker: { flexDirection: 'row', padding: 4, borderRadius: 15, marginBottom: 20 },
  periodButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12 },
  periodText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  summaryCard: { borderRadius: 24, padding: 22, marginBottom: 26 },
  summaryLabel: { color: '#b9c5c0', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.3 },
  summaryAmount: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 38, letterSpacing: -1.2, marginTop: 10 },
  comparisonLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  comparisonText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, letterSpacing: -0.4 },
  sectionCaption: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4, marginBottom: 12 },
  chartCard: { borderWidth: 1, borderRadius: 21, padding: 16 },
  chart: { height: 170, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 8 },
  barColumn: { height: '100%', flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barValue: { height: 20, fontFamily: 'Inter_500Medium', fontSize: 9 },
  barTrack: { width: '72%', height: 112, justifyContent: 'flex-end', backgroundColor: '#f3f5f1', borderRadius: 9, overflow: 'hidden' },
  bar: { width: '100%', borderRadius: 9, minHeight: 3 },
  barLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 9 },
  categoryCard: { borderWidth: 1, borderRadius: 21, padding: 15 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', minHeight: 42 },
  categoryDot: { width: 9, height: 9, borderRadius: 5, marginRight: 8 },
  categoryName: { width: 68, fontFamily: 'Inter_500Medium', fontSize: 12 },
  categoryProgress: { flex: 1, height: 7, borderRadius: 6, overflow: 'hidden', marginHorizontal: 9 },
  categoryProgressFill: { height: '100%', borderRadius: 6 },
  categoryAmount: { width: 64, textAlign: 'right', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  noData: { fontFamily: 'Inter_400Regular', fontSize: 13, paddingVertical: 10 },
  lockedScreen: { flex: 1, paddingHorizontal: 30, alignItems: 'center' },
  lockIcon: { width: 66, height: 66, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginTop: 62, marginBottom: 20 },
  lockTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 31, textAlign: 'center', letterSpacing: -0.5 },
  lockText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, maxWidth: 310 },
  progressTrack: { width: '100%', height: 10, borderRadius: 8, overflow: 'hidden', marginTop: 29 },
  progressFill: { height: '100%', borderRadius: 8 },
  progressLabel: { fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 12 },
  lockFootnote: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 38, maxWidth: 260 },
});
