import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Expense } from '@/context/ExpenseContext';
import { formatCurrencyFromPaise, monthKey, monthLabel } from '@/context/ExpenseContext';

export type ExportMode = 'sheets' | 'files';

const excelMimeType = 'application/vnd.ms-excel';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cell(value: string | number, type: 'String' | 'Number' = 'String'): string {
  return `<Cell><Data ss:Type="${type}">${type === 'Number' ? value : escapeXml(String(value))}</Data></Cell>`;
}

function sheetXml(name: string, expenses: Expense[]): string {
  const rows = expenses
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (expense) =>
        `<Row>${cell(expense.date)}${cell(expense.category)}${cell(
          expense.note || '—',
        )}${cell(expense.amountPaise / 100, 'Number')}${cell(formatCurrencyFromPaise(expense.amountPaise))}</Row>`,
    )
    .join('');

  return `<Worksheet ss:Name="${escapeXml(name.slice(0, 31))}"><Table>
    <Row>${cell('Date')}${cell('Category')}${cell('Note')}${cell('Amount (₹)', 'String')}${cell('Formatted amount')}</Row>
    ${rows || `<Row>${cell('No expenses recorded')}</Row>`}
  </Table></Worksheet>`;
}

function workbookXml(expenses: Expense[], mode: ExportMode): string {
  const groups = new Map<string, Expense[]>();
  expenses.forEach((expense) => {
    const key = monthKey(expense.date);
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  });
  const orderedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  const sheets =
    mode === 'sheets'
      ? orderedGroups.map(([key, items]) => sheetXml(monthLabel(key), items)).join('')
      : sheetXml('Expenses', expenses);

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style></Styles>
 ${sheets}
</Workbook>`;
}

function downloadOnWeb(content: string, filename: string): void {
  const blob = new Blob([content], { type: excelMimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function shareNative(content: string, filename: string): Promise<void> {
  if (!FileSystem.cacheDirectory) {
    throw new Error('File storage is unavailable on this device.');
  }
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is unavailable on this device.');
  }
  await Sharing.shareAsync(uri, {
    dialogTitle: 'Export expenses',
    mimeType: excelMimeType,
    UTI: 'com.microsoft.excel.xls',
  });
}

export async function exportExpenses(expenses: Expense[], mode: ExportMode): Promise<void> {
  if (expenses.length === 0) {
    throw new Error('Add at least one expense before exporting.');
  }

  if (mode === 'sheets') {
    const content = workbookXml(expenses, mode);
    if (Platform.OS === 'web') {
      downloadOnWeb(content, 'expense-tracker.xls');
    } else {
      await shareNative(content, 'expense-tracker.xls');
    }
    return;
  }

  const groups = new Map<string, Expense[]>();
  expenses.forEach((expense) => {
    const key = monthKey(expense.date);
    groups.set(key, [...(groups.get(key) ?? []), expense]);
  });
  for (const [key, items] of Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    const content = workbookXml(items, 'files');
    const filename = `expenses-${key}.xls`;
    if (Platform.OS === 'web') {
      downloadOnWeb(content, filename);
    } else {
      await shareNative(content, filename);
    }
  }
}
