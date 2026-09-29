import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { forwardRef, useImperativeHandle, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertOptions {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

export interface CustomAlertRef {
  show: (options: AlertOptions) => void;
  hide: () => void;
}

export const CustomAlertContainer = forwardRef<CustomAlertRef, {}>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);

  useImperativeHandle(ref, () => ({
    show: (opts: AlertOptions) => {
      setOptions(opts);
      setVisible(true);
    },
    hide: () => {
      setVisible(false);
    },
  }));

  if (!visible || !options) return null;

  const { title, message, buttons } = options;

  // Determine type based on emojis or keywords in title/message
  let type: 'success' | 'error' | 'warning' | 'info' = 'info';
  let cleanTitle = title;

  if (title.includes('✅') || title.toLowerCase().includes('succès') || title.toLowerCase().includes('confirmé')) {
    type = 'success';
    cleanTitle = title.replace('✅', '').trim();
  } else if (title.includes('❌') || title.toLowerCase().includes('erreur') || title.toLowerCase().includes('impossible')) {
    type = 'error';
    cleanTitle = title.replace('❌', '').trim();
  } else if (title.includes('⚠️') || title.toLowerCase().includes('indisponible') || title.toLowerCase().includes('attention')) {
    type = 'warning';
    cleanTitle = title.replace('⚠️', '').trim();
  } else if (title.includes('⏳') || title.toLowerCase().includes('attente') || title.toLowerCase().includes('cours')) {
    type = 'warning';
    cleanTitle = title.replace('⏳', '').trim();
  }

  const alertButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];

  const handleButtonPress = (btn: AlertButton) => {
    setVisible(false);
    if (btn.onPress) {
      btn.onPress();
    }
  };

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'check-decagram' as const,
          color: '#52C41A',
          bgColor: 'rgba(82, 196, 26, 0.15)',
        };
      case 'error':
        return {
          name: 'close-circle' as const,
          color: '#FF4D4F',
          bgColor: 'rgba(255, 77, 79, 0.15)',
        };
      case 'warning':
        return {
          name: 'alert-circle' as const,
          color: '#FA8C16',
          bgColor: 'rgba(250, 140, 22, 0.15)',
        };
      default:
        return {
          name: 'information' as const,
          color: '#2F54EB',
          bgColor: 'rgba(47, 84, 235, 0.15)',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Top Decorative Circle Icon */}
          <View style={[styles.iconCircle, { backgroundColor: iconConfig.bgColor }]}>
            <MaterialCommunityIcons name={iconConfig.name} size={42} color={iconConfig.color} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{cleanTitle}</Text>

          {/* Message */}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          {/* Buttons */}
          <View style={[styles.buttonContainer, alertButtons.length > 2 && styles.buttonContainerVertical]}>
            {alertButtons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              
              let btnStyle = styles.defaultBtn;
              let txtStyle = styles.defaultBtnText;

              if (isCancel) {
                btnStyle = styles.cancelBtn;
                txtStyle = styles.cancelBtnText;
              } else if (isDestructive) {
                btnStyle = styles.destructiveBtn;
                txtStyle = styles.destructiveBtnText;
              }

              return (
                <Pressable
                  key={index}
                  style={({ pressed }) => [
                    btnStyle,
                    pressed && styles.pressed,
                    alertButtons.length <= 2 && { flex: 1 }
                  ]}
                  onPress={() => handleButtonPress(btn)}
                >
                  <Text style={txtStyle}>{btn.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#071F3D',
    borderWidth: 1.5,
    borderColor: '#123A66',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    color: '#8B94A7',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  defaultBtn: {
    backgroundColor: '#0B2F57',
    borderWidth: 1,
    borderColor: '#123A66',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#123A66',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#8B94A7',
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveBtn: {
    backgroundColor: '#FF4D4F',
    borderWidth: 1,
    borderColor: 'transparent',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});

// Singleton reference
import { createRef } from 'react';

export const customAlertRef = createRef<CustomAlertRef>();

export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    customAlertRef.current?.show({ title, message, buttons });
  },
};
