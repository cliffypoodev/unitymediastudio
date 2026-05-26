/**
 * Platform utilities for cross-platform compatibility
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/**
 * Check if running on web platform
 */
export const isWeb = Platform.OS === "web";

/**
 * Check if running on iOS
 */
export const isIOS = Platform.OS === "ios";

/**
 * Check if running on Android
 */
export const isAndroid = Platform.OS === "android";

/**
 * Safe haptic feedback - only triggers on native platforms
 */
export const safeHaptics = {
  impactAsync: async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    if (!isWeb) {
      try {
        await Haptics.impactAsync(style);
      } catch (err) {
        // Silently fail if haptics not available
      }
    }
  },
  notificationAsync: async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
    if (!isWeb) {
      try {
        await Haptics.notificationAsync(type);
      } catch (err) {
        // Silently fail if haptics not available
      }
    }
  },
  selectionAsync: async () => {
    if (!isWeb) {
      try {
        await Haptics.selectionAsync();
      } catch (err) {
        // Silently fail if haptics not available
      }
    }
  },
};

// Re-export ImpactFeedbackStyle and NotificationFeedbackType for convenience
export const ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = Haptics.NotificationFeedbackType;

/**
 * Standalone haptic functions for use with runOnJS in worklets
 * These are plain functions that can be passed to runOnJS
 */
export const triggerHapticLight = () => {
  if (!isWeb) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      // Silently fail
    }
  }
};

export const triggerHapticMedium = () => {
  if (!isWeb) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      // Silently fail
    }
  }
};

export const triggerHapticHeavy = () => {
  if (!isWeb) {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (err) {
      // Silently fail
    }
  }
};
