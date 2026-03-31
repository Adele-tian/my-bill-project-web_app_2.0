import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Edit3, FileText, Plus, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface FABAction {
  icon: React.ComponentType<any>;
  label: string;
  color: string;
  onPress: () => void;
}

interface FloatingActionButtonProps {
  onAddTransaction?: () => void;
  onQuickInput?: () => void;
}

export function FloatingActionButton({
  onAddTransaction,
  onQuickInput,
}: FloatingActionButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isOpen, setIsOpen] = useState(false);

  const actions: FABAction[] = [
    { icon: Edit3, label: '快速输入', color: colors.primary, onPress: onQuickInput || (() => {}) },
    { icon: FileText, label: '记一笔', color: '#FF7CAF', onPress: onAddTransaction || (() => {}) },
  ];

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleAction = (action: FABAction) => {
    setIsOpen(false);
    action.onPress();
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        />
      )}

      {isOpen && (
        <View style={styles.menu}>
          {actions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => handleAction(action)}
              >
                <Text
                  style={[
                    styles.menuLabel,
                    {
                      backgroundColor: colors.surfaceElevated,
                      color: colors.text,
                    },
                  ]}>
                  {action.label}
                </Text>
                <View
                  style={[
                    styles.menuIcon,
                    {
                      backgroundColor: action.color + '18',
                    },
                  ]}>
                  <IconComponent size={20} color={action.color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.fabShadow }]}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        {isOpen ? (
          <X size={34} color="#FFF" />
        ) : (
          <Plus size={34} color="#FFF" />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 28, 0.12)',
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    right: 22,
    bottom: 118,
    alignItems: 'flex-end',
    gap: 14,
    zIndex: 3,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    fontSize: 14,
    fontWeight: '700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 26,
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 18,
  },
});
