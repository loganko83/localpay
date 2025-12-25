import { create } from 'zustand';
import { Transaction, TransactionType, TransactionStatus } from '../types';

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

  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  setFilters: (filters: TransactionFilters) => void;
  clearFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getFilteredTransactions: () => Transaction[];
}

// Mock transaction data
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

  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
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

    return filtered;
  },
}));
