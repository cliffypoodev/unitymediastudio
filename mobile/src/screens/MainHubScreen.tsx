import React, { useEffect, useRef } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { STUDIO } from "../utils/theme";

interface MainHubScreenProps {
  onDismiss: () => void;
}

export function MainHubScreen({ onDismiss }: MainHubScreenProps) {
  const arrowY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // Animate arrows bouncing
    arrowY.value = withRepeat(
      withTiming(10, {
        duration: 800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );

    // After 1.5 seconds, fade out and dismiss
    opacity.value = withDelay(
      1500,
      withTiming(
        0,
        {
          duration: 500,
          easing: Easing.out(Easing.ease),
        },
        (finished) => {
          if (finished) {
            runOnJS(onDismiss)();
          }
        }
      )
    );
  }, []);

  const arrowAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: arrowY.value }],
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: STUDIO.void,
        },
        containerAnimatedStyle,
      ]}
      pointerEvents="none"
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "transparent" }}
        edges={["top"]}
      >
        <View className="flex-1 items-center justify-end pb-8" style={{ marginBottom: 88 }}>
          {/* Main Text */}
          <Text
            className="text-4xl font-bold text-center mb-8"
            style={{ color: STUDIO.text }}
          >
            Choose Below
          </Text>

          {/* Animated Arrows */}
          <Animated.View style={arrowAnimatedStyle}>
            <Ionicons name="chevron-down" size={48} color={STUDIO.amber} />
          </Animated.View>
          <Animated.View style={[arrowAnimatedStyle, { marginTop: -12 }]}>
            <Ionicons name="chevron-down" size={48} color={STUDIO.amber} style={{ opacity: 0.6 }} />
          </Animated.View>
          <Animated.View style={[arrowAnimatedStyle, { marginTop: -12 }]}>
            <Ionicons name="chevron-down" size={48} color={STUDIO.amber} style={{ opacity: 0.3 }} />
          </Animated.View>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
