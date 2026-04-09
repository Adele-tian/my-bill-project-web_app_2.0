export type EmotionKey = 'super_happy' | 'impulsive' | 'lesson_learned';

type HomeEmotion = {
  emoji: string;
  label: string;
  key?: EmotionKey;
};

type TransactionEmotionContext = {
  description: string;
};

const DEFAULT_HEADLINES = [
  '我们每时每刻都在栽培着自己的未来',
];

const CATEGORY_COPY_MAP: Record<string, string> = {
  餐饮: '弹性支出',
  娱乐: '弹性支出',
  红包: '弹性支出',
  购物: '生活所需',
  居家: '生活所需',
  通讯: '生活所需',
  交通: '日常支出',
  水电: '固定支出',
  医疗: '必要支出',
  教育: '成长投入',
  工资: '稳定收入',
  奖金: '额外收入',
  投资: '资产增长',
  兼职: '主动收入',
  其他: '日常线索',
};

const EMOTION_META: Record<EmotionKey, HomeEmotion> = {
  super_happy: { key: 'super_happy', emoji: '🥰', label: '超满足' },
  impulsive: { key: 'impulsive', emoji: '🤯', label: '上头了' },
  lesson_learned: { key: 'lesson_learned', emoji: '🤡', label: '买教训' },
};
const DEFAULT_EMOTION_KEYS: EmotionKey[] = ['super_happy', 'impulsive', 'lesson_learned'];

const EMOTION_PATTERN = /\[emotion:(super_happy|impulsive|lesson_learned)\]\s*/;

export function getHomeHeadline(index = 0): string {
  return DEFAULT_HEADLINES[index] ?? DEFAULT_HEADLINES[0];
}

export function getHomeCategoryCopy(category: string): string {
  return CATEGORY_COPY_MAP[category] ?? '日常线索';
}

export function getEmotionMeta(emotionKey: EmotionKey): HomeEmotion {
  return EMOTION_META[emotionKey];
}

export function parseEmotionFromDescription(description: string): EmotionKey | null {
  const match = description.match(EMOTION_PATTERN);
  return (match?.[1] as EmotionKey | undefined) ?? null;
}

export function stripEmotionFromDescription(description: string): string {
  return description.replace(EMOTION_PATTERN, '').trim();
}

export function buildDescriptionWithEmotion(rawDescription: string, emotion: EmotionKey | null): string {
  const cleanDescription = stripEmotionFromDescription(rawDescription);
  if (!emotion) {
    return cleanDescription;
  }

  const marker = `[emotion:${emotion}]`;
  return cleanDescription ? `${marker} ${cleanDescription}` : marker;
}

export function getEmotionHistory(transactions: TransactionEmotionContext[]): EmotionKey[] {
  return transactions.flatMap((transaction) => {
    const emotion = parseEmotionFromDescription(transaction.description);
    return emotion ? [emotion] : [];
  });
}

export function getRandomEmotion(candidates: EmotionKey[] = []): HomeEmotion {
  const pool = candidates.length > 0 ? candidates : DEFAULT_EMOTION_KEYS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return getEmotionMeta(pool[randomIndex]);
}

export function getHomeEmotion(
  transaction: TransactionEmotionContext,
  transactions: TransactionEmotionContext[] = []
): HomeEmotion {
  const explicitEmotion = parseEmotionFromDescription(transaction.description);
  if (explicitEmotion) {
    return getEmotionMeta(explicitEmotion);
  }

  return getRandomEmotion(getEmotionHistory(transactions));
}
