import React from "react";
import { View, Text, Pressable, Dimensions, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { STUDIO } from "../utils/theme";

const { width, height } = Dimensions.get("window");

interface TitleScreenProps {
  onStart: () => void;
}

// Animated shimmer overlay component for swirl edges
function ShimmerOverlay() {
  const shimmerProgress = useSharedValue(0);
  const shimmerProgress2 = useSharedValue(0);
  const shimmerProgress3 = useSharedValue(0);

  useEffect(() => {
    // Multiple shimmer animations at different speeds for organic feel
    shimmerProgress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    shimmerProgress2.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    shimmerProgress3.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [shimmerProgress, shimmerProgress2, shimmerProgress3]);

  const shimmerStyle1 = useAnimatedStyle(() => ({
    opacity: 0.15 + shimmerProgress.value * 0.35,
  }));

  const shimmerStyle2 = useAnimatedStyle(() => ({
    opacity: 0.1 + shimmerProgress2.value * 0.3,
  }));

  const shimmerStyle3 = useAnimatedStyle(() => ({
    opacity: 0.2 + shimmerProgress3.value * 0.4,
  }));

  return (
    <View className="absolute inset-0" pointerEvents="none">
      {/* Top-right shimmer glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: height * 0.08,
            right: -width * 0.15,
            width: width * 0.7,
            height: width * 0.7,
          },
          shimmerStyle1,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 215, 0, 0.4)", "rgba(255, 191, 0, 0.2)", "transparent"]}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: width * 0.35,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Left edge shimmer */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: height * 0.2,
            left: -width * 0.2,
            width: width * 0.5,
            height: width * 0.5,
          },
          shimmerStyle2,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(192, 192, 192, 0.35)", "rgba(168, 168, 168, 0.15)", "transparent"]}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: width * 0.25,
          }}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>

      {/* Center swirl highlight */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: height * 0.15,
            left: width * 0.2,
            width: width * 0.6,
            height: width * 0.6,
          },
          shimmerStyle3,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.15)", "rgba(212, 168, 75, 0.1)", "transparent"]}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: width * 0.3,
          }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Bottom accent glow */}
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: height * 0.35,
            right: width * 0.05,
            width: width * 0.4,
            height: width * 0.4,
          },
          shimmerStyle1,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(139, 90, 43, 0.25)", "transparent"]}
          style={{
            width: "100%",
            height: "100%",
            borderRadius: width * 0.2,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}

export function TitleScreen({ onStart }: TitleScreenProps) {
  const buttonScale = useSharedValue(1);
  const buttonGlow = useSharedValue(0.6);

  useEffect(() => {
    // Subtle button glow pulse
    buttonGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [buttonGlow]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const buttonGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: buttonGlow.value,
  }));

  const handlePress = () => {
    // No haptics on web
    buttonScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1.05, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    setTimeout(onStart, 200);
  };

  return (
    <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
      {/* Swirl Background Image */}
      <ImageBackground
        source={require("../../assets/image-1765743010.jpeg")}
        style={{ flex: 1, width: "100%", height: "100%" }}
        resizeMode="cover"
        imageStyle={{ marginTop: -height * 0.1 }}
      >
        {/* Shimmering overlays on swirl edges */}
        <ShimmerOverlay />

        {/* Light overlay for subtle depth without hiding wallpaper */}
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.15)" }}>
          <View className="flex-1 items-center justify-end px-8 pb-16">
            {/* "Let's Go" Button - Vintage Radio Dial Style - Now in center-bottom area */}
            <Animated.View style={[buttonAnimatedStyle, buttonGlowStyle, { marginBottom: 80 }]}>
              <Pressable
                onPress={handlePress}
                style={{
                  shadowColor: STUDIO.amber,
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 30,
                  shadowOpacity: 0.7,
                  cursor: "pointer",
                }}
              >
                {/* Outer ring - brushed nickel effect with shimmer */}
                <View style={{ position: "relative" }}>
                  {/* Outer glow ring */}
                  <View
                    style={{
                      position: "absolute",
                      top: -4,
                      left: -4,
                      right: -4,
                      bottom: -4,
                      borderRadius: 36,
                      backgroundColor: "rgba(212, 168, 75, 0.15)",
                    }}
                  />

                  <LinearGradient
                    colors={[STUDIO.nickelDark, STUDIO.nickel, STUDIO.nickelLight, STUDIO.chrome, STUDIO.nickelLight, STUDIO.nickel, STUDIO.nickelDark]}
                    style={{
                      paddingHorizontal: 56,
                      paddingVertical: 20,
                      borderRadius: 32,
                      borderWidth: 3,
                      borderColor: STUDIO.chrome,
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text
                      style={{
                        fontSize: 22,
                        fontWeight: "900",
                        color: STUDIO.void,
                        letterSpacing: 4.5,
                        textTransform: "uppercase",
                        fontFamily: "System",
                        textShadowColor: "rgba(0, 0, 0, 0.5)",
                        textShadowOffset: { width: 1, height: 1 },
                        textShadowRadius: 2,
                      }}
                    >
                      {"Let's Go"}
                    </Text>
                  </LinearGradient>

                  {/* Enhanced button shimmer accent - chrome highlight */}
                  <View
                    style={{
                      position: "absolute",
                      top: 5,
                      left: 24,
                      right: 24,
                      height: 2,
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                      borderRadius: 1,
                    }}
                  />
                  {/* Secondary shimmer */}
                  <View
                    style={{
                      position: "absolute",
                      top: 9,
                      left: 28,
                      right: 28,
                      height: 1,
                      backgroundColor: "rgba(255, 255, 255, 0.4)",
                      borderRadius: 1,
                    }}
                  />
                  {/* Wood accent line at bottom - more pronounced */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 5,
                      left: 30,
                      right: 30,
                      height: 3,
                      backgroundColor: STUDIO.wood,
                      borderRadius: 1.5,
                      opacity: 0.8,
                    }}
                  />
                  {/* Wood shadow for depth */}
                  <View
                    style={{
                      position: "absolute",
                      bottom: 3,
                      left: 32,
                      right: 32,
                      height: 1,
                      backgroundColor: STUDIO.woodDark,
                      borderRadius: 1,
                      opacity: 0.6,
                    }}
                  />
                </View>
              </Pressable>
            </Animated.View>

            {/* Bottom decorative element - vintage dial marks */}
            <View className="items-center">
              <View className="flex-row items-center">
                {/* Left dial marks */}
                {[...Array(3)].map((_, i) => (
                  <View
                    key={`left-${i}`}
                    style={{
                      width: 12 - i * 3,
                      height: 2,
                      backgroundColor: STUDIO.nickelDark,
                      marginRight: 6,
                      borderRadius: 1,
                      opacity: 0.6 - i * 0.15,
                    }}
                  />
                ))}
                {/* Center diamond */}
                <View
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: STUDIO.amber,
                    transform: [{ rotate: "45deg" }],
                    marginHorizontal: 12,
                    shadowColor: STUDIO.amber,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                  }}
                />
                {/* Right dial marks */}
                {[...Array(3)].map((_, i) => (
                  <View
                    key={`right-${i}`}
                    style={{
                      width: 6 + i * 3,
                      height: 2,
                      backgroundColor: STUDIO.nickelDark,
                      marginLeft: 6,
                      borderRadius: 1,
                      opacity: 0.3 + i * 0.15,
                    }}
                  />
                ))}
              </View>
              <Text
                style={{
                  fontSize: 10,
                  color: STUDIO.textMuted,
                  letterSpacing: 4,
                  marginTop: 12,
                  fontWeight: "500",
                }}
              >
                CREATION TOOLKIT
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}
