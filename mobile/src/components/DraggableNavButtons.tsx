import React from "react";
import { Pressable, Dimensions, Linking } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Button dimensions
const BUTTON_SIZE = 44;
const CONTAINER_PADDING = 6;

interface DraggableNavButtonsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onRefresh: () => void;
  accentColor: string;
  bottomInset?: number;
  appUrlScheme?: string; // Optional URL scheme to launch native app
  appIcon?: keyof typeof Ionicons.glyphMap; // Icon for the app button
}

export function DraggableNavButtons({
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onRefresh,
  accentColor,
  bottomInset = 0,
  appUrlScheme,
  appIcon = "apps-outline",
}: DraggableNavButtonsProps) {
  // Calculate container width based on whether app button is shown
  const buttonCount = appUrlScheme ? 4 : 3;
  const CONTAINER_WIDTH = (BUTTON_SIZE * buttonCount) + (CONTAINER_PADDING * 2) + ((buttonCount - 1) * 4);
  const CONTAINER_HEIGHT = BUTTON_SIZE + (CONTAINER_PADDING * 2);

  // Initial position (bottom right)
  const initialX = SCREEN_WIDTH - CONTAINER_WIDTH - 16;
  const initialY = SCREEN_HEIGHT - CONTAINER_HEIGHT - bottomInset - 100;

  const translateX = useSharedValue(initialX);
  const translateY = useSharedValue(initialY);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);
  const scale = useSharedValue(1);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOpenApp = () => {
    if (!appUrlScheme) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(appUrlScheme).catch(() => {
      console.log("Could not open app:", appUrlScheme);
    });
  };

  const panGesture = Gesture.Pan()
    .onStart(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      scale.value = withSpring(1.05);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd(() => {
      scale.value = withSpring(1);

      // Constrain to screen bounds with padding
      const minX = 8;
      const maxX = SCREEN_WIDTH - CONTAINER_WIDTH - 8;
      const minY = 60;
      const maxY = SCREEN_HEIGHT - CONTAINER_HEIGHT - bottomInset - 60;

      // Snap to nearest edge horizontally
      const snapToLeft = translateX.value < SCREEN_WIDTH / 2;
      const targetX = snapToLeft ? minX : maxX;

      // Constrain Y position
      let targetY = translateY.value;
      if (targetY < minY) targetY = minY;
      if (targetY > maxY) targetY = maxY;

      translateX.value = withSpring(targetX, { damping: 15, stiffness: 150 });
      translateY.value = withSpring(targetY, { damping: 15, stiffness: 150 });
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      scale.value = withSpring(1.1);
      runOnJS(triggerHaptic)();
    });

  const composedGesture = Gesture.Simultaneous(panGesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            left: 0,
            flexDirection: "row",
            borderRadius: 28,
            paddingHorizontal: CONTAINER_PADDING,
            paddingVertical: CONTAINER_PADDING,
            backgroundColor: "rgba(18, 15, 26, 0.95)",
            borderWidth: 1.5,
            borderColor: accentColor,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          },
          animatedStyle,
        ]}
      >
        <Pressable
          onPress={onGoBack}
          disabled={!canGoBack}
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: BUTTON_SIZE / 2,
            opacity: canGoBack ? 1 : 0.3,
            backgroundColor: canGoBack ? "rgba(255,255,255,0.1)" : "transparent",
          }}
        >
          <Ionicons name="chevron-back" size={24} color={accentColor} />
        </Pressable>

        <Pressable
          onPress={onGoForward}
          disabled={!canGoForward}
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: BUTTON_SIZE / 2,
            marginHorizontal: 4,
            opacity: canGoForward ? 1 : 0.3,
            backgroundColor: canGoForward ? "rgba(255,255,255,0.1)" : "transparent",
          }}
        >
          <Ionicons name="chevron-forward" size={24} color={accentColor} />
        </Pressable>

        <Pressable
          onPress={onRefresh}
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: BUTTON_SIZE / 2,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Ionicons name="refresh" size={22} color={accentColor} />
        </Pressable>

        {/* App Launch Button */}
        {appUrlScheme && (
          <Pressable
            onPress={handleOpenApp}
            style={{
              width: BUTTON_SIZE,
              height: BUTTON_SIZE,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: BUTTON_SIZE / 2,
              marginLeft: 4,
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          >
            <Ionicons name={appIcon} size={22} color={accentColor} />
          </Pressable>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
