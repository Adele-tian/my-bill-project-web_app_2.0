import { Transaction } from '@/db/insforge/schema';

export type ImportSource = 'wechat' | 'alipay';

export type RawImportRow = Record<string, string>;
export type ImportRecordKind = 'expense' | 'income' | 'refund' | 'neutral_transfer' | 'fee' | 'invalid';

export interface NormalizedImportRow {
  source: ImportSource;
  rowNumber: number;
  type: Transaction['type'];
  amount: number;
  date: string;
  description: string;
  category: string;
  category_icon: string;
  dedupeKey?: string;
  platformTransactionId?: string;
  recordKind?: ImportRecordKind;
  paymentMethod?: string;
  raw: RawImportRow;
}

export interface ImportErrorRow {
  rowNumber: number;
  reason: string;
  kind?: 'skipped' | 'invalid';
  raw: RawImportRow;
}

export interface ImportDuplicateCandidate {
  rowNumber: number;
  fingerprint: string;
  matchedTransactionId?: number;
}

export interface ImportPreview {
  source: ImportSource;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  rows: NormalizedImportRow[];
  duplicateCandidates: ImportDuplicateCandidate[];
  errors: ImportErrorRow[];
}
