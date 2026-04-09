import { Transaction } from '@/db/insforge/schema';
import { getCategoryByName } from '@/utils/categories';
import { parseAppDate } from '@/utils/format';
import { Buffer } from 'buffer';
import { format, isValid, parse } from 'date-fns';
import iconv from 'iconv-lite';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

import {
  ImportDuplicateCandidate,
  ImportErrorRow,
  ImportPreview,
  ImportRecordKind,
  ImportSource,
  NormalizedImportRow,
  RawImportRow,
} from './types';

type ParsedCsvRow = Record<string, string | undefined>;
type SupportedEncoding = 'utf-8' | 'utf-8-sig' | 'gbk' | 'gb18030';
type ParseResult = {
  rows: NormalizedImportRow[];
  errors: ImportErrorRow[];
};

const WECHAT_HEADER_KEYWORDS = ['交易时间', '交易类型', '交易对方', '商品', '收/支', '金额(元)', '支付方式', '当前状态'];
const ALIPAY_HEADER_KEYWORDS = ['交易时间', '交易分类', '交易对方', '商品说明', '收/支', '金额', '交易状态'];

const HEADER_ALIASES = {
  wechat: {
    date: ['交易时间'],
    type: ['收/支', '收支'],
    amount: ['金额(元)', '金额'],
    counterpart: ['交易对方'],
    product: ['商品'],
    note: ['备注'],
    status: ['当前状态'],
    category: ['交易类型'],
    paymentMethod: ['支付方式'],
    transactionId: ['交易单号'],
  },
  alipay: {
    date: ['交易时间', '交易创建时间', '付款时间'],
    type: ['收/支', '收支'],
    amount: ['金额', '金额(元)', '金额（元）'],
    counterpart: ['交易对方'],
    product: ['商品说明', '商品名称'],
    note: ['备注', '说明'],
    status: ['交易状态'],
    category: ['交易分类'],
    paymentMethod: ['收/付款方式'],
    transactionId: ['交易订单号'],
  },
} as const;

const ALIPAY_CATEGORY_MAP: Record<string, string> = {
  餐饮美食: '餐饮',
  交通出行: '交通',
  日用百货: '购物',
  文化休闲: '娱乐',
  家居家装: '居家',
  生活服务: '其他',
  商业服务: '其他',
  投资理财: '投资',
  其他: '其他',
  收入: '其他',
};

const EXPENSE_CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: '餐饮', keywords: ['餐饮', '外卖', '美团', '饿了么', '奶茶', '咖啡', '早餐', '午餐', '晚餐', '螺蛳粉'] },
  { category: '交通', keywords: ['滴滴', '打车', '出行', '地铁', '公交', '高铁', '火车', '机票', '加油', '停车', '哈啰', '12306'] },
  { category: '购物', keywords: ['淘宝', '天猫', '京东', '拼多多', '超市', '便利店', '商城', '购物', '得物', '全家'] },
  { category: '居家', keywords: ['房租', '物业', '家居', '家具', '日用', '生活缴费', '宜家'] },
  { category: '娱乐', keywords: ['电影', '游戏', 'ktv', '娱乐', '门票', '演出', '音乐', '会员', '网盘'] },
  { category: '医疗', keywords: ['医院', '药店', '医疗', '诊所', '挂号'] },
  { category: '教育', keywords: ['学费', '课程', '培训', '教育', '书店', '教材'] },
  { category: '水电', keywords: ['电费', '水费', '燃气', '燃气费'] },
  { category: '通讯', keywords: ['话费', '通信', '联通', '移动', '电信', '宽带'] },
];

const INCOME_CATEGORY_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: '工资', keywords: ['工资', '薪资', '发薪'] },
  { category: '奖金', keywords: ['奖金', '分红'] },
  { category: '投资', keywords: ['投资', '理财', '收益', '基金', '股票', '余额宝'] },
  { category: '兼职', keywords: ['兼职', '劳务', '报酬', '佣金'] },
  { category: '红包', keywords: ['红包', '压岁钱', '微信红包'] },
];

function normalizeText(value: string): string {
  return value.replace(/^\uFEFF/, '').replace(/\r/g, '').trim();
}

