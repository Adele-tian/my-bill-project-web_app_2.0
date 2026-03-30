import { CategoryPicker } from '@/components/CategoryPicker';
import { DateQuickPicker } from '@/components/DateQuickPicker';
import { Colors } from '@/constants/theme';
import {
  inferBillAccountName,
  parseAudioBillToDraft,
  parseImageBillToDraft,
  parseTextBillToDraft,
  type ParsedBillDraft,
} from '@/db/insforge/ai-bill-parser';
import { File } from 'expo-file-system';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { getTransactionEntryPreferences, saveTransactionEntryPreferences } from '@/utils/transaction-entry-preferences';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/categories';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, CheckCircle2, Mic, Sparkles, Type, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TransactionType = 'expense' | 'income';
type CategoryOption = (typeof EXPENSE_CATEGORIES)[number] | (typeof INCOME_CATEGORIES)[number];
type AIInputMode = 'text' | 'camera' | 'voice';
type FormState = {
  type: TransactionType;
  amount: string;
  selectedCategory: CategoryOption;
  selectedAccountId: number | null;
  description: string;
  entryDate: string;
};

function getDefaultCategory(type: TransactionType): CategoryOption {
  return type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0];
}

function createFormState(overrides: Partial<FormState> = {}): FormState {
  const nextType = overrides.type ?? 'expense';
  return {
    type: nextType,
    amount: overrides.amount ?? '',
    selectedCategory: overrides.selectedCategory ?? getDefaultCategory(nextType),
    selectedAccountId: overrides.selectedAccountId ?? null,
    description: overrides.description ?? '',
    entryDate: overrides.entryDate ?? new Date().toISOString(),
  };
}

