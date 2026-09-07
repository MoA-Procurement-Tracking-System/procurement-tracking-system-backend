import ExcelJS from 'exceljs';

import { describe, expect, it } from 'vitest';
import { excelService } from './excel.service.js';

describe('ExcelService Import Helpers', () => {
  it('correctly extracts string from string and object cells', () => {
    const stringCell = { value: 'Test Contract' } as unknown as ExcelJS.Cell;
    const objectCell = {
      value: { result: 'Formula Result' },
    } as unknown as ExcelJS.Cell;
    const richTextCell = {
      value: { richText: [{ text: 'Rich ' }, { text: 'Text' }] },
    } as unknown as ExcelJS.Cell;
    const emptyCell = { value: null } as unknown as ExcelJS.Cell;

    expect(excelService.getCellString(stringCell)).toBe('Test Contract');
    expect(excelService.getCellString(objectCell)).toBe('Formula Result');
    expect(excelService.getCellString(richTextCell)).toBe('Rich Text');
    expect(excelService.getCellString(emptyCell)).toBe('');
  });

  it('correctly extracts numbers from numeric and formatted cells', () => {
    const numCell = { value: 1500.5 } as unknown as ExcelJS.Cell;
    const formulaCell = {
      value: { result: '25000.75' },
    } as unknown as ExcelJS.Cell;
    const formattedCell = { value: 'ETB 1,234.50' } as unknown as ExcelJS.Cell;
    const emptyCell = { value: null } as unknown as ExcelJS.Cell;

    expect(excelService.getCellNumber(numCell)).toBe(1500.5);
    expect(excelService.getCellNumber(formulaCell)).toBe(25000.75);
    expect(excelService.getCellNumber(formattedCell)).toBe(1234.5);
    expect(excelService.getCellNumber(emptyCell)).toBe(0);
  });

  it('correctly parses dates from Date objects, strings, and Excel serial numbers', () => {
    const d = new Date('2026-05-15');
    const dateCell = d;
    const stringCell = '2026-05-15';
    const excelSerial = 45792; // Approx date serial

    expect(
      excelService.parseCellDate(dateCell)?.toISOString().slice(0, 10),
    ).toBe('2026-05-15');
    expect(
      excelService.parseCellDate(stringCell)?.toISOString().slice(0, 10),
    ).toBe('2026-05-15');
    expect(excelService.parseCellDate(excelSerial)).toBeInstanceOf(Date);
    expect(excelService.parseCellDate(null)).toBeNull();
  });
});
