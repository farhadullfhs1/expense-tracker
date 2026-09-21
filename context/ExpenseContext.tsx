import * as SQLite from 'expo-sqlite';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { z } from 'zod';

export const expenseCategories = [
  'Food',
  'Travel',
  'Shopping',
  'Bills',
  'Health',
  'Other',
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export type Expense = {
  id: string;
  amountPaise: number;
  category: ExpenseCategory;
  note: string;
  date: string;
  createdAt: string;
  updatedAt: string;
};

type ExpenseInput = {
  amountPaise: number;
  category: ExpenseCategory;
  note: string;
  date?: Date;
};

type ExpenseContextValue = {
  expenses: Expense[];
  isLoading: boolean;
  usageDays: number;
  isUnlocked: boolean;
  addExpense: (input: ExpenseInput) => Promise<void>;
  updateExpense: (id: string, input: ExpenseInput) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
};

const expenseSchema = z.object({
  id: z.string().min(1),
  amountPaise: z.number().int().positive().max(100_000_000),
  category: z.enum(expenseCategories),
  note: z.string().max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const ExpenseContext = createContext<ExpenseContextValue | null>(null);

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDayKey(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);

  if (
    !Number.isFinite(date.getTime()) ||
    dayKey(date) !== value
  ) {
    throw new Error('Invalid expense date');
  }

  return date;
}

export function formatCurrencyFromPaise(value: number): string {
  return `\u20B9${(value / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export function formatCurrency(value: number): string {
  return formatCurrencyFromPaise(Math.round(value * 100));
}

export function sumExpensePaise(expenses: Expense[]): number {
  return expenses.reduce(
    (sum, expense) => sum + expense.amountPaise,
    0,
  );
}

export function formatDate(value: string): string {
  return parseDayKey(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

export function monthKey(value: string): string {
  return value.slice(0, 7);
}

export function monthLabel(value: string): string {
  const [year, month] = value.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function rowToExpense(
  row: Record<string, unknown>,
): Expense | null {
  const parsed = expenseSchema.safeParse(row);

  return parsed.success ? parsed.data : null;
}

export function ExpenseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Database is initialized asynchronously.
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      // IMPORTANT:
      // Use the async SQLite initialization path for web.
      const database = await SQLite.openDatabaseAsync(
        'expense-tracker-v2.db',
      );

      if (!active) {
        await database.closeAsync();
        return;
      }

      setDb(database);

      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY NOT NULL,
          amountPaise INTEGER NOT NULL CHECK(amountPaise > 0),
          category TEXT NOT NULL,
          note TEXT NOT NULL,
          date TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS expenses_by_date
        ON expenses(date DESC);
      `);

      const rows = await database.getAllAsync<
        Record<string, unknown>
      >(
        'SELECT * FROM expenses ORDER BY date DESC, createdAt DESC',
      );

      if (active) {
        setExpenses(
          rows
            .map(rowToExpense)
            .filter(
              (item): item is Expense => item !== null,
            ),
        );
      }
    })()
      .catch(() => {
        if (active) {
          setExpenses([]);
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ExpenseContextValue>(() => {
    const usageDays = new Set(
      expenses.map((expense) => expense.date),
    ).size;

    const save = async (
      id: string,
      input: ExpenseInput,
      createdAt?: string,
    ) => {
      if (!db) {
        throw new Error('Database is not initialized');
      }

      const now = new Date().toISOString();

      const expense = expenseSchema.parse({
        id,
        amountPaise: input.amountPaise,
        category: input.category,
        note: input.note.trim(),
        date: dayKey(input.date ?? new Date()),
        createdAt: createdAt ?? now,
        updatedAt: now,
      });

      await db.runAsync(
        `INSERT INTO expenses (
          id,
          amountPaise,
          category,
          note,
          date,
          createdAt,
          updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          amountPaise = excluded.amountPaise,
          category = excluded.category,
          note = excluded.note,
          date = excluded.date,
          updatedAt = excluded.updatedAt`,
        expense.id,
        expense.amountPaise,
        expense.category,
        expense.note,
        expense.date,
        expense.createdAt,
        expense.updatedAt,
      );

      setExpenses((current) =>
        [
          expense,
          ...current.filter((item) => item.id !== id),
        ].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
      );
    };

    const addExpense = async (input: ExpenseInput) => {
      await save(makeId(), input);
    };

    const updateExpense = async (
      id: string,
      input: ExpenseInput,
    ) => {
      await save(
        id,
        input,
        expenses.find((item) => item.id === id)?.createdAt,
      );
    };

    const deleteExpense = async (id: string) => {
      if (!db) {
        throw new Error('Database is not initialized');
      }

      await db.runAsync(
        'DELETE FROM expenses WHERE id = ?',
        id,
      );

      setExpenses((current) =>
        current.filter((item) => item.id !== id),
      );
    };

    return {
      expenses,
      isLoading,
      usageDays,
      isUnlocked: usageDays >= 30,
      addExpense,
      updateExpense,
      deleteExpense,
    };
  }, [expenses, isLoading, db]);

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses(): ExpenseContextValue {
  const context = useContext(ExpenseContext);

  if (!context) {
    throw new Error(
      'useExpenses must be used inside ExpenseProvider',
    );
  }

  return context;
}