function normalizeHeader(value: string): string {
  return normalizeText(value)
    .replace(/"/g, '')
    .replace(/\t/g, '')
    .replace(/[（）]/g, (char) => (char === '（' ? '(' : ')'))
    .replace(/\s+/g, '');
}

function sanitizeCell(value: string | number | undefined | null): string {
  return normalizeText(String(value ?? '')).replace(/^"|"$/g, '');
}

function detectImportSource(headers: string[], sampleRows: RawImportRow[]): ImportSource | null {
  const normalizedHeaders = headers.map((header) => normalizeHeader(header));
  const headerText = normalizedHeaders.join(',');
  const sampleText = sampleRows
    .slice(0, 3)
    .flatMap((row) => Object.values(row))
    .join(',');

  const wechatScore = WECHAT_HEADER_KEYWORDS.filter((keyword) => headerText.includes(normalizeHeader(keyword))).length;
  const alipayScore = ALIPAY_HEADER_KEYWORDS.filter((keyword) => headerText.includes(normalizeHeader(keyword))).length;

  if (wechatScore > alipayScore && wechatScore >= 4) {
    return 'wechat';
  }

  if (alipayScore > wechatScore && alipayScore >= 4) {
    return 'alipay';
  }

  if (sampleText.includes('微信')) return 'wechat';
  if (sampleText.includes('支付宝')) return 'alipay';

  return null;
}

function scoreDecodedCsv(text: string): number {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line) => line.includes(',') && (line.includes('交易时间') || line.includes('交易类型') || line.includes('交易分类')));
  if (headerIndex < 0) {
    return 0;
  }

  const headerLine = lines[headerIndex];
  let score = 0;
  if (headerLine.includes('交易时间')) score += 3;
  if (headerLine.includes('交易分类')) score += 3;
  if (headerLine.includes('商品说明')) score += 3;
  if (headerLine.includes('交易类型')) score += 3;
  if (headerLine.includes('金额')) score += 2;
  if (!headerLine.includes('锟') && !headerLine.includes('�')) score += 2;
  return score;
}

function decodeCsvContent(base64Content: string): string {
  const buffer = Buffer.from(base64Content, 'base64');
  const encodings: SupportedEncoding[] = ['utf-8', 'utf-8-sig', 'gbk', 'gb18030'];
  let bestText = '';
  let bestScore = -1;

  for (const encoding of encodings) {
    try {
      const text = iconv.decode(buffer, encoding);
      const score = scoreDecodedCsv(text);
      if (score > bestScore) {
        bestText = text;
        bestScore = score;
      }
    } catch {
      continue;
    }
  }

  if (!bestText || bestScore <= 0) {
    throw new Error('账单编码或内容无法识别，请确认文件来自微信或支付宝导出');
  }

  return bestText;
}

function cleanCsvInput(input: string): string {
  const lines = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const headerIndex = lines.findIndex((line) => {
    if (!line.includes(',')) {
      return false;
    }
    const normalized = line.split(',').map((part) => normalizeHeader(part));
    const wechatHits = WECHAT_HEADER_KEYWORDS.filter((keyword) => normalized.includes(normalizeHeader(keyword))).length;
    const alipayHits = ALIPAY_HEADER_KEYWORDS.filter((keyword) => normalized.includes(normalizeHeader(keyword))).length;
    return wechatHits >= 4 || alipayHits >= 4;
  });

  return headerIndex >= 0 ? lines.slice(headerIndex).join('\n') : input;
}

function parseCsvRows(input: string): RawImportRow[] {
  const result = Papa.parse<ParsedCsvRow>(cleanCsvInput(input), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => normalizeHeader(header),
  });

  return result.data.map((row) => {
    const nextRow: RawImportRow = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key === '__parsed_extra') {
        return;
      }
      nextRow[normalizeHeader(key)] = sanitizeCell(value);
    });
    return nextRow;
  });
}

function sheetToRows(workbook: XLSX.WorkBook): RawImportRow[] {
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
    header: 1,
    raw: true,
    defval: '',
  });

  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map((cell) => normalizeHeader(String(cell ?? '')));
    return WECHAT_HEADER_KEYWORDS.filter((keyword) => headers.includes(normalizeHeader(keyword))).length >= 4;
  });

  if (headerIndex < 0) {
    throw new Error('未识别到微信账单表头，请确认导出的 xlsx 文件格式正确');
  }

  const headers = matrix[headerIndex].map((cell) => normalizeHeader(String(cell ?? '')));
  return matrix.slice(headerIndex + 1).map((row) => {
    const nextRow: RawImportRow = {};
    headers.forEach((header, index) => {
      nextRow[header] = sanitizeCell(row[index]);
    });
    return nextRow;
  });
}

