import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/database.js';
import type {
  ContractStatus,
  PaymentType,
  ProjectStatus,
  PlanStatus,
} from '../../generated/prisma/index.js';

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
      'Project',
      'Activity',
      'Supplier',
      'Region',
      'Contract Number',
      'Contract Award Date',
      'Contract Signature Date',
      'Start Date',
      'End Date',
      'Original Contract Amount',
      'Amendment',
      'Final Contract Amount',
      'Total Paid',
      'Remaining Balance',
      'Contract Status',
      'Advance',
      '1st Payment',
      '2nd Payment',
      'Final Payment',
      'Retention Payment',
      'Retention Withholding',
    ];

    this.styleHeaderRow(sheet, headers);

    for (let r = 2; r <= 100; r++) {
      const row = sheet.getRow(r);

      // Decimal validation for value
      this.applyDecimalValidation(row.getCell(10)); // Original
      this.applyDecimalValidation(row.getCell(11)); // Amendment
      this.applyDecimalValidation(row.getCell(12)); // Final
      this.applyDecimalValidation(row.getCell(13)); // Total Paid
      this.applyDecimalValidation(row.getCell(14)); // Remaining

      // Planning Dates (award, sig, start, planned end)
      this.applyDateValidation(row.getCell(6));
      this.applyDateValidation(row.getCell(7));
      this.applyDateValidation(row.getCell(8));
      this.applyDateValidation(row.getCell(9));

      // Status dropdown
      this.applyListValidation(row.getCell(15), [
        'DRAFT',
        'ACTIVE',
        'COMPLETED',
        'TERMINATED',
      ]);

      // Payment decimal validations
      this.applyDecimalValidation(row.getCell(16)); // Advance
      this.applyDecimalValidation(row.getCell(17)); // 1st
      this.applyDecimalValidation(row.getCell(18)); // 2nd
      this.applyDecimalValidation(row.getCell(19)); // Final
      this.applyDecimalValidation(row.getCell(20)); // Retention Payment
      this.applyDecimalValidation(row.getCell(21)); // Retention Withholding
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

      const activityRef = row.getCell(2).value?.toString().trim();
      const supplierName = row.getCell(3).value?.toString().trim();
      const region = row.getCell(4).value?.toString().trim();
      const contractNo = row.getCell(5).value?.toString().trim();

      const awardDateVal = row.getCell(6).value;
      const signatureDateVal = row.getCell(7).value;
      const startDateVal = row.getCell(8).value;
      const plannedEndDateVal = row.getCell(9).value;
      const rawValue = row.getCell(10).value;
      const rawFinalAmount = row.getCell(12).value;
      const status = row.getCell(15).value?.toString().trim();

      // Payments columns
      const advanceVal = row.getCell(16).value;
      const interim1Val = row.getCell(17).value;
      const interim2Val = row.getCell(18).value;
      const finalVal = row.getCell(19).value;
      const retentionPaymentVal = row.getCell(20).value;
      const retentionWithholdingVal = row.getCell(21).value;

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
        const finalValue = Number(rawFinalAmount) || totalValue;

        let vatRate = 0;
        if (totalValue > 0 && finalValue > totalValue) {
          vatRate = (finalValue / totalValue - 1) * 100;
        }

        const contractAmountWithVat = finalValue;

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

        const data = {
          activityId: activity.id,
          supplierId: supplier.id,
          totalValue,
          vatRate,
          contractAmountWithVat,
          contractNetOfVat: totalValue,
          remainingValue: contractAmountWithVat,
          region: region ?? null,
          subcomponent: null,
          awardDate: awardDate ?? null,
          signatureDate: signatureDate ?? null,
          startDate: startDate ?? null,
          plannedEndDate: plannedEndDate ?? null,
          actualCompletionDate:
            status === 'COMPLETED' ? (plannedEndDate ?? new Date()) : null,
          status: (status as ContractStatus) || 'DRAFT',
        };

        const existing = await prisma.contract.findUnique({
          where: { contractNo },
        });

        const contract = existing
          ? await prisma.contract.update({ where: { contractNo }, data })
          : await prisma.contract.create({ data: { contractNo, ...data } });

        if (existing) {
          updated++;
        } else {
          created++;
        }

        // Upsert payment helper
        const upsertPayment = async (type: PaymentType, val: unknown) => {
          const amount = Number(val) || 0;
          if (amount <= 0) return;

          const existingPayment = await prisma.payment.findFirst({
            where: {
              contractId: contract.id,
              paymentType: type,
              deletedAt: null,
            },
          });

          if (existingPayment) {
            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: { amount },
            });
          } else {
            await prisma.payment.create({
              data: {
                contractId: contract.id,
                amount,
                paymentType: type,
                paymentDate: new Date(),
                referenceNo: `IMPORT-${contract.contractNo}-${type}`,
                status: 'PAID',
              },
            });
          }
        };

        // Upsert all 6 payment types
        await Promise.all([
          upsertPayment('ADVANCE', advanceVal),
          upsertPayment('INTERIM_1', interim1Val),
          upsertPayment('INTERIM_2', interim2Val),
          upsertPayment('FINAL', finalVal),
          upsertPayment('RETENTION_PAYMENT', retentionPaymentVal),
          upsertPayment('RETENTION_WITHHOLDING', retentionWithholdingVal),
        ]);

        // Recalculate contract totals based on actual PAID payments
        const allPayments = await prisma.payment.findMany({
          where: { contractId: contract.id, deletedAt: null, status: 'PAID' },
        });
        const totalPaid = allPayments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const remainingValue =
          Number(contract.contractAmountWithVat || contract.totalValue) -
          totalPaid;

        await prisma.contract.update({
          where: { id: contract.id },
          data: {
            paidAmount: totalPaid,
            remainingValue,
          },
        });
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

  // ─── Projects & Plans Templates ────────────────────────────────────────────

  async generateProjectsTemplate(res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Projects Upload');

    const headers = [
      'Project Code (Required)',
      'Project Name (Required)',
      'SAP Identification No',
      'Country',
      'Executing Agency',
      'Organization',
      'Funding Source ID (Dropdown)',
      'Funding Type',
      'Sector ID (Dropdown)',
      'Status (Dropdown)',
    ];

    this.styleHeaderRow(sheet, headers);

    const fundingSources = await prisma.lookupValue.findMany({
      where: { type: 'FUNDING_SOURCE', isActive: true },
      select: { code: true },
    });
    const fsCodes = fundingSources.map((f) => f.code);

    const sectors = await prisma.lookupValue.findMany({
      where: { type: 'SECTOR', isActive: true },
      select: { code: true },
    });
    const sectorCodes = sectors.map((s) => s.code);

    for (let r = 2; r <= 100; r++) {
      const row = sheet.getRow(r);

      if (fsCodes.length > 0) {
        this.applyListValidation(row.getCell(7), fsCodes);
      }

      if (sectorCodes.length > 0) {
        this.applyListValidation(row.getCell(9), sectorCodes);
      }

      this.applyListValidation(row.getCell(10), [
        'ACTIVE',
        'CLOSED',
        'SUSPENDED',
      ]);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="projects_template.xlsx"',
    );

    await workbook.xlsx.write(res);
  }

  async generatePlansTemplate(res: Response): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Plans Upload');

    const headers = [
      'Project Code (Required)',
      'Plan Title (Required)',
      'Budget Year (Required)',
      'Category (Dropdown)',
      'Organization',
      'Description',
      'Period Start (Required)',
      'Period End (Required)',
      'Status (Dropdown)',
    ];

    this.styleHeaderRow(sheet, headers);

    for (let r = 2; r <= 100; r++) {
      const row = sheet.getRow(r);

      this.applyListValidation(row.getCell(4), [
        'GOODS',
        'WORKS',
        'CONSULTANCY',
        'NON_CONSULTING',
      ]);

      this.applyDateValidation(row.getCell(7));
      this.applyDateValidation(row.getCell(8));

      this.applyListValidation(row.getCell(9), [
        'DRAFT',
        'SUBMITTED',
        'COMMITTEE_REVIEW',
        'APPROVED',
        'REJECTED',
      ]);
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plans_template.xlsx"',
    );

    await workbook.xlsx.write(res);
  }

  async importProjects(
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

      const code = row.getCell(1).value?.toString().trim();
      const name = row.getCell(2).value?.toString().trim();
      const sapIdentificationNo = row.getCell(3).value?.toString().trim();
      const country = row.getCell(4).value?.toString().trim();
      const executingAgency = row.getCell(5).value?.toString().trim();
      const organization = row.getCell(6).value?.toString().trim();
      const fundingSourceCode = row.getCell(7).value?.toString().trim();
      const fundingType = row.getCell(8).value?.toString().trim();
      const sectorCode = row.getCell(9).value?.toString().trim();
      const status = row.getCell(10).value?.toString().trim();

      if (!code || !name) return;

      const p = (async () => {
        if (!fundingSourceCode)
          throw new Error(
            `Funding source code is required at row ${rowNumber}.`,
          );
        const fsLookup = await prisma.lookupValue.findUnique({
          where: {
            type_code: { type: 'FUNDING_SOURCE', code: fundingSourceCode },
          },
        });
        if (!fsLookup)
          throw new Error(
            `Funding source code '${fundingSourceCode}' not found at row ${rowNumber}.`,
          );

        if (!sectorCode)
          throw new Error(`Sector code is required at row ${rowNumber}.`);
        const sectorLookup = await prisma.lookupValue.findUnique({
          where: { type_code: { type: 'SECTOR', code: sectorCode } },
        });
        if (!sectorLookup)
          throw new Error(
            `Sector code '${sectorCode}' not found at row ${rowNumber}.`,
          );

        const data = {
          name,
          sapIdentificationNo: sapIdentificationNo ?? null,
          country: country ?? null,
          executingAgency: executingAgency ?? null,
          organization: organization ?? null,
          fundingSourceId: fsLookup.id,
          fundingType: fundingType ?? null,
          sectorId: sectorLookup.id,
          status: (status as ProjectStatus) || 'ACTIVE',
        };

        const existing = await prisma.project.findUnique({
          where: { code },
        });

        if (existing) {
          await prisma.project.update({
            where: { code },
            data,
          });
          updated++;
        } else {
          await prisma.project.create({
            data: {
              code,
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

  async importPlans(
    filePath: string,
    creatorId: string,
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

      const projectCode = row.getCell(1).value?.toString().trim();
      const title = row.getCell(2).value?.toString().trim();
      const budgetYear = row.getCell(3).value?.toString().trim();
      const category = row.getCell(4).value?.toString().trim();
      const organization = row.getCell(5).value?.toString().trim();
      const description = row.getCell(6).value?.toString().trim();
      const periodStartVal = row.getCell(7).value;
      const periodEndVal = row.getCell(8).value;
      const status = row.getCell(9).value?.toString().trim();

      if (!projectCode || !title) return;

      const p = (async () => {
        const project = await prisma.project.findUnique({
          where: { code: projectCode },
        });
        if (!project)
          throw new Error(
            `Project Code '${projectCode}' not found at row ${rowNumber}.`,
          );

        const parseDate = (val: unknown): Date | null => {
          if (!val) return null;
          if (val instanceof Date) return val;
          const d = new Date(val.toString());
          return isNaN(d.getTime()) ? null : d;
        };

        const periodStart = parseDate(periodStartVal);
        const periodEnd = parseDate(periodEndVal);

        if (!periodStart || !periodEnd) {
          throw new Error(
            `Period Start and Period End are required and must be valid dates at row ${rowNumber}.`,
          );
        }

        const data = {
          projectId: project.id,
          title,
          budgetYear: budgetYear ?? null,
          procurementCategory: category ?? null,
          organization: organization ?? null,
          description: description ?? null,
          periodStart,
          periodEnd,
          status: (status as PlanStatus) || 'DRAFT',
          createdBy: creatorId,
        };

        const existing = await prisma.plan.findFirst({
          where: {
            projectId: project.id,
            title,
            budgetYear: budgetYear ?? null,
            isActive: true,
          },
        });

        if (existing) {
          await prisma.plan.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await prisma.plan.create({
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
}

export const excelService = new ExcelService();
