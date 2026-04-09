import { AppPageHeader } from '@/components/AppPageHeader';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccountStore } from '@/store/useAccountStore';
import { useTransactionStore } from '@/store/useTransactionStore';
import { buildDuplicateCandidates, parseImportAsset } from '@/utils/import/bill-import';
import { ImportDuplicateCandidate, ImportErrorRow, ImportPreview, ImportSource, NormalizedImportRow } from '@/utils/import/types';
import { Buffer } from 'buffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronUp, FileSpreadsheet, RefreshCw, UploadCloud, Wallet } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ImportStep = 'select' | 'preview' | 'result';

type DetailField = {
  label: string;
  value: string;
};

function sourceLabel(source: ImportPreview['source']): string {
  return source === 'wechat' ? '微信账单' : '支付宝账单';
}

function stripDataUrlPrefix(value: string): string {
  const trimmed = value.trim();
  const marker = 'base64,';
  const markerIndex = trimmed.indexOf(marker);
  return markerIndex >= 0 ? trimmed.slice(markerIndex + marker.length) : trimmed;
}

function findRawValue(raw: Record<string, string>, fieldNames: string[]): string {
  for (const fieldName of fieldNames) {
    const value = raw[fieldName];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return '-';
}

function getRawDetails(source: ImportSource, raw: Record<string, string>): DetailField[] {
  return [
    { label: '交易时间', value: findRawValue(raw, ['交易时间']) },
    { label: '交易对方', value: findRawValue(raw, ['交易对方']) },
    { label: source === 'wechat' ? '商品' : '商品说明', value: findRawValue(raw, ['商品说明', '商品']) },
    { label: '收支', value: findRawValue(raw, ['收支', '收/支']) },
    { label: '金额', value: findRawValue(raw, ['金额', '金额(元)']) },
    { label: source === 'wechat' ? '支付方式' : '收/付款方式', value: findRawValue(raw, ['收/付款方式', '支付方式']) },
    { label: source === 'wechat' ? '交易单号' : '交易订单号', value: findRawValue(raw, ['交易订单号', '交易单号']) },
  ];
}

function getRecordKindLabel(recordKind?: NormalizedImportRow['recordKind']): string {
  switch (recordKind) {
    case 'refund':
      return '退款保留';
    case 'income':
      return '正常收入';
    case 'expense':
      return '正常消费';
    case 'fee':
      return '平台费用';
    case 'neutral_transfer':
      return '中性流水';
    case 'invalid':
      return '待确认记录';
    default:
      return '可导入账单';
  }
}

function getDuplicateReason(candidate: ImportDuplicateCandidate): string {
  return candidate.matchedTransactionId ? '与已有账单重复' : '与本次导入内其他条目重复';
}

function getErrorTitle(item: ImportErrorRow, source: ImportSource): string {
  const counterpart = findRawValue(item.raw, ['交易对方']);
  const product = findRawValue(item.raw, ['商品说明', '商品']);

  if (counterpart !== '-' && product !== '-') {
    return `${counterpart} / ${product}`;
  }

  if (product !== '-') {
    return product;
  }

  if (counterpart !== '-') {
    return counterpart;
  }

  return `${source === 'wechat' ? '微信' : '支付宝'}账单第 ${item.rowNumber} 行`;
}

function getErrorMeta(item: ImportErrorRow): string {
  const date = findRawValue(item.raw, ['交易时间']);
  const direction = findRawValue(item.raw, ['收支', '收/支']);
  return `第 ${item.rowNumber} 行 · ${date} · ${direction}`;
}

function getErrorAmountText(item: ImportErrorRow): { text: string; tone: 'income' | 'expense' | 'muted' } {
  const amount = findRawValue(item.raw, ['金额', '金额(元)']);
  const direction = findRawValue(item.raw, ['收支', '收/支']);
  const normalizedAmount = amount === '-' ? '-' : amount.replace(/^[-+]/, '');

  if (normalizedAmount === '-') {
    return { text: '-', tone: 'muted' };
  }

  if (direction.includes('收入')) {
    return { text: `+¥${normalizedAmount}`, tone: 'income' };
  }

  if (direction.includes('支出')) {
    return { text: `-¥${normalizedAmount}`, tone: 'expense' };
  }

  return { text: `¥${normalizedAmount}`, tone: 'muted' };
}

type ExpandableImportRowProps = {
  rowKey: string;
  title: string;
  meta: string;
  amountText: string;
  amountTone: 'income' | 'expense' | 'muted';
  reason: string;
  details: DetailField[];
  expanded: boolean;
  onToggle: (key: string) => void;
  colors: typeof Colors.light;
};

function ExpandableImportRow({
  rowKey,
  title,
  meta,
  amountText,
  amountTone,
  reason,
  details,
  expanded,
  onToggle,
  colors,
}: ExpandableImportRowProps) {
  const amountColor =
    amountTone === 'income' ? colors.income : amountTone === 'expense' ? colors.expense : colors.textSecondary;

  return (
    <View style={[styles.expandableRow, { borderBottomColor: colors.border }]}>
      <TouchableOpacity style={styles.expandableRowHeader} activeOpacity={0.82} onPress={() => onToggle(rowKey)}>
        <View style={styles.previewRowText}>
          <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>{meta}</Text>
        </View>
        <View style={styles.previewRowRight}>
          <Text style={[styles.previewAmount, { color: amountColor }]}>{amountText}</Text>
          {expanded ? <ChevronUp size={18} color={colors.textSecondary} /> : <ChevronDown size={18} color={colors.textSecondary} />}
        </View>
      </TouchableOpacity>

      {expanded ? (
        <View style={[styles.expandableDetails, { backgroundColor: colors.softBackground }]}>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailSectionLabel, { color: colors.textSecondary }]}>系统判断</Text>
            <Text style={[styles.detailReason, { color: colors.text }]}>{reason}</Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={[styles.detailSectionLabel, { color: colors.textSecondary }]}>原始字段</Text>
            <View style={styles.detailFields}>
              {details.map((detail) => (
                <View key={`${rowKey}-${detail.label}`} style={styles.detailFieldRow}>
                  <Text style={[styles.detailFieldLabel, { color: colors.textSecondary }]}>{detail.label}</Text>
                  <Text style={[styles.detailFieldValue, { color: colors.text }]}>{detail.value || '-'}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function ImportTransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { selectableAccounts, fetchAccounts } = useAccountStore();
  const { transactions, fetchTransactions, fetchRecentTransactions, fetchSummary, importTransactions } = useTransactionStore();
  const [step, setStep] = useState<ImportStep>('select');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isPickingFile, setIsPickingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAccountPickerVisible, setIsAccountPickerVisible] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ insertedCount: number; skippedDuplicateCount: number; failedCount: number } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    importable: true,
    duplicate: true,
    skipped: true,
    invalid: true,
  });

  const readAssetAsBase64 = useCallback(async (asset: DocumentPicker.DocumentPickerAsset): Promise<string> => {
    if (Platform.OS === 'web') {
      if (typeof asset.base64 === 'string' && asset.base64.length > 0) {
        return stripDataUrlPrefix(asset.base64);
      }

      if (asset.file) {
        const arrayBuffer = await asset.file.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }

      if (asset.uri.startsWith('blob:') || asset.uri.startsWith('data:')) {
        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }
    }

    return FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }, []);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchAccounts(), fetchTransactions()]);
  }, [fetchAccounts, fetchTransactions]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useFocusEffect(
    useCallback(() => {
      void fetchAccounts();
    }, [fetchAccounts])
  );

  useEffect(() => {
    if (!selectedAccountId && selectableAccounts.length > 0) {
      setSelectedAccountId(selectableAccounts[0].id);
    }
  }, [selectableAccounts, selectedAccountId]);

  const duplicateCandidates = useMemo(() => {
    if (!preview || !selectedAccountId) {
      return [];
    }

    return buildDuplicateCandidates(preview.rows, selectedAccountId, transactions);
  }, [preview, selectedAccountId, transactions]);

  const duplicateRowNumbers = useMemo(() => new Set(duplicateCandidates.map((item) => item.rowNumber)), [duplicateCandidates]);
  const skippedErrors = useMemo(() => (preview?.errors ?? []).filter((item) => item.kind === 'skipped'), [preview]);
  const invalidErrors = useMemo(() => (preview?.errors ?? []).filter((item) => item.kind !== 'skipped'), [preview]);

  const importableRows = useMemo(() => {
    if (!preview) {
      return [];
    }

    return preview.rows.filter((row) => !duplicateRowNumbers.has(row.rowNumber));
  }, [duplicateRowNumbers, preview]);

  const handlePickFile = useCallback(async () => {
    if (!selectedAccountId) {
      Alert.alert('请选择账户', '请先选择一个接收导入账单的账户。');
      return;
    }

    setIsPickingFile(true);
    setLoadError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const fileBase64 = await readAssetAsBase64(asset);
      const nextPreview = parseImportAsset(asset.name ?? '账单', fileBase64);

      setPreview(nextPreview);
      setResultSummary(null);
      setExpandedRows({});
      setCollapsedSections({
        importable: true,
        duplicate: true,
        skipped: true,
        invalid: true,
      });
      setStep('preview');
    } catch (error) {
      const message = error instanceof Error ? error.message : '文件解析失败，请检查账单格式';
      setPreview(null);
      setStep('select');
      setLoadError(message);
      console.error('Import preview failed:', error);
      Alert.alert('导入失败', message);
    } finally {
      setIsPickingFile(false);
    }
  }, [readAssetAsBase64, selectedAccountId]);

  const handleImport = useCallback(async () => {
    if (!preview) {
      return;
    }

    if (!selectedAccountId) {
      Alert.alert('请选择账户', '请先选择一个接收导入账单的账户。');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importTransactions(importableRows, selectedAccountId);
      await Promise.all([fetchAccounts(), fetchTransactions(), fetchRecentTransactions(), fetchSummary()]);
      setResultSummary(result);
      setStep('result');
    } catch (error) {
      Alert.alert('导入失败', error instanceof Error ? error.message : '批量导入失败');
    } finally {
      setIsImporting(false);
    }
  }, [
    fetchAccounts,
    fetchRecentTransactions,
    fetchSummary,
    fetchTransactions,
    importTransactions,
    importableRows,
    preview,
    selectedAccountId,
  ]);

  const handleReset = useCallback(() => {
    setPreview(null);
    setResultSummary(null);
    setLoadError(null);
    setExpandedRows({});
    setCollapsedSections({
      importable: true,
      duplicate: true,
      skipped: true,
      invalid: true,
    });
    setStep('select');
  }, []);

  const toggleExpandedRow = useCallback((key: string) => {
    setExpandedRows((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const toggleSection = useCallback((key: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }, []);

  const selectedAccount = selectableAccounts.find((account) => account.id === selectedAccountId) ?? null;
  const failureCount = invalidErrors.length + (resultSummary?.failedCount ?? 0);

  const renderAccountSelector = (compact = false) => (
    <View
      style={[
        compact ? styles.compactAccountSection : styles.accountSection,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
      ]}>
      {!compact ? <Text style={[styles.sectionTitle, { color: colors.text }]}>选择入账账户</Text> : null}
      {selectableAccounts.length === 0 ? (
        <TouchableOpacity
          style={[styles.emptyAccountButton, { borderColor: colors.border, backgroundColor: colors.softBackground }]}
          onPress={() => router.push('/add-account')}>
          <Wallet size={18} color={colors.primary} />
          <Text style={[styles.emptyAccountButtonText, { color: colors.primary }]}>先创建一个账户</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.accountSelectButton,
            {
              marginTop: compact ? 0 : 14,
              borderColor: colors.border,
              backgroundColor: colors.softBackground,
            },
          ]}
          onPress={() => setIsAccountPickerVisible(true)}>
          <View style={styles.accountSelectTextWrap}>
            {!compact ? <Text style={[styles.accountSelectLabel, { color: colors.textSecondary }]}>当前账户</Text> : null}
            <Text style={[styles.accountSelectValue, { color: colors.text }]} numberOfLines={1}>
              {selectedAccount?.name ?? '请选择账户'}
            </Text>
          </View>
          <ChevronDown size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.pagePadding}>
          <AppPageHeader
            title="导入账单"
            rightSlot={
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.headerButton, { backgroundColor: colors.headerButtonBackground, borderColor: colors.headerButtonBorder }]}
                onPress={() => router.back()}>
                <ChevronLeft size={16} color={colors.text} />
                <Text style={[styles.headerButtonText, { color: colors.text }]}>返回</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {step === 'select' ? (
          <>
            {renderAccountSelector()}

            <View style={[styles.heroCard, { backgroundColor: colors.surfaceElevated }]}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight }]}>
                <UploadCloud size={28} color={colors.primary} />
              </View>
              <TouchableOpacity
                disabled={isPickingFile || selectableAccounts.length === 0 || !selectedAccountId}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: isPickingFile || selectableAccounts.length === 0 || !selectedAccountId ? 0.55 : 1,
                    marginTop: 0,
                  },
                ]}
                onPress={handlePickFile}>
                <FileSpreadsheet size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>{isPickingFile ? '读取文件中...' : '选择账单文件'}</Text>
              </TouchableOpacity>
            </View>

            {loadError ? (
              <View style={[styles.infoCard, styles.errorCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.expense }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>导入失败</Text>
                <Text style={[styles.bodyText, { color: colors.textSecondary }]}>{loadError}</Text>
              </View>
            ) : null}
          </>
        ) : null}

        {step === 'preview' && preview ? (
          <>
            <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated }]}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{sourceLabel(preview.source)}</Text>
                  <Text style={[styles.summaryMeta, { color: colors.textSecondary }]}>
                    {preview.fileName} · {preview.fileType.toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: colors.border, backgroundColor: colors.softBackground }]}
                  onPress={handlePickFile}>
                  <RefreshCw size={16} color={colors.primary} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>换个文件</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.metricRow}>
                <View style={[styles.metricCard, { backgroundColor: colors.softBackground }]}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>识别成功</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{preview.rows.length}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.softBackground }]}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>重复项</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{duplicateCandidates.length}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.softBackground }]}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>已跳过</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{skippedErrors.length}</Text>
                </View>
                <View style={[styles.metricCard, { backgroundColor: colors.softBackground }]}>
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>失败项</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>{invalidErrors.length}</Text>
                </View>
              </View>
            </View>

            {renderAccountSelector(true)}

            <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
              <TouchableOpacity style={styles.collapsibleSectionHeader} activeOpacity={0.82} onPress={() => toggleSection('importable')}>
                <View style={styles.collapsibleSectionTitleWrap}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>将要导入</Text>
                  {!collapsedSections.importable ? (
                    <Text style={[styles.bodyText, styles.sectionSummaryText, { color: colors.textSecondary }]}>
                      {selectedAccount ? `导入到账户：${selectedAccount.name}` : '请先选择账户'}，预计新增 {importableRows.length} 条账单。
                    </Text>
                  ) : null}
                </View>
                <View style={styles.sectionHeaderRight}>
                  <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{importableRows.length} 条</Text>
                  {collapsedSections.importable ? (
                    <ChevronDown size={20} color={colors.textSecondary} />
                  ) : (
                    <ChevronUp size={20} color={colors.textSecondary} />
                  )}
                </View>
              </TouchableOpacity>
              {!collapsedSections.importable ? (
                <View style={styles.previewList}>
                  {importableRows.map((row) => {
                    const rowKey = `importable-${row.rowNumber}-${row.description}`;
                    return (
                      <ExpandableImportRow
                        key={rowKey}
                        rowKey={rowKey}
                        title={row.description}
                        meta={`第 ${row.rowNumber} 行 · ${row.date} · ${row.category}`}
                        amountText={`${row.type === 'income' ? '+' : '-'}¥${row.amount.toFixed(2)}`}
                        amountTone={row.type === 'income' ? 'income' : 'expense'}
                        reason={getRecordKindLabel(row.recordKind)}
                        details={getRawDetails(preview.source, row.raw)}
                        expanded={Boolean(expandedRows[rowKey])}
                        onToggle={toggleExpandedRow}
                        colors={colors}
                      />
                    );
                  })}
                  {importableRows.length === 0 ? (
                    <Text style={[styles.bodyText, { color: colors.textSecondary }]}>当前没有可新增的账单，可能都被识别为重复项了。</Text>
                  ) : null}
                </View>
              ) : null}
            </View>

            {duplicateCandidates.length > 0 ? (
              <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity style={styles.collapsibleSectionHeader} activeOpacity={0.82} onPress={() => toggleSection('duplicate')}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>重复项</Text>
                  <View style={styles.sectionHeaderRight}>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{duplicateCandidates.length} 条</Text>
                    {collapsedSections.duplicate ? (
                      <ChevronDown size={20} color={colors.textSecondary} />
                    ) : (
                      <ChevronUp size={20} color={colors.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>
                {!collapsedSections.duplicate ? (
                  <View style={styles.previewList}>
                    {duplicateCandidates.map((item) => {
                      const row = preview.rows.find((candidate) => candidate.rowNumber === item.rowNumber);
                      if (!row) {
                        return null;
                      }

                      const rowKey = `duplicate-${item.rowNumber}-${row.description}`;
                      return (
                        <ExpandableImportRow
                          key={rowKey}
                          rowKey={rowKey}
                          title={row.description}
                          meta={`第 ${item.rowNumber} 行 · ${row.date} · ${row.category}`}
                          amountText={`${row.type === 'income' ? '+' : '-'}¥${row.amount.toFixed(2)}`}
                          amountTone={row.type === 'income' ? 'income' : 'expense'}
                          reason={getDuplicateReason(item)}
                          details={getRawDetails(preview.source, row.raw)}
                          expanded={Boolean(expandedRows[rowKey])}
                          onToggle={toggleExpandedRow}
                          colors={colors}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            {skippedErrors.length > 0 ? (
              <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity style={styles.collapsibleSectionHeader} activeOpacity={0.82} onPress={() => toggleSection('skipped')}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>已跳过</Text>
                  <View style={styles.sectionHeaderRight}>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{skippedErrors.length} 条</Text>
                    {collapsedSections.skipped ? (
                      <ChevronDown size={20} color={colors.textSecondary} />
                    ) : (
                      <ChevronUp size={20} color={colors.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>
                {!collapsedSections.skipped ? (
                  <View style={styles.previewList}>
                    {skippedErrors.map((item) => {
                      const rowKey = `skipped-${item.rowNumber}-${item.reason}`;
                      const amountSummary = getErrorAmountText(item);

                      return (
                        <ExpandableImportRow
                          key={rowKey}
                          rowKey={rowKey}
                          title={getErrorTitle(item, preview.source)}
                          meta={getErrorMeta(item)}
                          amountText={amountSummary.text}
                          amountTone={amountSummary.tone}
                          reason={item.reason}
                          details={getRawDetails(preview.source, item.raw)}
                          expanded={Boolean(expandedRows[rowKey])}
                          onToggle={toggleExpandedRow}
                          colors={colors}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            {invalidErrors.length > 0 ? (
              <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity style={styles.collapsibleSectionHeader} activeOpacity={0.82} onPress={() => toggleSection('invalid')}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>失败项</Text>
                  <View style={styles.sectionHeaderRight}>
                    <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{invalidErrors.length} 条</Text>
                    {collapsedSections.invalid ? (
                      <ChevronDown size={20} color={colors.textSecondary} />
                    ) : (
                      <ChevronUp size={20} color={colors.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>
                {!collapsedSections.invalid ? (
                  <View style={styles.previewList}>
                    {invalidErrors.map((item) => {
                      const rowKey = `invalid-${item.rowNumber}-${item.reason}`;
                      const amountSummary = getErrorAmountText(item);

                      return (
                        <ExpandableImportRow
                          key={rowKey}
                          rowKey={rowKey}
                          title={getErrorTitle(item, preview.source)}
                          meta={getErrorMeta(item)}
                          amountText={amountSummary.text}
                          amountTone={amountSummary.tone}
                          reason={item.reason}
                          details={getRawDetails(preview.source, item.raw)}
                          expanded={Boolean(expandedRows[rowKey])}
                          onToggle={toggleExpandedRow}
                          colors={colors}
                        />
                      );
                    })}
                  </View>
                ) : null}
              </View>
            ) : null}

            <TouchableOpacity
              disabled={isImporting || !selectedAccountId || selectableAccounts.length === 0}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isImporting || !selectedAccountId || selectableAccounts.length === 0 ? 0.6 : 1,
                  marginHorizontal: 20,
                },
              ]}
              onPress={handleImport}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{isImporting ? '正在导入...' : `确认导入 ${importableRows.length} 条`}</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {step === 'result' && resultSummary ? (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.surfaceElevated }]}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryLight }]}>
                <CheckCircle2 size={28} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>导入完成</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
                已插入 {resultSummary.insertedCount} 条，跳过重复 {resultSummary.skippedDuplicateCount} 条，已跳过 {skippedErrors.length} 条，失败 {failureCount} 条。
              </Text>
            </View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.resultActionButton, { borderColor: colors.border, backgroundColor: colors.softBackground }]}
                onPress={handleReset}>
                <RefreshCw size={18} color={colors.primary} />
                <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>继续导入</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, styles.resultActionButton, { backgroundColor: colors.primary }]}
                onPress={() => router.back()}>
                <Text style={styles.primaryButtonText}>返回设置</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}
      </ScrollView>

      <Modal
        visible={isAccountPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAccountPickerVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsAccountPickerVisible(false)}>
          <Pressable style={[styles.accountModal, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.accountModalTitle, { color: colors.text }]}>选择账户</Text>
            {selectableAccounts.map((account) => {
              const isSelected = account.id === selectedAccountId;
              return (
                <TouchableOpacity
                  key={account.id}
                  style={[styles.accountOption, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedAccountId(account.id);
                    setIsAccountPickerVisible(false);
                  }}>
                  <View style={styles.accountOptionTextWrap}>
                    <Text style={[styles.accountOptionTitle, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.accountOptionMeta, { color: colors.textSecondary }]}>余额 ¥{account.balance.toFixed(2)}</Text>
                  </View>
                  {isSelected ? <Check size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  pagePadding: { paddingHorizontal: 20, paddingTop: 10 },
  headerButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  heroCard: {
    margin: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 20,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  accountSection: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  compactAccountSection: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  errorCard: {
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  bodyText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
  },
  collapsibleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  collapsibleSectionTitleWrap: {
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionSummaryText: {
    marginTop: 8,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryMeta: {
    marginTop: 6,
    fontSize: 13,
  },
  metricRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
  },
  accountSelectButton: {
    borderWidth: 1,
    borderRadius: 16,
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountSelectTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  accountSelectLabel: {
    fontSize: 12,
  },
  accountSelectValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyAccountButton: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyAccountButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  warningBox: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  previewList: {
    marginTop: 14,
  },
  expandableRow: {
    borderBottomWidth: 1,
  },
  expandableRowHeader: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewRowText: {
    flex: 1,
  },
  previewRowRight: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewMeta: {
    marginTop: 4,
    fontSize: 12,
  },
  previewAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  expandableDetails: {
    marginBottom: 12,
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  detailBlock: {
    gap: 8,
  },
  detailSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailReason: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  detailFields: {
    gap: 8,
  },
  detailFieldRow: {
    gap: 4,
  },
  detailFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailFieldValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  resultActions: {
    marginTop: 20,
    marginHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  resultActionButton: {
    flex: 1,
    minHeight: 48,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 28, 0.22)',
    justifyContent: 'center',
    padding: 24,
  },
  accountModal: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  accountModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  accountOption: {
    minHeight: 56,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  accountOptionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  accountOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  accountOptionMeta: {
    marginTop: 4,
    fontSize: 12,
  },
});