function getImageMimeType(uri: string, fallback?: string | null): string {
  if (fallback) return fallback;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

function getAudioFormat(uri: string): 'wav' | 'mp3' | 'aiff' | 'aac' | 'ogg' | 'flac' | 'm4a' {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.wav')) return 'wav';
  if (lower.endsWith('.mp3')) return 'mp3';
  if (lower.endsWith('.aiff')) return 'aiff';
  if (lower.endsWith('.aac')) return 'aac';
  if (lower.endsWith('.ogg') || lower.endsWith('.opus')) return 'ogg';
  if (lower.endsWith('.flac')) return 'flac';
  return 'm4a';
}

export default function AddTransactionScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { id, input } = useLocalSearchParams<{ id?: string; input?: AIInputMode }>();
  const isEditMode = !!id;

  const { selectableAccounts, fetchAccounts } = useAccountStore();
  const { addTransaction, updateTransaction, getTransactionById } = useTransactionStore();

  const amountInputRef = useRef<TextInput | null>(null);
  const autoHandledInputRef = useRef<string | null>(null);
  const initializedCreateFormRef = useRef(false);

  const [initialValues, setInitialValues] = useState<FormState | null>(null);
  const [form, setForm] = useState<FormState>(() => createFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [keepEntering, setKeepEntering] = useState(!isEditMode);

  const [activeAiPanel, setActiveAiPanel] = useState<AIInputMode | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => undefined);
      }
    };
  }, [recording]);

  const getAiContext = useCallback(() => ({
    accountNames: selectableAccounts.map((account) => account.name),
  }), [selectableAccounts]);

  const applyParsedDraft = useCallback((draft: ParsedBillDraft) => {
    const nextType = draft.type === 'income' ? 'income' : 'expense';

    const categories = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const matchedCategory = categories.find((category) => category.name === draft.category) || categories[0];
    let nextAccountId = form.selectedAccountId;

    const accountNames = selectableAccounts.map((account) => account.name);
    const matchedAccountName = inferBillAccountName(draft.accountName, accountNames);
    if (matchedAccountName) {
      const matchedAccount = selectableAccounts.find((account) => account.name === matchedAccountName);
      if (matchedAccount) {
        nextAccountId = matchedAccount.id;
      }
    }

    const nextForm = createFormState({
      ...form,
      type: nextType,
      amount: String(draft.amount),
      description: draft.description || draft.category,
      entryDate: draft.date || new Date().toISOString(),
      selectedCategory: matchedCategory,
      selectedAccountId: nextAccountId,
    });
    setForm(nextForm);
  }, [form, selectableAccounts]);

  const loadTransaction = useCallback(async (transactionId: number) => {
    setIsLoading(true);
    try {
      const transaction = await getTransactionById(transactionId);
      if (transaction) {
        const categories = transaction.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        const category = categories.find((item) => item.name === transaction.category) || categories[0];
        const nextInitialValues = createFormState({
          type: transaction.type,
          amount: transaction.amount.toString(),
          selectedAccountId: transaction.account_id,
          description: transaction.description,
          entryDate: transaction.date,
          selectedCategory: category,
        });
        setInitialValues(nextInitialValues);
        setForm(nextInitialValues);
      }
    } catch {
      Alert.alert('错误', '加载交易记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [getTransactionById]);

  const initializeCreateForm = useCallback(() => {
    if (isEditMode || initializedCreateFormRef.current || selectableAccounts.length === 0) {
      return;
    }

    const preferences = getTransactionEntryPreferences();
    const defaultType = preferences.lastType;
    const defaultAccount =
      selectableAccounts.find((account) => account.id === preferences.lastAccountId) ?? selectableAccounts[0];
    const nextInitialValues = createFormState({
      type: defaultType,
      selectedCategory: getDefaultCategory(defaultType),
      selectedAccountId: defaultAccount?.id ?? null,
    });

    initializedCreateFormRef.current = true;
    setInitialValues(nextInitialValues);
    setForm(nextInitialValues);
  }, [isEditMode, selectableAccounts]);

  const updateForm = useCallback((updater: Partial<FormState> | ((current: FormState) => FormState)) => {
    setForm((current) => {
      if (typeof updater === 'function') {
        return updater(current);
      }

      return createFormState({ ...current, ...updater });
    });
  }, []);

  const isSaveDisabled = !form.amount || Number.parseFloat(form.amount) <= 0 || !form.selectedAccountId || isSubmitting || isLoading || isAiLoading;

  const handleQuickReset = useCallback(() => {
    setForm((current) =>
      createFormState({
        type: current.type,
        selectedCategory: current.selectedCategory,
        selectedAccountId: current.selectedAccountId,
        entryDate: current.entryDate,
        amount: '',
        description: '',
      })
    );
    setAiStatus('');
    setAiPrompt('');
    setRecordedAudioUri(null);
    setActiveAiPanel(null);
    requestAnimationFrame(() => amountInputRef.current?.focus());
  }, []);

  const handleSave = async () => {
    if (isSaveDisabled) {
      Alert.alert('提示', !form.amount || Number.parseFloat(form.amount) <= 0 ? '请输入有效金额' : '请选择账户');
      return;
    }

    setIsSubmitting(true);
    setSaveNotice('');

    try {
      if (isEditMode && id) {
        await updateTransaction(parseInt(id), {
          type: form.type,
          amount: parseFloat(form.amount),
          category: form.selectedCategory.name,
          category_icon: form.selectedCategory.icon,
          account_id: form.selectedAccountId!,
          date: form.entryDate || new Date().toISOString(),
          description: form.description || form.selectedCategory.name,
        });
        saveTransactionEntryPreferences({
          lastAccountId: form.selectedAccountId,
          lastType: form.type,
        });
        router.replace('/');
      } else {
        await addTransaction({
          type: form.type,
          amount: parseFloat(form.amount),
          category: form.selectedCategory.name,
          category_icon: form.selectedCategory.icon,
          account_id: form.selectedAccountId!,
          date: form.entryDate || new Date().toISOString(),
          description: form.description || form.selectedCategory.name,
        });
        saveTransactionEntryPreferences({
          lastAccountId: form.selectedAccountId,
          lastType: form.type,
        });

        if (keepEntering) {
          setSaveNotice('已保存，继续下一笔');
          handleQuickReset();
        } else {
          router.replace('/');
        }
      }
    } catch {
      Alert.alert('错误', isEditMode ? '更新失败' : '保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTextRecognition = async () => {
    if (!aiPrompt.trim()) {
      Alert.alert('提示', '先输入一段账单文字或自然语言描述。');
      return;
    }

    setIsAiLoading(true);
    try {
      const draft = await parseTextBillToDraft(aiPrompt.trim(), getAiContext());
      applyParsedDraft(draft);
      setAiStatus('已根据文字识别结果预填表单，请确认后保存。');
      setActiveAiPanel(null);
    } catch (error) {
      Alert.alert('识别失败', (error as Error).message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCameraRecognition = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('无法拍照', '请先允许相机权限。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setIsAiLoading(true);
    try {
      const asset = result.assets[0];
      const base64 = asset.base64 || (await new File(asset.uri).base64());
      const mimeType = getImageMimeType(asset.uri, asset.mimeType);
      const draft = await parseImageBillToDraft(`data:${mimeType};base64,${base64}`, getAiContext());
      applyParsedDraft(draft);
      setAiStatus('已根据拍照识别结果预填表单，请确认后保存。');
      setActiveAiPanel(null);
    } catch (error) {
      Alert.alert('拍照识别失败', (error as Error).message);
    } finally {
      setIsAiLoading(false);
    }
  }, [applyParsedDraft, getAiContext]);

  const startVoiceRecording = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('无法录音', '请先允许麦克风权限。');
      return;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const nextRecording = new Audio.Recording();
    await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await nextRecording.startAsync();
    setRecordedAudioUri(null);
    setRecording(nextRecording);
  };

  const stopVoiceRecording = async () => {
    if (!recording) {
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
    setRecording(null);
    setRecordedAudioUri(uri ?? null);
  };

  const handleVoiceRecognition = async () => {
    if (!recordedAudioUri) {
      Alert.alert('提示', '请先录制一段记账语音。');
      return;
    }

    setIsAiLoading(true);
    try {
      const base64 = await new File(recordedAudioUri).base64();
      const format = getAudioFormat(recordedAudioUri);
      const draft = await parseAudioBillToDraft(base64, format, getAiContext());
      applyParsedDraft(draft);
      setAiStatus('已根据语音识别结果预填表单，请确认后保存。');
      setActiveAiPanel(null);
      setRecordedAudioUri(null);
    } catch (error) {
      Alert.alert('语音识别失败', (error as Error).message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedAccount = selectableAccounts.find((account) => account.id === form.selectedAccountId);

  useEffect(() => {
    if (isEditMode && id) {
      loadTransaction(parseInt(id));
    }
  }, [id, isEditMode, loadTransaction]);

  useEffect(() => {
    initializeCreateForm();
  }, [initializeCreateForm]);

  useEffect(() => {
    if (!input || isEditMode || autoHandledInputRef.current === input) {
      return;
    }

    autoHandledInputRef.current = input;
    if (input === 'text') {
      setActiveAiPanel('text');
      return;
    }

    if (input === 'voice') {
      setActiveAiPanel('voice');
      return;
    }

    handleCameraRecognition().catch((error) => {
      Alert.alert('拍照识别失败', (error as Error).message);
    });
  }, [handleCameraRecognition, input, isEditMode]);

  const activeCategories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const validationMessage = !form.amount || Number.parseFloat(form.amount) <= 0 ? '请输入有效金额' : !form.selectedAccountId ? '请选择账户' : '';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? '编辑交易' : '记一笔'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaveDisabled}>
            <Text style={[styles.saveBtn, { color: isSaveDisabled ? colors.textSecondary : colors.primary }]}>
              {isLoading ? '加载中...' : isSubmitting ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {!isEditMode ? (
          <View style={[styles.aiCard, { backgroundColor: colors.card }]}>
            <View style={styles.aiHeader}>
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.aiTitle, { color: colors.text }]}>AI 智能识别</Text>
            </View>
            <Text style={[styles.aiSubtitle, { color: colors.textSecondary }]}>
              支持文字账单、拍照票据、语音描述三种输入方式，识别后会自动预填到下面的表单里。
            </Text>
            <View style={styles.aiActions}>
              <TouchableOpacity
                style={[styles.aiActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setActiveAiPanel(activeAiPanel === 'text' ? null : 'text')}
              >
                <Type size={18} color={colors.primary} />
                <Text style={[styles.aiActionText, { color: colors.text }]}>文字识别</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => handleCameraRecognition().catch((error) => Alert.alert('拍照识别失败', (error as Error).message))}
              >
                <Camera size={18} color={colors.primary} />
                <Text style={[styles.aiActionText, { color: colors.text }]}>拍照识别</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiActionButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setActiveAiPanel(activeAiPanel === 'voice' ? null : 'voice')}
              >
                <Mic size={18} color={colors.primary} />
                <Text style={[styles.aiActionText, { color: colors.text }]}>语音记账</Text>
              </TouchableOpacity>
            </View>
            {aiStatus ? (
              <View style={[styles.aiResultCard, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.aiResultText, { color: colors.text }]}>{aiStatus}</Text>
              </View>
            ) : null}
            {activeAiPanel === 'text' ? (
              <View style={styles.aiPanel}>
                <Text style={[styles.panelLabel, { color: colors.textSecondary }]}>
                  直接输入一句话，例如：昨晚打车 28 元，用现金支付。
                </Text>
                <TextInput
                  style={[styles.aiPromptInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="输入账单文字、短信、聊天记录或自然语言描述"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  value={aiPrompt}
                  onChangeText={setAiPrompt}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.aiSubmitButton, { backgroundColor: colors.primary }]}
                  onPress={handleTextRecognition}
                  disabled={isAiLoading}
                >
                  <Text style={styles.aiSubmitText}>{isAiLoading ? '识别中...' : '识别并预填'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {activeAiPanel === 'voice' ? (
              <View style={styles.aiPanel}>
                <Text style={[styles.panelLabel, { color: colors.textSecondary }]}>
                  例如说：今天午餐 36 元，刷工商银行卡。
                </Text>
                <View style={styles.voiceActions}>
                  <TouchableOpacity
                    style={[styles.voiceButton, { backgroundColor: recording ? '#FEE2E2' : colors.primaryLight }]}
                    onPress={recording ? stopVoiceRecording : startVoiceRecording}
                    disabled={isAiLoading}
                  >
                    <Text style={[styles.voiceButtonText, { color: recording ? '#DC2626' : colors.primary }]}>
                      {recording ? '停止录音' : '开始录音'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.voiceButton, { backgroundColor: colors.primary }]}
                    onPress={handleVoiceRecognition}
                    disabled={isAiLoading || !recordedAudioUri || !!recording}
                  >
                    <Text style={styles.voiceConfirmText}>{isAiLoading ? '识别中...' : '识别语音'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.voiceHint, { color: colors.textSecondary }]}>
                  {recording ? '正在录音中...' : recordedAudioUri ? '录音已完成，点击“识别语音”即可预填。' : '先录一段记账语音，再点击识别。'}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, form.type === 'expense' && { backgroundColor: colors.expense }]}
            onPress={() =>
              updateForm((current) =>
                createFormState({
                  ...current,
                  type: 'expense',
                  selectedCategory: current.type === 'expense' ? current.selectedCategory : EXPENSE_CATEGORIES[0],
                })
              )
            }
          >
            <Text style={[styles.typeText, { color: form.type === 'expense' ? '#FFF' : colors.textSecondary }]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, form.type === 'income' && { backgroundColor: colors.income }]}
            onPress={() =>
              updateForm((current) =>
                createFormState({
                  ...current,
                  type: 'income',
                  selectedCategory: current.type === 'income' ? current.selectedCategory : INCOME_CATEGORIES[0],
                })
              )
            }
          >
            <Text style={[styles.typeText, { color: form.type === 'income' ? '#FFF' : colors.textSecondary }]}>收入</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.amountCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>金额</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currency, { color: form.type === 'expense' ? colors.expense : colors.income }]}>¥</Text>
            <TextInput
              ref={amountInputRef}
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={(value) => updateForm({ amount: value.replace(/[^0-9.]/g, '') })}
              returnKeyType="done"
            />
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>账户</Text>
          <View style={styles.optionGrid}>
            {selectableAccounts.map((account) => {
              const isSelected = form.selectedAccountId === account.id;
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isSelected ? colors.primaryLight : colors.background,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => updateForm({ selectedAccountId: account.id })}
                >
                  <Text style={[styles.optionChipText, { color: isSelected ? colors.primary : colors.text }]}>
                    {account.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>日期</Text>
          <DateQuickPicker value={form.entryDate} onChange={(entryDate) => updateForm({ entryDate })} />
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>分类</Text>
          <CategoryPicker
            type={form.type}
            selectedCategory={form.selectedCategory.name}
            onSelect={(category) => updateForm({ selectedCategory: category as CategoryOption })}
            compact
          />
          <View style={styles.quickCategoryRow}>
            {activeCategories.map((category) => {
              const isSelected = form.selectedCategory.name === category.name;
              return (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.quickCategoryChip,
                    {
                      backgroundColor: isSelected ? `${category.color}20` : colors.background,
                      borderColor: isSelected ? category.color : colors.border,
                    },
                  ]}
                  onPress={() => updateForm({ selectedCategory: category })}
                >
                  <Text style={[styles.quickCategoryText, { color: isSelected ? category.color : colors.textSecondary }]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>备注</Text>
          <TextInput
            style={[styles.descInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="添加备注..."
            placeholderTextColor={colors.textSecondary}
            value={form.description}
            onChangeText={(description) => updateForm({ description })}
          />
        </View>
        {!isEditMode ? (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.keepEnteringRow}>
              <View style={styles.keepEnteringTextWrap}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 4 }]}>连续记账</Text>
                <Text style={[styles.keepEnteringHint, { color: colors.textSecondary }]}>
                  保存后保留账户、类型、日期和当前分类，直接录下一笔。
                </Text>
              </View>
              <Switch value={keepEntering} onValueChange={setKeepEntering} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>
          </View>
        ) : null}
        {saveNotice ? (
          <View style={[styles.noticeCard, { backgroundColor: colors.primaryLight }]}>
            <CheckCircle2 size={18} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.text }]}>{saveNotice}</Text>
          </View>
        ) : null}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: validationMessage ? colors.expense : colors.textSecondary }]}>
            {validationMessage || `当前账户：${selectedAccount?.name ?? '未选择'}${initialValues ? '' : '，正在准备默认值...'}`}
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
  scrollContent: { paddingBottom: 32 },
  aiCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 20, padding: 16, gap: 12 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTitle: { fontSize: 16, fontWeight: '700' },
  aiSubtitle: { fontSize: 13, lineHeight: 19 },
  aiActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  aiActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  aiActionText: { fontSize: 14, fontWeight: '600' },
  aiResultCard: { borderRadius: 14, padding: 12 },
  aiResultText: { fontSize: 13, lineHeight: 19, fontWeight: '500' },
  aiPanel: { gap: 12 },
  panelLabel: { fontSize: 13, lineHeight: 19 },
  aiPromptInput: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 110,
    padding: 12,
    fontSize: 15,
  },
  aiSubmitButton: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSubmitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  voiceActions: { flexDirection: 'row', gap: 12 },
  voiceButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  voiceButtonText: { fontSize: 15, fontWeight: '700' },
  voiceConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  voiceHint: { fontSize: 13, lineHeight: 19 },
  typeSelector: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, gap: 12 },
  typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  typeText: { fontSize: 16, fontWeight: '500' },
  amountCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 16 },
  amountLabel: { fontSize: 14 },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  currency: { fontSize: 32, fontWeight: 'bold', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: 'bold' },
  section: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  optionChipText: { fontSize: 14, fontWeight: '600' },
  quickCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  quickCategoryChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  quickCategoryText: { fontSize: 13, fontWeight: '600' },
  descInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  keepEnteringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  keepEnteringTextWrap: { flex: 1 },
  keepEnteringHint: { fontSize: 13, lineHeight: 19 },
  noticeCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noticeText: { flex: 1, fontSize: 14, fontWeight: '600' },
  footer: { paddingHorizontal: 20, paddingTop: 4 },
  footerText: { fontSize: 13, lineHeight: 18 },
});
