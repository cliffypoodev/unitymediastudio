import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { useAudioStore } from "../state/audioStore";

// Twilight Princess color palette
const TWILIGHT = {
  void: "#0a0812",
  dark: "#120f1a",
  shadow: "#1a1525",
  dusk: "#251e33",
  purple: "#3d2e5a",
  gold: "#d4a84b",
  amber: "#c9943a",
  bronze: "#a67c2e",
  cyan: "#4ecdc4",
  teal: "#2a9d8f",
  wolf: "#4a4458",
  fur: "#6b5f7a",
};

export function EditorScreen() {
  const insets = useSafeAreaInsets();

  const tracks = useAudioStore((s) => s.tracks);
  const currentTrackId = useAudioStore((s) => s.currentTrackId);
  const setCurrentTrack = useAudioStore((s) => s.setCurrentTrack);

  const track = tracks.find((t) => t.id === currentTrackId);

  const [isOpening, setIsOpening] = useState(false);

  const formatTime = (ms: number) => {
    if (!ms) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSelectTrack = (trackId: string) => {
    setCurrentTrack(trackId);
  };

  const handleOpenInAudioStretch = async () => {
    if (!track?.uri) return;

    setIsOpening(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(track.uri, {
          mimeType: "audio/mpeg",
          dialogTitle: "Open in AudioStretch",
          UTI: "public.audio",
        });
      }
    } catch (error) {
      console.log("Error opening file:", error);
    } finally {
      setIsOpening(false);
    }
  };

  const handleOpenAudioStretchApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Try common URL schemes for AudioStretch
    const schemes = [
      "audiostretch://",
      "com.noisegate.audiostretch://",
    ];

    for (const scheme of schemes) {
      try {
        const canOpen = await Linking.canOpenURL(scheme);
        if (canOpen) {
          await Linking.openURL(scheme);
          return;
        }
      } catch {
        // Continue to next scheme
      }
    }

    // If no URL scheme works, open AudioStretch in the App Store
    try {
      // AudioStretch App Store link
      await Linking.openURL("https://apps.apple.com/us/app/audiostretch/id571863178");
    } catch {
      console.log("Could not open AudioStretch");
    }
  };

  // No track selected - show track picker
  if (!track) {
    return (
      <LinearGradient
        colors={[TWILIGHT.void, TWILIGHT.dark, TWILIGHT.shadow]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
          <View className="items-center mb-6">
            <View
              className="w-16 h-16 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: TWILIGHT.dusk }}
            >
              <Ionicons name="musical-note" size={32} color={TWILIGHT.wolf} />
            </View>
            <Text className="text-lg font-bold mb-1" style={{ color: TWILIGHT.gold }}>
              Select a Track
            </Text>
            <Text className="text-sm text-center" style={{ color: TWILIGHT.fur }}>
              Choose an audio file to edit in AudioStretch
            </Text>
          </View>

          {tracks.length === 0 ? (
            <View
              className="rounded-xl p-6 items-center"
              style={{ backgroundColor: TWILIGHT.dusk, borderWidth: 1, borderColor: TWILIGHT.purple }}
            >
              <Text className="text-center" style={{ color: TWILIGHT.fur }}>
                No audio files yet. Download some from the YT tab!
              </Text>
            </View>
          ) : (
            tracks.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => handleSelectTrack(t.id)}
                className="rounded-xl p-4 mb-3 flex-row items-center active:opacity-70"
                style={{ backgroundColor: TWILIGHT.dusk, borderWidth: 1, borderColor: TWILIGHT.purple }}
              >
                <View
                  className="w-12 h-12 rounded-lg items-center justify-center mr-4"
                  style={{ backgroundColor: "rgba(212, 168, 75, 0.2)" }}
                >
                  <Ionicons name="musical-note" size={24} color={TWILIGHT.gold} />
                </View>
                <View className="flex-1">
                  <Text className="font-medium" style={{ color: "#fff" }} numberOfLines={1}>
                    {t.name}
                  </Text>
                  <Text className="text-sm" style={{ color: TWILIGHT.fur }}>
                    {formatTime(t.duration)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={TWILIGHT.wolf} />
              </Pressable>
            ))
          )}

          {/* Open AudioStretch directly button */}
          <View className="mt-6 pt-6" style={{ borderTopWidth: 1, borderTopColor: TWILIGHT.purple }}>
            <Pressable
              onPress={handleOpenAudioStretchApp}
              className="rounded-xl py-4 flex-row items-center justify-center active:opacity-70"
              style={{ backgroundColor: TWILIGHT.dusk, borderWidth: 1, borderColor: TWILIGHT.cyan }}
            >
              <Ionicons name="apps-outline" size={20} color={TWILIGHT.cyan} />
              <Text className="font-semibold text-base ml-2" style={{ color: TWILIGHT.cyan }}>
                Switch to AudioStretch
              </Text>
            </Pressable>
            <Text className="text-xs text-center mt-2" style={{ color: TWILIGHT.wolf }}>
              Open AudioStretch to edit files already in that app
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[TWILIGHT.void, TWILIGHT.dark, TWILIGHT.shadow]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
      >
        {/* Track Info Card */}
        <View
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: TWILIGHT.dusk, borderWidth: 1, borderColor: TWILIGHT.purple }}
        >
          <View className="flex-row items-center mb-4">
            <View
              className="w-16 h-16 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: "rgba(212, 168, 75, 0.2)" }}
            >
              <Ionicons name="musical-note" size={32} color={TWILIGHT.gold} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold" style={{ color: "#fff" }} numberOfLines={2}>
                {track.name}
              </Text>
              <Text className="text-sm mt-1" style={{ color: TWILIGHT.fur }}>
                {formatTime(track.duration)}
              </Text>
            </View>
          </View>

          {/* Change track button */}
          <Pressable
            onPress={() => setCurrentTrack(null)}
            className="flex-row items-center justify-center py-2 active:opacity-70"
          >
            <Ionicons name="swap-horizontal" size={16} color={TWILIGHT.fur} />
            <Text className="text-sm ml-2" style={{ color: TWILIGHT.fur }}>
              Choose Different Track
            </Text>
          </Pressable>
        </View>

        {/* AudioStretch Logo/Icon Area */}
        <View className="items-center mb-6">
          <View
            className="w-24 h-24 rounded-2xl items-center justify-center mb-4"
            style={{
              backgroundColor: "rgba(78, 205, 196, 0.15)",
              borderWidth: 2,
              borderColor: TWILIGHT.cyan,
            }}
          >
            <Ionicons name="speedometer" size={48} color={TWILIGHT.cyan} />
          </View>
          <Text className="text-xl font-bold" style={{ color: TWILIGHT.gold }}>
            AudioStretch
          </Text>
          <Text className="text-sm text-center mt-2 px-4" style={{ color: TWILIGHT.fur }}>
            Professional audio editing with speed and pitch control
          </Text>
        </View>

        {/* Main Action Button */}
        <Pressable
          onPress={handleOpenInAudioStretch}
          disabled={isOpening}
          className="rounded-xl py-5 flex-row items-center justify-center mb-4 active:opacity-80"
          style={{
            backgroundColor: isOpening ? TWILIGHT.dusk : TWILIGHT.gold,
          }}
        >
          {isOpening ? (
            <>
              <ActivityIndicator size="small" color={TWILIGHT.gold} />
              <Text className="font-bold text-lg ml-3" style={{ color: TWILIGHT.gold }}>
                Opening...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="share-outline" size={24} color={TWILIGHT.void} />
              <Text className="font-bold text-lg ml-3" style={{ color: TWILIGHT.void }}>
                Edit in AudioStretch
              </Text>
            </>
          )}
        </Pressable>

        {/* Instructions */}
        <View
          className="rounded-xl p-4"
          style={{ backgroundColor: "rgba(78, 205, 196, 0.1)", borderWidth: 1, borderColor: "rgba(78, 205, 196, 0.3)" }}
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="information-circle" size={18} color={TWILIGHT.cyan} />
            <Text className="text-sm font-semibold ml-2" style={{ color: TWILIGHT.cyan }}>
              How to Edit
            </Text>
          </View>

          <View className="mb-3">
            <View className="flex-row items-start mb-2">
              <Text className="text-sm font-bold mr-2" style={{ color: TWILIGHT.gold }}>1.</Text>
              <Text className="text-sm flex-1" style={{ color: TWILIGHT.fur }}>
                Tap the button above
              </Text>
            </View>
            <View className="flex-row items-start mb-2">
              <Text className="text-sm font-bold mr-2" style={{ color: TWILIGHT.gold }}>2.</Text>
              <Text className="text-sm flex-1" style={{ color: TWILIGHT.fur }}>
                Select AudioStretch from the share menu
              </Text>
            </View>
            <View className="flex-row items-start mb-2">
              <Text className="text-sm font-bold mr-2" style={{ color: TWILIGHT.gold }}>3.</Text>
              <Text className="text-sm flex-1" style={{ color: TWILIGHT.fur }}>
                Adjust speed, pitch, and loop points
              </Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-sm font-bold mr-2" style={{ color: TWILIGHT.gold }}>4.</Text>
              <Text className="text-sm flex-1" style={{ color: TWILIGHT.fur }}>
                Export your edited audio from AudioStretch
              </Text>
            </View>
          </View>
        </View>

        {/* Open App Directly */}
        <Pressable
          onPress={handleOpenAudioStretchApp}
          className="rounded-xl py-4 flex-row items-center justify-center mt-4 active:opacity-70"
          style={{ backgroundColor: TWILIGHT.shadow }}
        >
          <Ionicons name="apps-outline" size={18} color={TWILIGHT.fur} />
          <Text className="font-medium text-sm ml-2" style={{ color: TWILIGHT.fur }}>
            Switch to AudioStretch
          </Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}