function getFieldValue(
  row: RawImportRow,
  source: ImportSource,
  field: keyof (typeof HEADER_ALIASES)[ImportSource]
): string {
  const aliases = HEADER_ALIASES[source][field];
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value) {
      return value;
    }
  }
  return '';
}

function getPlatformTransactionId(row: RawImportRow, source: ImportSource): string {
  return normalizeText(getFieldValue(row, source, 'transactionId')).replace(/\t/g, '');
}

function parseExcelSerialDate(value: string): string | null {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  const date = XLSX.SSF.parse_date_code(numeric);
  if (!date) {
    return null;
  }

  return format(new Date(date.y, date.m - 1, date.d, date.H, date.M, date.S), 'yyyy-MM-dd');
}

function parseImportDate(value: string): string | null {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const excelDate = parseExcelSerialDate(normalized);
    if (excelDate) {
      return excelDate;
    }
  }

  const patterns = ['yyyy-MM-dd HH:mm:ss', 'yyyy/M/d HH:mm:ss', 'yyyy-MM-dd HH:mm', 'yyyy/M/d HH:mm', 'yyyy-MM-dd'];
  for (const pattern of patterns) {
    const parsed = parse(normalized, pattern, new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  const fallback = parseAppDate(normalized);
  return isValid(fallback) ? format(fallback, 'yyyy-MM-dd') : null;
}

function getDirection(source: ImportSource, value: string): Transaction['type'] {
  const normalized = normalizeText(value);
  if (!normalized) {
    throw new Error('无法识别收支类型');
  }

  if (['支出', '付款', '转出'].some((keyword) => normalized.includes(keyword))) {
    return 'expense';
  }

  if (['收入', '收款', '转入', '退款'].some((keyword) => normalized.includes(keyword))) {
    return 'income';
  }

  if (normalized.includes('不计收支') && source === 'alipay') {
    return 'income';
  }

  if (source === 'wechat') {
    throw new Error('微信账单收支类型无法识别');
  }

  throw new Error('支付宝账单收支类型无法识别');
}

function parseAmount(value: string): number | null {
  const normalized = normalizeText(value).replace(/[¥￥元,\s]/g, '');
  if (!normalized) {
    return null;
  }

  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return Math.abs(amount);
}

function buildDescription(counterpart: string, product: string, note: string, fallbackType: string): string {
  const parts = [counterpart, product, note]
    .map((part) => normalizeText(part))
    .filter((part) => part && part !== '/');

  return parts.join(' / ') || fallbackType || '导入账单';
}

function inferRecordKind(source: ImportSource, row: RawImportRow, type: Transaction['type']): ImportRecordKind {
  const status = getFieldValue(row, source, 'status');
  const category = getFieldValue(row, source, 'category');
  const product = getFieldValue(row, source, 'product');
  const counterpart = getFieldValue(row, source, 'counterpart');
  const direction = getFieldValue(row, source, 'type');
  const haystack = [status, category, product, counterpart].join(' ');
  const lowerProduct = product.toLowerCase();
  const lowerCategory = category.toLowerCase();
  const lowerStatus = status.toLowerCase();

  if (source === 'alipay') {
    if (status.includes('交易关闭')) {
      return 'invalid';
    }

    if (haystack.includes('退款') || category === '退款' || status.includes('退款成功')) {
      return 'refund';
    }

    if (
      direction.includes('不计收支') ||
      haystack.includes('收益发放') ||
      haystack.includes('自动转入') ||
      haystack.includes('提现') ||
      haystack.includes('转存')
    ) {
      return 'neutral_transfer';
    }

    const isAccountTopUp =
      lowerProduct.includes('余额宝充值') ||
      lowerProduct.includes('支付宝充值') ||
      lowerProduct.includes('账户充值') ||
      lowerProduct.includes('充值余额') ||
      lowerCategory.includes('充值') ||
      lowerStatus.includes('充值');

    if (isAccountTopUp) {
      return 'neutral_transfer';
    }
  }

  return type === 'income' ? 'income' : 'expense';
}

function shouldSkipRecord(source: ImportSource, row: RawImportRow, kind: ImportRecordKind): string | null {
  if (kind === 'invalid') {
    return `交易状态不支持导入: ${getFieldValue(row, source, 'status')}`;
  }

  if (kind === 'neutral_transfer') {
    const product = getFieldValue(row, source, 'product');
    if (product.includes('收益发放')) {
      return '余额宝收益已跳过';
    }
    if (product.includes('自动转入')) {
      return '余额宝自动转入已跳过';
    }
    return '中性流水已跳过';
  }

  if (kind === 'fee') {
    return '平台服务费已跳过';
  }

  return null;
}

function buildStrongDedupeKey(
  source: ImportSource,
  platformTransactionId: string,
  row: Pick<NormalizedImportRow, 'date' | 'type' | 'amount' | 'description' | 'paymentMethod'>
): string {
  if (platformTransactionId) {
    return `${source}|${platformTransactionId}`;
  }

  const normalizedDescription = row.description.replace(/\s+/g, ' ').trim().toLowerCase();
  const paymentMethod = normalizeText(row.paymentMethod ?? '').toLowerCase();
  return [
    source,
    row.date,
    row.type,
    row.amount.toFixed(2),
    normalizedDescription,
    paymentMethod,
  ].join('|');
}

function resolveCategory(type: Transaction['type'], description: string, platformCategory?: string) {
  if (platformCategory) {
    const mappedCategory = ALIPAY_CATEGORY_MAP[platformCategory];
    if (mappedCategory) {
      const category = getCategoryByName(mappedCategory, type);
      return {
        category: category.name,
        category_icon: category.icon,
      };
    }
  }

  const haystack = description.toLowerCase();
  const rules = type === 'income' ? INCOME_CATEGORY_KEYWORDS : EXPENSE_CATEGORY_KEYWORDS;
  const match = rules.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())));
  const category = getCategoryByName(match?.category ?? '其他', type);

  return {
    category: category.name,
    category_icon: category.icon,
  };
}

