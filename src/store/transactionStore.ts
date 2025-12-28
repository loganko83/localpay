import { create } from 'zustand';
import { Transaction, TransactionType, TransactionStatus } from '../types';
import { bankAPI, BankTransactionRecord } from '../services/bankAPI';
import { useToastStore } from './toastStore';

interface TransactionFilters {
  type?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  filters: TransactionFilters;
  page: number;
  totalPages: number;
  totalElements: number;
  hasMore: boolean;

  // Basic setters
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setFilters: (filters: TransactionFilters) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getFilteredTransactions: () => Transaction[];

  // API integrations
  fetchTransactions: (userId: string, options?: {
    page?: number;
    size?: number;
    type?: 'payment' | 'charge' | 'refund' | 'all';
    append?: boolean;
  }) => Promise<void>;
  refreshTransactions: (userId: string) => Promise<void>;
  loadMoreTransactions: (userId: string) => Promise<void>;
}

// Convert bank record to Transaction type
function convertBankRecord(record: BankTransactionRecord): Transaction {
  return {
    id: record.transactionId,
    txId: record.transactionId,
    userId: record.userId,
    merchantId: record.merchantId,
    merchantName: record.merchantName || record.description || 'Unknown',
    amount: record.amount,
    type: mapBankType(record.type),
    status: mapBankStatus(record.status),
    createdAt: record.timestamp,
    approvalCode: record.approvalCode,
  };
}

function mapBankType(type: string): TransactionType {
  switch (type) {
    case 'payment': return 'payment';
    case 'charge': return 'topup';
    case 'refund': return 'refund';
    default: return 'payment';
  }
}

function mapBankStatus(status: string): TransactionStatus {
  switch (status) {
    case 'completed': return 'completed';
    case 'pending': return 'pending';
    case 'failed': return 'failed';
    case 'cancelled': return 'failed';
    default: return 'pending';
  }
}

// Mock transaction data (used when VITE_USE_MOCK_DATA is true or no userId)
const mockTransactions: Transaction[] = [
  {
    id: '1',
    txId: 'TX-2024-001',
    userId: 'user-1',
    merchantId: 'merchant-1',
    merchantName: 'Starbucks Haeundae',
    customerName: 'Customer #8291',
    amount: 12000,
    type: 'payment',
    status: 'completed',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    txId: 'TX-2024-002',
    userId: 'user-1',
    merchantId: 'merchant-2',
    merchantName: 'Olive Young',
    customerName: 'Customer #4102',
    amount: 45500,
    type: 'payment',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    txId: 'TX-2024-003',
    userId: 'user-1',
    merchantName: 'Top-up',
    amount: 100000,
    type: 'topup',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '4',
    txId: 'TX-2024-004',
    userId: 'user-1',
    merchantId: 'merchant-3',
    merchantName: 'Jeonju Metro',
    customerName: 'Customer #9931',
    amount: 8000,
    type: 'refund',
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '5',
    txId: 'TX-2024-005',
    userId: 'user-1',
    merchantName: 'Bank Transfer',
    amount: 500000,
    type: 'withdrawal',
    status: 'completed',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: mockTransactions,
  isLoading: false,
  error: null,
  filters: {},
  page: 0,
  totalPages: 1,
  totalElements: mockTransactions.length,
  hasMore: false,

  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
      totalElements: state.totalElements + 1,
    })),

  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),

  clearFilters: () => set({ filters: {} }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  getFilteredTransactions: () => {
    const { transactions, filters } = get();
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter((t) => t.type === filters.type);
    }
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.merchantName?.toLowerCase().includes(search) ||
          t.customerName?.toLowerCase().includes(search) ||
          t.txId.toLowerCase().includes(search)
      );
    }
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter((t) => new Date(t.createdAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filtered = filtered.filter((t) => new Date(t.createdAt) <= toDate);
    }

    return filtered;
  },

  /**
   * Fetch transactions from Bank API
   */
  fetchTransactions: async (userId, options = {}) => {
    const { page = 0, size = 20, type, append = false } = options;

    set({ isLoading: true, error: null });

    try {
      const response = await bankAPI.getTransactions(userId, {
        page,
        size,
        type: type || 'all',
      });

      const transactions = response.transactions.map(convertBankRecord);

      set((state) => ({
        transactions: append
          ? [...state.transactions, ...transactions]
          : transactions,
        page: response.page,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
        hasMore: response.page < response.totalPages - 1,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch transactions';
      set({ error: message, isLoading: false });
      useToastStore.getState().addToast(message, 'error');
    }
  },

  /**
   * Refresh transactions (fetch first page)
   */
  refreshTransactions: async (userId) => {
    const { filters } = get();
    const typeFilter = filters.type === 'topup' ? 'charge' :
                       filters.type === 'withdrawal' ? 'all' :
                       filters.type as 'payment' | 'charge' | 'refund' | 'all' | undefined;

    await get().fetchTransactions(userId, {
      page: 0,
      size: 20,
      type: typeFilter,
      append: false,
    });
  },

  /**
   * Load more transactions (next page)
   */
  loadMoreTransactions: async (userId) => {
    const { page, hasMore, isLoading, filters } = get();

    if (!hasMore || isLoading) return;

    const typeFilter = filters.type === 'topup' ? 'charge' :
                       filters.type === 'withdrawal' ? 'all' :
                       filters.type as 'payment' | 'charge' | 'refund' | 'all' | undefined;

    await get().fetchTransactions(userId, {
      page: page + 1,
      size: 20,
      type: typeFilter,
      append: true,
    });
  },
}));
