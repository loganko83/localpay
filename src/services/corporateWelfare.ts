/**
 * Corporate Welfare Service
 *
 * B2B welfare system for companies to distribute local currency
 * to employees as welfare benefits.
 *
 * Features:
 * - Bulk point distribution
 * - Department budget management
 * - Usage report generation
 * - Tax document automation
 *
 * Based on: Ulsan Pay corporate welfare model
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Company accounts, distributions (in-memory)
 * - [REAL] Tax calculation formulas (Korean tax law)
 * - [INTEGRATION READY] HR systems, accounting software
 */

import { auditLogService } from './auditLog';

// ============================================
// [REAL] Korean tax regulations for welfare benefits
// ============================================
const TAX_CONFIG = {
  // Welfare benefits are tax-free up to certain limits
  taxFreeAnnualLimit: 1200000,     // [REAL] 1.2M KRW/year tax-free per employee
  mealAllowanceLimit: 200000,      // [REAL] 200K KRW/month tax-free meal
  cultureExpenseLimit: 100000,     // [REAL] 100K KRW/month culture expense
  // Over limit: taxed as additional income
  incomeTaxRate: 0.066,            // [REAL] Approximate combined rate
};

// Welfare categories
type WelfareCategory =
  | 'MEAL_ALLOWANCE'      // Meal/food expenses
  | 'CULTURE_EXPENSE'     // Books, movies, performances
  | 'HEALTH_WELLNESS'     // Gym, health checkup
  | 'FAMILY_CARE'         // Childcare, elderly care
  | 'SELF_DEVELOPMENT'    // Education, training
  | 'GENERAL_WELFARE';    // General welfare points

// Company account
interface CompanyAccount {
  id: string;
  companyName: string;
  businessNumber: string;         // 사업자등록번호
  adminUserId: string;
  totalBudget: number;
  usedBudget: number;
  departments: Department[];
  employees: EmployeeWelfare[];
  createdAt: number;
  fiscalYearStart: number;        // Fiscal year start month (1-12)
}

// Department
interface Department {
  id: string;
  name: string;
  budget: number;
  usedBudget: number;
  employeeCount: number;
}

// Employee welfare account
interface EmployeeWelfare {
  id: string;
  companyId: string;
  departmentId: string;
  employeeId: string;
  employeeName: string;
  balances: Record<WelfareCategory, number>;
  annualReceived: number;         // For tax calculation
  annualUsed: number;
  distributions: DistributionRecord[];
  usageHistory: UsageRecord[];
}

// Distribution record
interface DistributionRecord {
  id: string;
  timestamp: number;
  category: WelfareCategory;
  amount: number;
  distributedBy: string;
  note?: string;
}

// Usage record
interface UsageRecord {
  id: string;
  timestamp: number;
  category: WelfareCategory;
  amount: number;
  merchantId: string;
  merchantName: string;
  transactionId: string;
}

// Distribution batch
interface DistributionBatch {
  id: string;
  companyId: string;
  departmentId?: string;          // If null, company-wide
  category: WelfareCategory;
  amountPerEmployee: number;
  totalAmount: number;
  recipientCount: number;
  executedAt: number;
  executedBy: string;
  note?: string;
}