function normalizeRow(source: ImportSource, row: RawImportRow, rowNumber: number): NormalizedImportRow {
  const date = parseImportDate(getFieldValue(row, source, 'date'));
  if (!date) {
    throw new Error('无法识别交易时间');
  }

  const type = getDirection(source, getFieldValue(row, source, 'type'));
  const amount = parseAmount(getFieldValue(row, source, 'amount'));
  if (!amount || amount <= 0) {
    throw new Error('金额无效');
  }

  const platformCategory = getFieldValue(row, source, 'category');
  const paymentMethod = getFieldValue(row, source, 'paymentMethod');
  const description = buildDescription(
    getFieldValue(row, source, 'counterpart'),
    getFieldValue(row, source, 'product'),
    getFieldValue(row, source, 'note'),
    source === 'wechat' ? '微信账单' : '支付宝账单'
  );
  const category = resolveCategory(type, description, platformCategory);
  const recordKind = inferRecordKind(source, row, type);
  const skipReason = shouldSkipRecord(source, row, recordKind);
  if (skipReason) {
    throw new Error(skipReason);
  }
  const platformTransactionId = getPlatformTransactionId(row, source);

  return {
    source,
    rowNumber,
    type,
    amount,
    date,
    description,
    category: category.category,
    category_icon: category.category_icon,
    dedupeKey: buildStrongDedupeKey(source, platformTransactionId, {
      date,
      type,
      amount,
      description,
      paymentMethod,
    }),
    platformTransactionId,
    recordKind,
    paymentMethod,
    raw: row,
  };
}

function parseRows(source: ImportSource, rows: RawImportRow[], rowOffset = 2): ParseResult {
  return rows.reduce<ParseResult>(
    (result, row, index) => {
      const hasValues = Object.values(row).some(Boolean);
      if (!hasValues) {
        return result;
      }

      try {
        result.rows.push(normalizeRow(source, row, index + rowOffset));
      } catch (error) {
        const reason = error instanceof Error ? error.message : '解析失败';
        result.errors.push({
          rowNumber: index + rowOffset,
          reason,
          kind: reason.includes('已跳过') ? 'skipped' : 'invalid',
          raw: row,
        });
      }

      return result;
    },
    { rows: [], errors: [] }
  );
}

