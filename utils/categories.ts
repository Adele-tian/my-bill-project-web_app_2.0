import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// 支出类别配置
export const EXPENSE_CATEGORIES = [
  { name: '餐饮', icon: 'utensils', color: '#F472B6' },
  { name: '交通', icon: 'car', color: '#60A5FA' },
  { name: '购物', icon: 'shopping-bag', color: '#FBBF24' },
  { name: '居家', icon: 'home', color: '#34D399' },
  { name: '娱乐', icon: 'gamepad-2', color: '#A78BFA' },
  { name: '医疗', icon: 'heart-pulse', color: '#F87171' },
  { name: '教育', icon: 'graduation-cap', color: '#38BDF8' },
  { name: '水电', icon: 'zap', color: '#FB923C' },
  { name: '通讯', icon: 'phone', color: '#4ADE80' },
  { name: '其他', icon: 'more-horizontal', color: '#9CA3AF' },
] as const;

// 收入类别配置
export const INCOME_CATEGORIES = [
  { name: '工资', icon: 'briefcase', color: '#4CAF50' },
  { name: '奖金', icon: 'gift', color: '#FBBF24' },
  { name: '投资', icon: 'trending-up', color: '#60A5FA' },
  { name: '兼职', icon: 'laptop', color: '#A78BFA' },
  { name: '红包', icon: 'wallet', color: '#F472B6' },
  { name: '其他', icon: 'more-horizontal', color: '#9CA3AF' },
] as const;

// 账户图标配置
export const ACCOUNT_ICONS = [
  { name: 'wallet', label: '钱包', color: '#60A5FA' },
  { name: 'credit-card', label: '银行卡', color: '#818CF8' },
  { name: 'banknote', label: '现金', color: '#34D399' },
  { name: 'landmark', label: '银行', color: '#F472B6' },
  { name: 'smartphone', label: '电子支付', color: '#FBBF24' },
  { name: 'piggy-bank', label: '储蓄', color: '#F87171' },
] as const;

// 根据类别名获取类别信息
export function getCategoryByName(name: string, type: 'income' | 'expense') {
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return categories.find(c => c.name === name) || categories[categories.length - 1];
}

// 根据图标名获取账户图标信息
export function getAccountIconByName(name: string) {
  return ACCOUNT_ICONS.find(i => i.name === name) || ACCOUNT_ICONS[0];
}

// 获取所有类别
export function getAllCategories(type: 'income' | 'expense') {
  return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function getCategoryIconComponent(iconName: string) {
  const componentName = iconName
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');

  return (((LucideIcons as unknown) as Record<string, LucideIcon | undefined>)[componentName] ?? LucideIcons.Circle) as LucideIcon;
}
