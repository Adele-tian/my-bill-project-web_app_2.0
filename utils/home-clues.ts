type HomeEmotion = {
  emoji: string;
  label: string;
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

const CATEGORY_EMOTION_MAP: Record<string, HomeEmotion> = {
  餐饮: { emoji: '🍜', label: '上头了' },
  娱乐: { emoji: '🎮', label: '超开心' },
  红包: { emoji: '🧧', label: '好兆头' },
  购物: { emoji: '🛍️', label: '超满足' },
  居家: { emoji: '🏡', label: '稳稳的' },
  通讯: { emoji: '📱', label: '安排好' },
  交通: { emoji: '🚌', label: '在路上' },
  水电: { emoji: '⚡', label: '必要呀' },
  医疗: { emoji: '🩺', label: '照顾好自己' },
  教育: { emoji: '📚', label: '在投入' },
  工资: { emoji: '💼', label: '有收获' },
  奖金: { emoji: '🎉', label: '真不错' },
  投资: { emoji: '📈', label: '有盼头' },
  兼职: { emoji: '✨', label: '又进步了' },
  其他: { emoji: '🌿', label: '慢慢来' },
};

export function getHomeHeadline(index = 0): string {
  return DEFAULT_HEADLINES[index] ?? DEFAULT_HEADLINES[0];
}

export function getHomeCategoryCopy(category: string): string {
  return CATEGORY_COPY_MAP[category] ?? '日常线索';
}

export function getHomeEmotion(category: string): HomeEmotion {
  return CATEGORY_EMOTION_MAP[category] ?? { emoji: '🌿', label: '慢慢来' };
}
