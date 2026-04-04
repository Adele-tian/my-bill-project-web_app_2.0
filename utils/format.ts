import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化货币金额
 */
export function formatCurrency(amount: number, showSign = false): string {
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  if (showSign) {
    return amount >= 0 ? `+¥${formatted}` : `-¥${formatted}`;
  }
  return `¥${formatted}`;
}

/**
 * 解析应用内保存的日期字符串。
 * 对 yyyy-MM-dd 使用本地时区解析，避免 new Date(dateOnly) 带来的 UTC 偏移。
 */
export function parseAppDate(dateString: string): Date {
  return parseISO(dateString);
}

/**
 * 格式化交易金额（带符号）
 */
export function formatTransactionAmount(amount: number, type: 'income' | 'expense'): string {
  const formatted = Math.abs(amount).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return type === 'income' ? `+${formatted}` : `-${formatted}`;
}

/**
 * 格式化日期
 */
export function formatDate(dateString: string, formatStr = 'MM月dd日'): string {
  try {
    const date = parseAppDate(dateString);
    return format(date, formatStr, { locale: zhCN });
  } catch {
    return dateString;
  }
}

/**
 * 格式化相对日期
 */
export function formatRelativeDate(dateString: string): string {
  try {
    const date = parseAppDate(dateString);
    if (isToday(date)) return '今天';
    if (isYesterday(date)) return '昨天';
    return format(date, 'MM月dd日', { locale: zhCN });
  } catch {
    return dateString;
  }
}

/**
 * 格式化距今时间
 */
export function formatTimeAgo(dateString: string): string {
  try {
    const date = parseAppDate(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
  } catch {
    return dateString;
  }
}

/**
 * 获取当前日期字符串
 */
export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * 格式化完整日期时间
 */
export function formatDateTime(dateString: string): string {
  try {
    const date = parseAppDate(dateString);
    return format(date, 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
  } catch {
    return dateString;
  }
}
