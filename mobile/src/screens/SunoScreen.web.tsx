import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { STUDIO } from "../utils/theme";

// Map old TWILIGHT names to STUDIO for compatibility
const TWILIGHT = {
  void: STUDIO.void,
  dark: STUDIO.dark,
  shadow: STUDIO.charcoal,
  dusk: STUDIO.slate,
  purple: STUDIO.border,
  gold: STUDIO.amber,
  amber: STUDIO.woodLight,
  cyan: STUDIO.swirlCyan,
  wolf: STUDIO.nickelDark,
  fur: STUDIO.nickelLight,
  midna: STUDIO.swirlOrange,
};

export function SunoScreen() {
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    // Open Suno in a new tab when component mounts
    window.open("https://suno.com", "_blank");
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: TWILIGHT.void, paddingTop: insets.top, justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ backgroundColor: TWILIGHT.dark, borderRadius: 16, padding: 32, alignItems: "center", maxWidth: 400 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: TWILIGHT.gold, justifyContent: "center", alignItems: "center", marginBottom: 20 }}>
            <Text style={{ fontSize: 40 }}>🎵</Text>
          </View>

          <Text style={{ fontSize: 24, fontWeight: "bold", color: TWILIGHT.fur, marginBottom: 12, textAlign: "center" }}>
            Opening Suno
          </Text>

          <Text style={{ fontSize: 16, color: TWILIGHT.wolf, textAlign: "center", marginBottom: 24 }}>
            Suno has been opened in a new browser tab. This is required because Suno cannot be embedded directly in the app for security reasons.
          </Text>

          <View style={{ borderTopWidth: 1, borderTopColor: TWILIGHT.shadow, paddingTop: 20, width: "100%" }}>
            <Pressable
              onPress={() => window.open("https://suno.com", "_blank")}
              style={{ backgroundColor: TWILIGHT.gold, borderRadius: 12, padding: 16, alignItems: "center" }}
            >
              <Text style={{ color: TWILIGHT.void, fontSize: 16, fontWeight: "bold" }}>
                Open Suno Again
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </GestureHandlerRootView>
  );
}
