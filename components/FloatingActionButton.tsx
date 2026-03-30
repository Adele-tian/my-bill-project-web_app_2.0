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
    { icon: Edit3, label: '快速输入', color: '#60A5FA', onPress: onQuickInput || (() => {}) },
    { icon: FileText, label: '记一笔', color: '#F472B6', onPress: onAddTransaction || (() => {}) },
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
                <Text style={styles.menuLabel}>{action.label}</Text>
                <View style={[styles.menuIcon, { backgroundColor: action.color + '20' }]}>
                  <IconComponent size={20} color={action.color} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={toggleMenu}
        activeOpacity={0.8}
      >
        {isOpen ? (
          <X size={28} color="#FFF" />
        ) : (
          <Plus size={28} color="#FFF" />
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
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 1,
  },
  menu: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    alignItems: 'flex-end',
    gap: 12,
    zIndex: 3,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuLabel: {
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
