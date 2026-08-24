import type { Response } from 'express';
import ExcelJS from 'exceljs';

// Global Excel Theme Color (ARGB Hex Code). Default: Ministry Dark Green (#0A3C2F)
export const EXCEL_THEME_COLOR = 'FF0A3C2F';

/**
 * Creates a streaming Excel workbook writer that pipes directly to the HTTP response.
 * Never loads the full dataset into memory — each row is written and flushed immediately.
 *
 * Usage:
 *   const { workbook, addSheet, finalize } = createStreamingWorkbook(res, 'report.xlsx');
 *   const sheet = addSheet('Sheet1', ['Col A', 'Col B']);
 *   sheet.addRow(['value1', 'value2']);
 *   await finalize();
 */
export function createStreamingWorkbook(res: Response, filename: string) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Transfer-Encoding', 'chunked');

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: res,
    useStyles: true,
    useSharedStrings: false,
  });

  /**
   * Adds a worksheet with a styled header row.
   * Returns the worksheet so callers can add rows directly.
   */
  function addSheet(name: string, headers: string[]): ExcelJS.Worksheet {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 4, 16),
    }));

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXCEL_THEME_COLOR },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    headerRow.height = 22;
    headerRow.commit();

    return sheet;
  }

  /** Commits all sheets and ends the response stream. */
  async function finalize(): Promise<void> {
    await workbook.commit();
  }

  return { workbook, addSheet, finalize };
}

/** Formats a Decimal/number value as a fixed 2-decimal string, or empty string if null. */
export function fmtDecimal(value: unknown): string {
  if (value === null || value === undefined) return '';
  return Number(value).toFixed(2);
}

/** Formats a Date as YYYY-MM-DD, or empty string if null. */
export function fmtDate(value: Date | null | undefined): string {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

/** Returns delay in days between two dates (positive = late). Empty string if either is null. */
export function delayDays(
  actual: Date | null | undefined,
  target: Date | null | undefined,
): string {
  if (!actual || !target) return '';
  const ms = actual.getTime() - target.getTime();
  return String(Math.round(ms / 86_400_000));
}
