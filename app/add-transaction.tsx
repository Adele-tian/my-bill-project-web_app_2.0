import { CategoryPicker } from '@/components/CategoryPicker';
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
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/utils/categories';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ChevronDown, Mic, Sparkles, Type, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TransactionType = 'expense' | 'income';
type CategoryOption = (typeof EXPENSE_CATEGORIES)[number] | (typeof INCOME_CATEGORIES)[number];
type AIInputMode = 'text' | 'camera' | 'voice';

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

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryOption>(EXPENSE_CATEGORIES[0]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entryDate, setEntryDate] = useState(new Date().toISOString());

  const [activeAiPanel, setActiveAiPanel] = useState<AIInputMode | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const autoHandledInputRef = useRef<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

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
    setType(nextType);
    setAmount(String(draft.amount));
    setDescription(draft.description || draft.category);
    setEntryDate(draft.date || new Date().toISOString());

    const categories = nextType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    const matchedCategory = categories.find((category) => category.name === draft.category) || categories[0];
    setSelectedCategory(matchedCategory);

    const accountNames = selectableAccounts.map((account) => account.name);
    const matchedAccountName = inferBillAccountName(draft.accountName, accountNames);
    if (matchedAccountName) {
      const matchedAccount = selectableAccounts.find((account) => account.name === matchedAccountName);
      if (matchedAccount) {
        setSelectedAccountId(matchedAccount.id);
      }
    }
  }, [selectableAccounts]);

  const loadTransaction = useCallback(async (transactionId: number) => {
    setIsLoading(true);
    try {
      const transaction = await getTransactionById(transactionId);
      if (transaction) {
        setType(transaction.type);
        setAmount(transaction.amount.toString());
        setSelectedAccountId(transaction.account_id);
        setDescription(transaction.description);
        setEntryDate(transaction.date);

        const categories = transaction.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
        const category = categories.find((item) => item.name === transaction.category) || categories[0];
        setSelectedCategory(category);
      }
    } catch {
      Alert.alert('错误', '加载交易记录失败');
    } finally {
      setIsLoading(false);
    }
  }, [getTransactionById]);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert('提示', '请选择账户');
      return;
    }

    try {
      if (isEditMode && id) {
        await updateTransaction(parseInt(id), {
          type,
          amount: parseFloat(amount),
          category: selectedCategory.name,
          category_icon: selectedCategory.icon,
          account_id: selectedAccountId,
          date: entryDate || new Date().toISOString(),
          description: description || selectedCategory.name,
        });
      } else {
        await addTransaction({
          type,
          amount: parseFloat(amount),
          category: selectedCategory.name,
          category_icon: selectedCategory.icon,
          account_id: selectedAccountId,
          date: entryDate || new Date().toISOString(),
          description: description || selectedCategory.name,
        });
      }
      router.replace('/');
    } catch {
      Alert.alert('错误', isEditMode ? '更新失败' : '保存失败');
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

  const selectedAccount = selectableAccounts.find((account) => account.id === selectedAccountId);

  useEffect(() => {
    if (isEditMode && id) {
      loadTransaction(parseInt(id));
    }
  }, [id, isEditMode, loadTransaction]);

  useEffect(() => {
    if (selectableAccounts.length > 0 && !selectedAccountId && !isEditMode) {
      setSelectedAccountId(selectableAccounts[0].id);
    }
  }, [selectableAccounts, isEditMode, selectedAccountId]);

  useEffect(() => {
    if (!isEditMode) {
      setSelectedCategory((type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0]);
    }
  }, [type, isEditMode]);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? '编辑交易' : '记一笔'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={isLoading || isAiLoading}>
          <Text style={[styles.saveBtn, { color: isLoading || isAiLoading ? colors.textSecondary : colors.primary }]}>
            {isLoading ? '加载中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
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
            style={[styles.typeBtn, type === 'expense' && { backgroundColor: colors.expense }]}
            onPress={() => setType('expense')}
          >
            <Text style={[styles.typeText, { color: type === 'expense' ? '#FFF' : colors.textSecondary }]}>支出</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && { backgroundColor: colors.income }]}
            onPress={() => setType('income')}
          >
            <Text style={[styles.typeText, { color: type === 'income' ? '#FFF' : colors.textSecondary }]}>收入</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.amountCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>金额</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currency, { color: type === 'expense' ? colors.expense : colors.income }]}>¥</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
        </View>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>分类</Text>
          <CategoryPicker
            type={type}
            selectedCategory={selectedCategory.name}
            onSelect={(category) => setSelectedCategory(category as CategoryOption)}
          />
        </View>
        <TouchableOpacity
          style={[styles.accountSelector, { backgroundColor: colors.card }]}
          onPress={() => setShowAccountPicker(!showAccountPicker)}
        >
          <Text style={[styles.accountLabel, { color: colors.textSecondary }]}>账户</Text>
          <View style={styles.accountValue}>
            <Text style={[styles.accountName, { color: colors.text }]}>{selectedAccount?.name || '选择账户'}</Text>
            <ChevronDown size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
        {showAccountPicker ? (
          <View style={[styles.accountList, { backgroundColor: colors.card }]}>
            {selectableAccounts.map((account) => (
              <TouchableOpacity
                key={account.id}
                style={[styles.accountItem, selectedAccountId === account.id && { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  setSelectedAccountId(account.id);
                  setShowAccountPicker(false);
                }}
              >
                <Text style={[styles.accountItemText, { color: colors.text }]}>{account.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>备注</Text>
          <TextInput
            style={[styles.descInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="添加备注..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  title: { fontSize: 18, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600' },
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
  accountSelector: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
  accountLabel: { fontSize: 14 },
  accountValue: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  accountName: { fontSize: 16, fontWeight: '500' },
  accountList: { marginHorizontal: 20, borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  accountItem: { padding: 16 },
  accountItemText: { fontSize: 16 },
  descInput: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
});