export function parseWechatCsv(fileText: string): ParseResult {
  return parseRows('wechat', parseCsvRows(fileText));
}

export function parseAlipayCsv(fileText: string): ParseResult {
  return parseRows('alipay', parseCsvRows(fileText));
}

export function parseWechatXlsx(base64Content: string): ParseResult {
  const workbook = XLSX.read(base64Content, { type: 'base64' });
  return parseRows('wechat', sheetToRows(workbook), 17);
}

export function parseImportAsset(fileName: string, base64Content: string): ImportPreview {
  const lowerName = fileName.toLowerCase();
  const isXlsx = lowerName.endsWith('.xlsx');

  if (isXlsx) {
    const parsed = parseWechatXlsx(base64Content);
    return {
      source: 'wechat',
      fileName,
      fileType: 'xlsx',
      rows: parsed.rows,
      duplicateCandidates: [],
      errors: parsed.errors,
    };
  }

  const text = decodeCsvContent(base64Content);
  const rows = parseCsvRows(text);
  if (rows.length === 0) {
    throw new Error('文件为空，或未识别到可导入的数据行');
  }

  const source = detectImportSource(Object.keys(rows[0] ?? {}), rows);
  if (!source) {
    throw new Error('暂不支持该导出格式，请使用支付宝 CSV 或微信 XLSX 账单');
  }

  const parsed = source === 'wechat' ? parseRows('wechat', rows) : parseRows('alipay', rows);
  return {
    source,
    fileName,
    fileType: 'csv',
    rows: parsed.rows,
    duplicateCandidates: [],
    errors: parsed.errors,
  };
}

export function buildImportFingerprint(
  transaction: Pick<Transaction, 'type' | 'amount' | 'date' | 'description' | 'account_id'> & {
    dedupeKey?: string;
    platformTransactionId?: string;
    paymentMethod?: string;
    source?: ImportSource;
  }
): string {
  if (transaction.dedupeKey) {
    return [transaction.account_id, transaction.dedupeKey].join('|');
  }

  const normalizedDescription = transaction.description.replace(/\s+/g, ' ').trim().toLowerCase();
  const paymentMethod = normalizeText(transaction.paymentMethod ?? '').toLowerCase();
  return [
    transaction.account_id,
    transaction.source ?? 'import',
    transaction.date,
    transaction.type,
    transaction.amount.toFixed(2),
    normalizedDescription,
    paymentMethod,
  ].join('|');
}

export function buildWeakImportFingerprint(
  transaction: Pick<Transaction, 'type' | 'amount' | 'date' | 'description' | 'account_id'> & {
    paymentMethod?: string;
    source?: ImportSource;
  }
): string {
  const normalizedDescription = transaction.description.replace(/\s+/g, ' ').trim().toLowerCase();
  const paymentMethod = normalizeText(transaction.paymentMethod ?? '').toLowerCase();
  return [
    transaction.account_id,
    transaction.source ?? 'import',
    transaction.date,
    transaction.type,
    transaction.amount.toFixed(2),
    normalizedDescription,
    paymentMethod,
  ].join('|');
}

export function buildDuplicateCandidates(
  rows: NormalizedImportRow[],
  accountId: number,
  existingTransactions: Transaction[]
): ImportDuplicateCandidate[] {
  const existingMap = new Map(existingTransactions.map((transaction) => [buildWeakImportFingerprint(transaction), transaction.id]));
  const seenStrongFingerprints = new Set<string>();
  const seenWeakFingerprints = new Set<string>();
  const duplicates: ImportDuplicateCandidate[] = [];

  rows.forEach((row) => {
    const fingerprint = buildImportFingerprint({ ...row, account_id: accountId });
    const weakFingerprint = buildWeakImportFingerprint({ ...row, account_id: accountId });
    const matchedTransactionId = existingMap.get(weakFingerprint);

    if (matchedTransactionId || seenStrongFingerprints.has(fingerprint) || seenWeakFingerprints.has(weakFingerprint)) {
      duplicates.push({
        rowNumber: row.rowNumber,
        fingerprint,
        matchedTransactionId,
      });
    }

    seenStrongFingerprints.add(fingerprint);
    seenWeakFingerprints.add(weakFingerprint);
  });

  return duplicates;
}
