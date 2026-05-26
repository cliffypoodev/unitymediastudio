import React from "react";
import { View, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { STUDIO } from "../utils/theme";

interface SlimNavBarProps {
  canGoBack?: boolean;
  canGoForward?: boolean;
  onGoBack?: () => void;
  onGoForward?: () => void;
  onStop?: () => void;
  onRefresh?: () => void;
  extraButtons?: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    label: string;
  }>;
  style?: any;
}

export function SlimNavBar({
  canGoBack = false,
  canGoForward = false,
  onGoBack,
  onGoForward,
  onStop,
  onRefresh,
  extraButtons = [],
  style,
}: SlimNavBarProps) {
  const handlePress = (callback?: () => void) => {
    if (callback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      callback();
    }
  };

  const handleOpenURL = (urlScheme: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(urlScheme).catch(() => {
      console.log("Could not open app:", urlScheme);
    });
  };

  // Determine if web navigation controls should be shown
  const showWebNav = onGoBack || onGoForward || onStop || onRefresh;

  return (
    <View
      className="flex-row items-center justify-around"
      style={[
        {
          backgroundColor: "rgba(18, 15, 26, 0.95)",
          borderTopWidth: 0.5,
          borderTopColor: STUDIO.border,
          height: 48,
          paddingHorizontal: 8,
        },
        style,
      ]}
    >
      {/* Back Button - only show if any web nav callback provided */}
      {showWebNav && (
        <Pressable
          onPress={() => handlePress(onGoBack)}
          disabled={!canGoBack}
          style={{ opacity: canGoBack ? 1 : 0.3, padding: 4 }}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={canGoBack ? STUDIO.amber : STUDIO.nickelDark}
          />
        </Pressable>
      )}

      {/* Forward Button - only show if any web nav callback provided */}
      {showWebNav && (
        <Pressable
          onPress={() => handlePress(onGoForward)}
          disabled={!canGoForward}
          style={{ opacity: canGoForward ? 1 : 0.3, padding: 4 }}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={canGoForward ? STUDIO.amber : STUDIO.nickelDark}
          />
        </Pressable>
      )}

      {/* Stop Button */}
      {onStop && (
        <Pressable onPress={() => handlePress(onStop)} style={{ padding: 4 }}>
          <Ionicons name="stop" size={20} color={STUDIO.amber} />
        </Pressable>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <Pressable onPress={() => handlePress(onRefresh)} style={{ padding: 4 }}>
          <Ionicons name="refresh" size={20} color={STUDIO.amber} />
        </Pressable>
      )}

      {/* Extra Buttons */}
      {extraButtons.map((button, index) => (
        <Pressable
          key={index}
          onPress={() => handlePress(button.onPress)}
          style={{ padding: 4 }}
        >
          <Ionicons name={button.icon} size={20} color={STUDIO.amber} />
        </Pressable>
      ))}
    </View>
  );
}
