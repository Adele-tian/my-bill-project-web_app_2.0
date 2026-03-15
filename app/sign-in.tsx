import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '../store/useAuthStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BadgeCheck, Lock, Mail, User } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type AuthMode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const {
    signIn,
    requestSignUpCode,
    completeSignUp,
    pendingSignUpEmail,
    isSubmitting,
    error,
    notice,
    clearError,
    clearNotice,
  } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const title = useMemo(
    () => (mode === 'sign-in' ? '登录你的账本' : '创建专属账本'),
    [mode]
  );

  const subtitle = useMemo(
    () =>
      mode === 'sign-in'
        ? '使用邮箱和密码继续，JWT 会安全存储在本机设备中。'
        : '先发送验证码到邮箱，再输入验证码完成注册并建立登录态。',
    [mode]
  );

  const submitLabel =
    mode === 'sign-in' ? '登录' : pendingSignUpEmail === email.trim() && otp.trim() ? '注册完成' : '发送验证码';

  const handleSubmit = async () => {
    clearError();
    clearNotice();

    if (!email.trim() || !password.trim()) {
      Alert.alert('提示', '请输入邮箱和密码');
      return;
    }

    if (mode === 'sign-up' && !name.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }

    try {
      if (mode === 'sign-in') {
        await signIn({ email: email.trim(), password });
        router.replace('/');
      } else {
        const normalizedEmail = email.trim();

        if (pendingSignUpEmail === normalizedEmail && otp.trim()) {
          await completeSignUp({ email: normalizedEmail, otp: otp.trim() });
          router.replace('/');
          setMode('sign-in');
          setOtp('');
          return;
        }

        await requestSignUpCode({ email: normalizedEmail, password, name: name.trim() });
      }
    } catch (submitError) {
      Alert.alert('认证失败', (submitError as Error).message);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={colorScheme === 'dark' ? ['#2D1E29', '#151718'] : ['#FFE3EE', '#F8F9FA']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={[styles.kicker, { color: colors.primary }]}>InsForge Auth</Text>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.toggle, { backgroundColor: colors.background }]}>
              <Pressable
                onPress={() => setMode('sign-in')}
                style={[styles.toggleItem, mode === 'sign-in' && { backgroundColor: colors.primary }]}>
                <Text style={[styles.toggleText, { color: mode === 'sign-in' ? '#FFF' : colors.textSecondary }]}>
                  登录
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('sign-up')}
                style={[styles.toggleItem, mode === 'sign-up' && { backgroundColor: colors.primary }]}>
                <Text style={[styles.toggleText, { color: mode === 'sign-up' ? '#FFF' : colors.textSecondary }]}>
                  注册
                </Text>
              </Pressable>
            </View>

            {mode === 'sign-up' ? (
              <InputRow
                colors={colors}
                icon={<User size={18} color={colors.textSecondary} />}
                placeholder="昵称"
                value={name}
                onChangeText={setName}
              />
            ) : null}

            <InputRow
              colors={colors}
              icon={<Mail size={18} color={colors.textSecondary} />}
              placeholder="邮箱"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <InputRow
              colors={colors}
              icon={<Lock size={18} color={colors.textSecondary} />}
              placeholder="密码"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {mode === 'sign-up' ? (
              <InputRow
                colors={colors}
                icon={<BadgeCheck size={18} color={colors.textSecondary} />}
                placeholder="邮箱验证码"
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
              />
            ) : null}

            {error ? <Text style={[styles.errorText, { color: '#E11D48' }]}>{error}</Text> : null}
            {notice ? <Text style={[styles.noticeText, { color: colors.income }]}>{notice}</Text> : null}

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submitButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.submitText}>{isSubmitting ? '提交中...' : submitLabel}</Text>
            </Pressable>

            <Text style={[styles.footnote, { color: colors.textSecondary }]}>
              {mode === 'sign-in'
                ? '登录后才能查看和提交账本数据，未登录时不会触发账户与交易请求。'
                : '注册流程为：填写信息 -> 发送验证码 -> 输入验证码 -> 注册完成。'}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputRow({
  colors,
  icon,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  colors: (typeof Colors)['light'];
  icon: React.ReactNode;
}) {
  return (
    <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: colors.text }]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 32, justifyContent: 'center' },
  hero: { marginBottom: 28 },
  kicker: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { fontSize: 34, fontWeight: '800', marginTop: 12 },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 320 },
  card: { borderWidth: 1, borderRadius: 28, padding: 20, gap: 14 },
  toggle: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  toggleItem: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  toggleText: { fontSize: 15, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, minHeight: 56 },
  inputIcon: { width: 48, alignItems: 'center' },
  input: { flex: 1, fontSize: 16, paddingRight: 16, paddingVertical: 14 },
  submitButton: { marginTop: 8, minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  errorText: { fontSize: 14, lineHeight: 20 },
  noticeText: { fontSize: 14, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 19, marginTop: 4 },
});