// Usage report
interface WelfareUsageReport {
  companyId: string;
  period: { start: string; end: string };
  totalDistributed: number;
  totalUsed: number;
  utilizationRate: number;
  byCategory: Record<WelfareCategory, { distributed: number; used: number }>;
  byDepartment: Array<{ departmentId: string; name: string; distributed: number; used: number }>;
  taxSummary: {
    taxFreeAmount: number;
    taxableAmount: number;
    estimatedTax: number;
  };
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const companyStore = new Map<string, CompanyAccount>();
const batchStore = new Map<string, DistributionBatch>();

// Generate IDs
const generateCompanyId = (): string => `CORP-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateDistributionId = (): string => `DIST-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateBatchId = (): string => `BATCH-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

class CorporateWelfareService {
  /**
   * [MOCK] Register company for welfare program
   */
  async registerCompany(params: {
    companyName: string;
    businessNumber: string;
    adminUserId: string;
    initialBudget: number;
    fiscalYearStart?: number;
  }): Promise<CompanyAccount> {
    const company: CompanyAccount = {
      id: generateCompanyId(),
      companyName: params.companyName,
      businessNumber: params.businessNumber,
      adminUserId: params.adminUserId,
      totalBudget: params.initialBudget,
      usedBudget: 0,
      departments: [],
      employees: [],
      createdAt: Date.now(),
      fiscalYearStart: params.fiscalYearStart || 1,
    };

    companyStore.set(company.id, company);

    await auditLogService.log({
      action: 'MERCHANT_REGISTERED',
      actorId: params.adminUserId,
      actorType: 'admin',
      targetType: 'corporate_account',
      targetId: company.id,
      metadata: {
        companyName: params.companyName,
        initialBudget: params.initialBudget,
      },
    });

    return company;
  }

  /**
   * Add department to company
   */
  addDepartment(companyId: string, params: {
    name: string;
    budget: number;
  }): Department | null {
    const company = companyStore.get(companyId);
    if (!company) return null;

    const department: Department = {
      id: `DEPT-${Date.now().toString(36)}`,
      name: params.name,
      budget: params.budget,
      usedBudget: 0,
      employeeCount: 0,
    };

    company.departments.push(department);
    companyStore.set(companyId, company);

    return department;
  }

  /**
   * Add employee to welfare program
   */
  addEmployee(companyId: string, params: {
    departmentId: string;
    employeeId: string;
    employeeName: string;
  }): EmployeeWelfare | null {
    const company = companyStore.get(companyId);
    if (!company) return null;

    const dept = company.departments.find(d => d.id === params.departmentId);
    if (!dept) return null;

    const employee: EmployeeWelfare = {
      id: `EMP-${Date.now().toString(36)}`,
      companyId,
      departmentId: params.departmentId,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      balances: {
        MEAL_ALLOWANCE: 0,
        CULTURE_EXPENSE: 0,
        HEALTH_WELLNESS: 0,
        FAMILY_CARE: 0,
        SELF_DEVELOPMENT: 0,
        GENERAL_WELFARE: 0,
      },
      annualReceived: 0,
      annualUsed: 0,
      distributions: [],
      usageHistory: [],
    };

    company.employees.push(employee);
    dept.employeeCount++;
    companyStore.set(companyId, company);

    return employee;
  }

  /**
   * [MOCK] Bulk distribute welfare points
   */
  async bulkDistribute(params: {
    companyId: string;
    departmentId?: string;
    category: WelfareCategory;
    amountPerEmployee: number;
    executedBy: string;
    note?: string;
  }): Promise<DistributionBatch | null> {
    const company = companyStore.get(params.companyId);
    if (!company) return null;

    // Filter employees by department if specified
    let targetEmployees = company.employees;
    if (params.departmentId) {
      targetEmployees = company.employees.filter(e => e.departmentId === params.departmentId);
    }

    if (targetEmployees.length === 0) return null;

    const totalAmount = params.amountPerEmployee * targetEmployees.length;

    // Check budget
    if (company.usedBudget + totalAmount > company.totalBudget) {
      console.warn('[CorporateWelfare] Insufficient budget');
      return null;
    }

    // Distribute to each employee
    for (const employee of targetEmployees) {
      employee.balances[params.category] += params.amountPerEmployee;
      employee.annualReceived += params.amountPerEmployee;

      employee.distributions.push({
        id: generateDistributionId(),
        timestamp: Date.now(),
        category: params.category,
        amount: params.amountPerEmployee,
        distributedBy: params.executedBy,
        note: params.note,
      });
    }

    company.usedBudget += totalAmount;

    // Update department budget if applicable
    if (params.departmentId) {
      const dept = company.departments.find(d => d.id === params.departmentId);
      if (dept) {
        dept.usedBudget += totalAmount;
      }
    }

    companyStore.set(params.companyId, company);

    const batch: DistributionBatch = {
      id: generateBatchId(),
      companyId: params.companyId,
      departmentId: params.departmentId,
      category: params.category,
      amountPerEmployee: params.amountPerEmployee,
      totalAmount,
      recipientCount: targetEmployees.length,
      executedAt: Date.now(),
      executedBy: params.executedBy,
      note: params.note,
    };

    batchStore.set(batch.id, batch);

    await auditLogService.log({
      action: 'VOUCHER_CREATED',
      actorId: params.executedBy,
      actorType: 'admin',
      targetType: 'welfare_distribution',
      targetId: batch.id,
      metadata: {
        companyId: params.companyId,
        category: params.category,
        amountPerEmployee: params.amountPerEmployee,
        recipientCount: targetEmployees.length,
        totalAmount,
      },
    });

    return batch;
  }

  /**
   * [MOCK] Record welfare usage
   */
  async recordUsage(params: {
    companyId: string;
    employeeId: string;
    category: WelfareCategory;
    amount: number;
    merchantId: string;
    merchantName: string;
    transactionId: string;
  }): Promise<boolean> {
    const company = companyStore.get(params.companyId);
    if (!company) return false;

    const employee = company.employees.find(e => e.employeeId === params.employeeId);
    if (!employee) return false;

    if (employee.balances[params.category] < params.amount) {
      return false; // Insufficient balance
    }

    employee.balances[params.category] -= params.amount;
    employee.annualUsed += params.amount;

    employee.usageHistory.push({
      id: `USE-${Date.now().toString(36)}`,
      timestamp: Date.now(),
      category: params.category,
      amount: params.amount,
      merchantId: params.merchantId,
      merchantName: params.merchantName,
      transactionId: params.transactionId,
    });

    companyStore.set(params.companyId, company);
    return true;
  }

  /**
   * [REAL TAX FORMULA] Generate usage report with tax calculation
   */
  generateUsageReport(companyId: string, startDate: string, endDate: string): WelfareUsageReport | null {
    const company = companyStore.get(companyId);
    if (!company) return null;

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();

    const byCategory: Record<WelfareCategory, { distributed: number; used: number }> = {
      MEAL_ALLOWANCE: { distributed: 0, used: 0 },
      CULTURE_EXPENSE: { distributed: 0, used: 0 },
      HEALTH_WELLNESS: { distributed: 0, used: 0 },
      FAMILY_CARE: { distributed: 0, used: 0 },
      SELF_DEVELOPMENT: { distributed: 0, used: 0 },
      GENERAL_WELFARE: { distributed: 0, used: 0 },
    };

    const byDepartment: Array<{ departmentId: string; name: string; distributed: number; used: number }> = [];

    let totalDistributed = 0;
    let totalUsed = 0;
    let totalTaxable = 0;

    for (const dept of company.departments) {
      const deptEmployees = company.employees.filter(e => e.departmentId === dept.id);
      let deptDistributed = 0;
      let deptUsed = 0;

      for (const emp of deptEmployees) {
        // Filter by date range
        const periodDistributions = emp.distributions.filter(
          d => d.timestamp >= startTs && d.timestamp <= endTs
        );
        const periodUsage = emp.usageHistory.filter(
          u => u.timestamp >= startTs && u.timestamp <= endTs
        );

        for (const dist of periodDistributions) {
          byCategory[dist.category].distributed += dist.amount;
          totalDistributed += dist.amount;
          deptDistributed += dist.amount;
        }

        for (const usage of periodUsage) {
          byCategory[usage.category].used += usage.amount;
          totalUsed += usage.amount;
          deptUsed += usage.amount;
        }

        // [REAL] Calculate taxable amount per employee
        const empAnnualTotal = emp.annualReceived;
        if (empAnnualTotal > TAX_CONFIG.taxFreeAnnualLimit) {
          totalTaxable += empAnnualTotal - TAX_CONFIG.taxFreeAnnualLimit;
        }
      }

      byDepartment.push({
        departmentId: dept.id,
        name: dept.name,
        distributed: deptDistributed,
        used: deptUsed,
      });
    }

    const taxFreeAmount = Math.min(totalDistributed, TAX_CONFIG.taxFreeAnnualLimit * company.employees.length);
    const taxableAmount = Math.max(0, totalDistributed - taxFreeAmount);
    const estimatedTax = Math.floor(taxableAmount * TAX_CONFIG.incomeTaxRate);

    return {
      companyId,
      period: { start: startDate, end: endDate },
      totalDistributed,
      totalUsed,
      utilizationRate: totalDistributed > 0 ? Math.round((totalUsed / totalDistributed) * 100) / 100 : 0,
      byCategory,
      byDepartment,
      taxSummary: {
        taxFreeAmount,
        taxableAmount,
        estimatedTax,
      },
    };
  }

  /**
   * Get employee welfare balance
   */
  getEmployeeBalance(companyId: string, employeeId: string): EmployeeWelfare | null {
    const company = companyStore.get(companyId);
    if (!company) return null;

    return company.employees.find(e => e.employeeId === employeeId) || null;
  }

  /**
   * Get company summary
   */
  getCompanySummary(companyId: string): {
    company: CompanyAccount | null;
    budgetUtilization: number;
    employeeCount: number;
    departmentCount: number;
  } {
    const company = companyStore.get(companyId);
    if (!company) {
      return {
        company: null,
        budgetUtilization: 0,
        employeeCount: 0,
        departmentCount: 0,
      };
    }

    return {
      company,
      budgetUtilization: company.totalBudget > 0
        ? Math.round((company.usedBudget / company.totalBudget) * 100) / 100
        : 0,
      employeeCount: company.employees.length,
      departmentCount: company.departments.length,
    };
  }

  /**
   * Get tax configuration (for display)
   */
  getTaxConfig(): typeof TAX_CONFIG {
    return { ...TAX_CONFIG };
  }
}

// Export singleton
export const corporateWelfareService = new CorporateWelfareService();

// Export types
export type {
  CompanyAccount,
  Department,
  EmployeeWelfare,
  DistributionBatch,
  WelfareUsageReport,
  WelfareCategory,
};
