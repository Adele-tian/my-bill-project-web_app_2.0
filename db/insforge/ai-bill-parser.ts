import { insforge } from '@/db/insforge/client';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/categories';

export type ParsedBillDraft = {
  type: 'expense' | 'income';
  amount: number;
  category: string;
  description: string;
  date?: string | null;
  accountName?: string | null;
  warnings?: string[];
};

type ParseContext = {
  accountNames: string[];
};

type AIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'low' | 'high' } }
  | { type: 'input_audio'; input_audio: { data: string; format: 'wav' | 'mp3' | 'aiff' | 'aac' | 'ogg' | 'flac' | 'm4a' } };

const DEFAULT_AI_MODEL = process.env.EXPO_PUBLIC_INSFORGE_AI_MODEL?.trim() || 'openai/gpt-4o-mini';

const CATEGORY_NAMES = {
  expense: EXPENSE_CATEGORIES.map((category) => category.name),
  income: INCOME_CATEGORIES.map((category) => category.name),
};

function normalizeIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function buildPrompt(context: ParseContext): string {
  return [
    '你是一个记账助手，需要把用户输入的账单信息识别成 JSON。',
    '你必须只返回一个 JSON object，禁止输出 markdown、解释、前后缀。',
    'JSON 字段必须是：type, amount, category, description, date, accountName。',
    'type 只能是 "expense" 或 "income"。',
    'amount 必须是 number。',
    `expense 可选分类：${CATEGORY_NAMES.expense.join('、')}。`,
    `income 可选分类：${CATEGORY_NAMES.income.join('、')}。`,
    'description 使用简短中文总结这笔账。',
    'date 使用 ISO 8601 日期时间字符串；如果无法判断则返回 null。',
    context.accountNames.length > 0
      ? `accountName 如果能判断，请从这些账户名中选最匹配的一项：${context.accountNames.join('、')}；否则返回 null。`
      : 'accountName 无法判断时返回 null。',
    '如果信息不完整，也要尽量推断出最合理的记账结果。',
  ].join('\n');
}

function extractJsonObject(text: string): ParsedBillDraft {
  const trimmed = text.trim();
  const withoutFence = trimmed.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
  const firstBrace = withoutFence.indexOf('{');
  const lastBrace = withoutFence.lastIndexOf('}');
  const jsonText = firstBrace >= 0 && lastBrace >= 0 ? withoutFence.slice(firstBrace, lastBrace + 1) : withoutFence;
  const parsed = JSON.parse(jsonText) as Partial<ParsedBillDraft>;
  const warnings: string[] = [];

  if (!parsed.type || !parsed.amount || !parsed.category) {
    throw new Error('AI 返回的账单信息不完整，请重试。');
  }

  const amount = Number(parsed.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('AI 未能识别出有效金额，请重试。');
  }

  const rawType = typeof parsed.type === 'string' ? parsed.type.trim().toLowerCase() : '';
  const rawCategory = String(parsed.category).trim();
  const expenseCategoryNames: string[] = [...CATEGORY_NAMES.expense];
  const incomeCategoryNames: string[] = [...CATEGORY_NAMES.income];
  const isKnownExpenseCategory = expenseCategoryNames.includes(rawCategory);
  const isKnownIncomeCategory = incomeCategoryNames.includes(rawCategory);

  let type: 'expense' | 'income';
  if (rawType === 'expense' || rawType === 'income') {
    type = rawType;
  } else if (isKnownIncomeCategory) {
    type = 'income';
    warnings.push(`AI 返回了未识别的类型“${String(parsed.type)}”，已按收入处理。`);
  } else if (isKnownExpenseCategory) {
    type = 'expense';
    warnings.push(`AI 返回了未识别的类型“${String(parsed.type)}”，已按支出处理。`);
  } else {
    throw new Error('AI 未能识别出有效收支类型，请重试。');
  }

  const allowedCategories: string[] = [...(type === 'income' ? CATEGORY_NAMES.income : CATEGORY_NAMES.expense)];
  let category = rawCategory;
  if (!allowedCategories.includes(category)) {
    const fallbackCategory = allowedCategories.includes('其他') ? '其他' : allowedCategories[0];
    category = fallbackCategory;
    warnings.push(`AI 返回了未识别的分类“${rawCategory}”，已改为“${fallbackCategory}”，请确认。`);
  }

  const normalizedDate = normalizeIsoDate(parsed.date);
  if (parsed.date && !normalizedDate) {
    warnings.push(`AI 返回的日期“${String(parsed.date)}”无法识别，已保留当前日期。`);
  }

  return {
    type,
    amount,
    category,
    description: String(parsed.description || category),
    date: normalizedDate,
    accountName: parsed.accountName ? String(parsed.accountName) : null,
    warnings,
  };
}

async function runAiCompletion(
  content: string | AIContentPart[],
  context: ParseContext
): Promise<ParsedBillDraft> {
  const completion = await insforge.ai.chat.completions.create({
    model: DEFAULT_AI_MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: buildPrompt(context) },
      { role: 'user', content },
    ],
  });

  const output = completion?.choices?.[0]?.message?.content;
  if (typeof output !== 'string' || !output.trim()) {
    throw new Error('AI 没有返回可用结果，请稍后重试。');
  }

  return extractJsonObject(output);
}

export async function parseTextBillToDraft(text: string, context: ParseContext): Promise<ParsedBillDraft> {
  return runAiCompletion(text, context);
}

export async function parseImageBillToDraft(
  imageDataUrl: string,
  context: ParseContext
): Promise<ParsedBillDraft> {
  return runAiCompletion(
    [
      { type: 'text', text: '请识别这张账单图片中的交易信息，并整理成记账 JSON。' },
      { type: 'image_url', image_url: { url: imageDataUrl, detail: 'high' } },
    ],
    context
  );
}

export async function parseAudioBillToDraft(
  audioBase64: string,
  format: 'wav' | 'mp3' | 'aiff' | 'aac' | 'ogg' | 'flac' | 'm4a',
  context: ParseContext
): Promise<ParsedBillDraft> {
  return runAiCompletion(
    [
      { type: 'text', text: '请先识别这段语音中的记账内容，再整理成记账 JSON。' },
      { type: 'input_audio', input_audio: { data: audioBase64, format } },
    ],
    context
  );
}

export function inferBillAccountName(accountName: string | null | undefined, availableNames: string[]): string | null {
  if (!accountName) {
    return null;
  }

  const normalized = accountName.trim().toLowerCase();
  const exactMatch = availableNames.find((name) => name.toLowerCase() === normalized);
  if (exactMatch) {
    return exactMatch;
  }

  const fuzzyMatch = availableNames.find((name) => name.toLowerCase().includes(normalized) || normalized.includes(name.toLowerCase()));
  return fuzzyMatch ?? null;
}
