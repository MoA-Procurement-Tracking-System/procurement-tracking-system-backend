import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/database.js';
import type { ContractStatus } from '../../generated/prisma/client.js';

// Global Excel Theme Color (ARGB Hex Code). Default: Ministry Dark Green (#0A3C2F)
export const EXCEL_THEME_COLOR = 'FF0A3C2F';

export class ExcelService {
  /**
   * Helper to style headers in template workbooks.
   */
  private styleHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]) {
    sheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(header.length + 6, 20),
    }));

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
    headerRow.height = 24;
  }

  // --- Excel Cell Validations ---

  private applyDecimalValidation(cell: ExcelJS.Cell) {
    cell.numFmt = 'ETB #,##0.00';
    cell.dataValidation = {
      type: 'decimal',
      operator: 'greaterThanOrEqual',
      formulae: ['0'],
      showErrorMessage: true,
      errorTitle: 'Invalid Amount',
      error: 'Please enter a valid positive decimal number.',
    };
  }

  private applyPercentageValidation(cell: ExcelJS.Cell) {
    cell.numFmt = '0.00%';
    cell.dataValidation = {
      type: 'decimal',
      operator: 'between',
      formulae: ['0', '1'],
      showErrorMessage: true,
      errorTitle: 'Invalid Percentage',
      error: 'Please enter a percentage value between 0% and 100%.',
    };
  }

  private applyDateValidation(cell: ExcelJS.Cell) {
    cell.numFmt = 'yyyy-mm-dd';
    cell.dataValidation = {
      type: 'date',
      operator: 'greaterThanOrEqual',
      formulae: ['1900-01-01'],
      showErrorMessage: true,
      errorTitle: 'Invalid Date',
      error: 'Please enter a valid date in YYYY-MM-DD format.',
    };
  }

  private applyActualDateValidation(cell: ExcelJS.Cell) {
    cell.numFmt = 'yyyy-mm-dd';
    cell.dataValidation = {
      type: 'date',
      operator: 'lessThanOrEqual',
      formulae: ['=TODAY()'],
      showErrorMessage: true,
      errorTitle: 'Invalid Date',
      error: 'Actual/completion date cannot be in the future.',
    };
  }

  private applyListValidation(cell: ExcelJS.Cell, options: string[]) {
    cell.dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${options.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid Selection',
      error: 'Please select an option from the dropdown list.',
    };
  }

  // ─── Template Exports ──────────────────────────────────────────────────────

  async generateActivitiesTemplate(res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Activities Upload');

    const headers = [
      'Plan ID (Required)',
      'Reference (Required)',
      'Description',
      'Category (Dropdown)',
      'Method ID (Dropdown)',
      'Estimated Budget',
      'Currency (Dropdown)',
      'Market Approach (Dropdown)',
      'Review Type (Dropdown)',
    ];

    this.styleHeaderRow(sheet, headers);

    // Fetch methods for the list validation
    const methods = await prisma.lookupValue.findMany({
      where: { type: 'PROCUREMENT_METHOD', isActive: true },
      select: { code: true },
    });
    const methodCodes = methods.map((m) => m.code);

    // Apply validations to 100 rows
    for (let r = 2; r <= 100; r++) {
      const row = sheet.getRow(r);

      // Category dropdown
      this.applyListValidation(row.getCell(4), [
        'GOODS',
        'WORKS',
        'CONSULTANCY',
        'NON_CONSULTING',
      ]);

      // Method ID dropdown
      if (methodCodes.length > 0) {
        this.applyListValidation(row.getCell(5), methodCodes);
      }

      // Estimated Budget decimal validation
      this.applyDecimalValidation(row.getCell(6));

      // Currency dropdown
      this.applyListValidation(row.getCell(7), ['ETB', 'USD', 'EUR']);

      // Market Approach dropdown
      this.applyListValidation(row.getCell(8), [
        'INTERNATIONAL',
        'NATIONAL',
        'LIMITED',
        'DIRECT',
      ]);

      // Review Type dropdown
      this.applyListValidation(row.getCell(9), ['PRIOR', 'POST']);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="activities_template.xlsx"',
    );

    await workbook.xlsx.write(res);
  }

  async generateContractsTemplate(res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Contracts Upload');

    const headers = [
      'Contract Number (Required)',
      'Activity Reference (Required)',
      'Supplier Name (Required)',
      'Total Value Net (Required)',
      'VAT Rate % (Required)',
      'Region',
      'Subcomponent',
      'Award Date',
      'Signature Date',
      'Start Date',
      'Planned End Date',
      'Actual Completion Date',
      'Status (Dropdown)',
    ];

    this.styleHeaderRow(sheet, headers);

    for (let r = 2; r <= 100; r++) {
      const row = sheet.getRow(r);

      // Decimal validation for value
      this.applyDecimalValidation(row.getCell(4));

      // Percentage validation for VAT (allow decimals like 15%)
      this.applyPercentageValidation(row.getCell(5));

      // Planning Dates (award, sig, start, planned end)
      this.applyDateValidation(row.getCell(8));
      this.applyDateValidation(row.getCell(9));
      this.applyDateValidation(row.getCell(10));
      this.applyDateValidation(row.getCell(11));

      // Actual Date validation (cannot be in the future)
      this.applyActualDateValidation(row.getCell(12));

      // Status dropdown
      this.applyListValidation(row.getCell(13), [
        'DRAFT',
        'ACTIVE',
        'COMPLETED',
        'TERMINATED',
      ]);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="contracts_template.xlsx"',
    );

    await workbook.xlsx.write(res);
  }

  async generateSuppliersTemplate(res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Suppliers Upload');

    const headers = [
      'Supplier Name (Required)',
      'TIN Number (Required)',
      'Email',
      'Phone',
      'Status (Dropdown)',
    ];

    this.styleHeaderRow(sheet, headers);

    for (let r = 2; r <= 100; r++) {
      const row = sheet.getRow(r);

      // Status dropdown
      this.applyListValidation(row.getCell(5), ['ACTIVE', 'INACTIVE']);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="suppliers_template.xlsx"',
    );

    await workbook.xlsx.write(res);
  }

  // ─── Excel Importing ───────────────────────────────────────────────────────

  async importActivities(
    filePath: string,
  ): Promise<{ created: number; updated: number }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Uploaded file contains no worksheets.');

    let created = 0;
    let updated = 0;

    const rowPromises: Promise<void>[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const planId = row.getCell(1).value?.toString().trim();
      const reference = row.getCell(2).value?.toString().trim();
      const description = row.getCell(3).value?.toString().trim();
      const methodCode = row.getCell(5).value?.toString().trim();
      const rawBudget = row.getCell(6).value;
      const currency = row.getCell(7).value?.toString().trim();
      const marketApproach = row.getCell(8).value?.toString().trim();
      const reviewType = row.getCell(9).value?.toString().trim();

      if (!planId || !reference) return;

      const p = (async () => {
        if (!methodCode) {
          throw new Error(
            `Procurement method code is required at row ${rowNumber}.`,
          );
        }

        // Resolve procurement method
        const method = await prisma.lookupValue.findUnique({
          where: {
            type_code: {
              type: 'PROCUREMENT_METHOD',
              code: methodCode,
            },
          },
        });
        if (!method)
          throw new Error(
            `Procurement method code '${methodCode}' not found at row ${rowNumber}.`,
          );

        // Check plan exists
        const plan = await prisma.plan.findUnique({
          where: { id: planId },
        });
        if (!plan)
          throw new Error(`Plan ID '${planId}' not found at row ${rowNumber}.`);

        const estimatedBudget = Number(rawBudget) || 0;

        const existing = await prisma.activity.findUnique({
          where: { reference },
        });

        if (existing) {
          await prisma.activity.update({
            where: { reference },
            data: {
              planId,
              description: description ?? null,
              procurementMethodId: method.id,
              estimatedBudget,
              currency: currency ?? null,
              marketApproach: marketApproach ?? null,
              reviewType: reviewType ?? null,
            },
          });
          updated++;
        } else {
          await prisma.activity.create({
            data: {
              planId,
              reference,
              description: description ?? null,
              procurementMethodId: method.id,
              estimatedBudget,
              currency: currency ?? null,
              marketApproach: marketApproach ?? null,
              reviewType: reviewType ?? null,
              status: 'PLANNED',
            },
          });
          created++;
        }
      })();

      rowPromises.push(p);
    });

    await Promise.all(rowPromises);
    return { created, updated };
  }

  async importContracts(
    filePath: string,
  ): Promise<{ created: number; updated: number }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Uploaded file contains no worksheets.');

    let created = 0;
    let updated = 0;

    const rowPromises: Promise<void>[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const contractNo = row.getCell(1).value?.toString().trim();
      const activityRef = row.getCell(2).value?.toString().trim();
      const supplierName = row.getCell(3).value?.toString().trim();
      const rawValue = row.getCell(4).value;
      const rawVatRate = row.getCell(5).value;
      const region = row.getCell(6).value?.toString().trim();
      const subcomponent = row.getCell(7).value?.toString().trim();

      const awardDateVal = row.getCell(8).value;
      const signatureDateVal = row.getCell(9).value;
      const startDateVal = row.getCell(10).value;
      const plannedEndDateVal = row.getCell(11).value;
      const actualCompletionDateVal = row.getCell(12).value;
      const status = row.getCell(13).value?.toString().trim();

      if (!contractNo || !activityRef || !supplierName) return;

      const p = (async () => {
        // Resolve Activity
        const activity = await prisma.activity.findUnique({
          where: { reference: activityRef },
        });
        if (!activity)
          throw new Error(
            `Activity Reference '${activityRef}' not found at row ${rowNumber}.`,
          );

        // Find or create Supplier
        let supplier = await prisma.supplier.findFirst({
          where: { name: supplierName },
        });
        if (!supplier) {
          supplier = await prisma.supplier.create({
            data: {
              name: supplierName,
              tinNumber: `AUTO-TIN-${Date.now()}-${Math.round(Math.random() * 1000)}`,
              status: 'ACTIVE',
            },
          });
        }

        const totalValue = Number(rawValue) || 0;
        // VAT Rate can be represented as percent decimal (e.g. 0.15 for 15%) or normal decimal (15)
        let vatRate = Number(rawVatRate) || 0;
        if (vatRate > 0 && vatRate < 1) {
          vatRate = vatRate * 100;
        }

        const contractAmountWithVat = totalValue * (1 + vatRate / 100);

        const parseDate = (val: unknown): Date | null => {
          if (!val) return null;
          if (val instanceof Date) return val;
          const d = new Date(val.toString());
          return isNaN(d.getTime()) ? null : d;
        };

        const awardDate = parseDate(awardDateVal);
        const signatureDate = parseDate(signatureDateVal);
        const startDate = parseDate(startDateVal);
        const plannedEndDate = parseDate(plannedEndDateVal);
        const actualCompletionDate = parseDate(actualCompletionDateVal);

        const today = new Date();
        if (actualCompletionDate && actualCompletionDate > today) {
          throw new Error(
            `Actual completion date cannot be in the future at row ${rowNumber}.`,
          );
        }

        const data = {
          activityId: activity.id,
          supplierId: supplier.id,
          totalValue,
          vatRate,
          contractAmountWithVat,
          contractNetOfVat: totalValue,
          remainingValue: contractAmountWithVat,
          region: region ?? null,
          subcomponent: subcomponent ?? null,
          awardDate: awardDate ?? null,
          signatureDate: signatureDate ?? null,
          startDate: startDate ?? null,
          plannedEndDate: plannedEndDate ?? null,
          actualCompletionDate: actualCompletionDate ?? null,
          status: (status as ContractStatus) || 'DRAFT',
        };

        const existing = await prisma.contract.findUnique({
          where: { contractNo },
        });

        if (existing) {
          await prisma.contract.update({
            where: { contractNo },
            data,
          });
          updated++;
        } else {
          await prisma.contract.create({
            data: {
              contractNo,
              ...data,
            },
          });
          created++;
        }
      })();

      rowPromises.push(p);
    });

    await Promise.all(rowPromises);
    return { created, updated };
  }

  async importSuppliers(
    filePath: string,
  ): Promise<{ created: number; updated: number }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('Uploaded file contains no worksheets.');

    let created = 0;
    let updated = 0;

    const rowPromises: Promise<void>[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const name = row.getCell(1).value?.toString().trim();
      const tinNumber = row.getCell(2).value?.toString().trim();
      const email = row.getCell(3).value?.toString().trim();
      const phone = row.getCell(4).value?.toString().trim();
      const status = row.getCell(5).value?.toString().trim();

      if (!name || !tinNumber) return;

      const p = (async () => {
        const existing = await prisma.supplier.findFirst({
          where: { OR: [{ name }, { tinNumber }] },
        });

        const data = {
          name,
          tinNumber,
          email: email ?? null,
          phone: phone ?? null,
          status: status || 'ACTIVE',
        };

        if (existing) {
          await prisma.supplier.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await prisma.supplier.create({
            data,
          });
          created++;
        }
      })();

      rowPromises.push(p);
    });

    await Promise.all(rowPromises);
    return { created, updated };
  }

  // ─── Streaming Excel workbook writer ──────────────────────────────────────
  // (Preserving this for reports usage)
  createStreamingWorkbook(res: Response, filename: string) {
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

    function addSheet(name: string, headers: string[]): ExcelJS.Worksheet {
      const sheet = workbook.addWorksheet(name);
      sheet.columns = headers.map((header) => ({
        header,
        key: header,
        width: Math.max(header.length + 4, 16),
      }));

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

    async function finalize(): Promise<void> {
      await workbook.commit();
    }

    return { workbook, addSheet, finalize };
  }

  fmtDecimal(value: unknown): string {
    if (value === null || value === undefined) return '';
    return Number(value).toFixed(2);
  }

  fmtDate(value: Date | null | undefined): string {
    if (!value) return '';
    return value.toISOString().slice(0, 10);
  }

  delayDays(
    actual: Date | null | undefined,
    target: Date | null | undefined,
  ): string {
    if (!actual || !target) return '';
    const ms = actual.getTime() - target.getTime();
    return String(Math.round(ms / 86_400_000));
  }
}

export const excelService = new ExcelService();
