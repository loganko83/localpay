/**
 * Custom Error Classes for LocalPay
 */

export type BankErrorCode =
    | 'INSUFFICIENT_FUNDS'
    | 'LIMIT_EXCEEDED'
    | 'INVALID_ACCOUNT'
    | 'BANK_TIMEOUT'
    | 'UNAUTHORIZED'
    | 'SYSTEM_ERROR'
    | 'NETWORK_ERROR';

export class BankError extends Error {
    code: BankErrorCode;
    details?: any;

    constructor(message: string, code: BankErrorCode, details?: any) {
        super(message);
        this.name = 'BankError';
        this.code = code;
        this.details = details;
    }
}

export class ValidationError extends Error {
    field?: string;

    constructor(message: string, field?: string) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}
