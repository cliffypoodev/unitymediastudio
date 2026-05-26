import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { STUDIO } from "../utils/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Map old TWILIGHT names to STUDIO for compatibility
const TWILIGHT = {
  void: STUDIO.void,
  dark: STUDIO.dark,
  shadow: STUDIO.charcoal,
  dusk: STUDIO.slate,
  purple: STUDIO.border,
  gold: STUDIO.amber,
  amber: STUDIO.woodLight,
  bronze: STUDIO.wood,
  cyan: STUDIO.swirlCyan,
  teal: STUDIO.swirlBlue,
  wolf: STUDIO.nickelDark,
  fur: STUDIO.nickelLight,
  midna: STUDIO.swirlOrange,
};

export function DownloadScreen() {
  const insets = useSafeAreaInsets();
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const handleOpenYtmp3 = () => {
    const url = youtubeUrl.trim()
      ? `https://cnvmp3.com/v53?url=${encodeURIComponent(youtubeUrl)}`
      : "https://cnvmp3.com/v53";
    window.open(url, "_blank");
  };

  return (
    <View style={{ flex: 1, backgroundColor: TWILIGHT.void }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-8">
          <Text className="text-3xl font-bold mb-2" style={{ color: STUDIO.text }}>
            YouTube Audio Download
          </Text>
          <Text className="text-base" style={{ color: STUDIO.nickelDark }}>
            Download audio from YouTube videos
          </Text>
        </View>

        {/* Web Notice */}
        <View
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: STUDIO.charcoal, borderWidth: 1, borderColor: STUDIO.border }}
        >
          <View className="flex-row items-start mb-2">
            <Ionicons name="information-circle" size={24} color={STUDIO.amber} style={{ marginRight: 8 }} />
            <Text className="text-lg font-semibold flex-1" style={{ color: STUDIO.text }}>
              Web Version Notice
            </Text>
          </View>
          <Text className="text-sm leading-5" style={{ color: STUDIO.nickelDark }}>
            The full YouTube search and download features require the native mobile app. On web, you can use cnvmp3.com/v53 to download audio manually.
          </Text>
        </View>

        {/* YouTube URL Input */}
        <View className="mb-4">
          <Text className="text-sm font-semibold mb-2" style={{ color: STUDIO.nickelDark }}>
            YOUTUBE URL (OPTIONAL)
          </Text>
          <TextInput
            value={youtubeUrl}
            onChangeText={setYoutubeUrl}
            placeholder="Paste YouTube URL here..."
            placeholderTextColor={STUDIO.nickelDark}
            className="px-4 py-3 rounded-xl text-base"
            style={{
              backgroundColor: STUDIO.dark,
              color: STUDIO.text,
              borderWidth: 1,
              borderColor: STUDIO.border,
            }}
          />
        </View>

        {/* Open cnvmp3.com Button */}
        <Pressable onPress={handleOpenYtmp3} className="mb-6">
          {({ pressed }) => (
            <LinearGradient
              colors={[TWILIGHT.gold, TWILIGHT.amber] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                padding: 16,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="cloud-download" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text className="text-white text-lg font-bold">
                  Open cnvmp3.com
                </Text>
              </View>
            </LinearGradient>
          )}
        </Pressable>

        {/* Instructions */}
        <View className="mb-6">
          <Text className="text-lg font-bold mb-3" style={{ color: STUDIO.text }}>
            How to Download:
          </Text>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">1</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                Paste a YouTube URL in the field above (optional)
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">2</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                {"Tap \"Open cnvmp3.com\" to open the converter in a new tab"}
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">3</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                If you provided a URL, it will be pre-filled. Otherwise, paste one there
              </Text>
            </View>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <View
                className="w-6 h-6 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: STUDIO.amber }}
              >
                <Text className="text-white text-xs font-bold">4</Text>
              </View>
              <Text className="flex-1" style={{ color: STUDIO.nickelLight }}>
                Click convert and download your MP3 file
              </Text>
            </View>
          </View>
        </View>

        {/* Tip Box */}
        <View
          className="p-4 rounded-xl"
          style={{ backgroundColor: STUDIO.dark, borderWidth: 1, borderColor: STUDIO.border }}
        >
          <View className="flex-row items-start">
            <Ionicons name="bulb" size={20} color={STUDIO.amber} style={{ marginRight: 8, marginTop: 2 }} />
            <View className="flex-1">
              <Text className="font-semibold mb-1" style={{ color: STUDIO.text }}>
                Pro Tip
              </Text>
              <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                For the full experience with YouTube search, in-app downloads, and audio library management, download the Unity Studios mobile app!
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
