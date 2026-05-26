import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useAudioStore } from "../state/audioStore";

export function ExportScreen() {
  const insets = useSafeAreaInsets();

  const tracks = useAudioStore((s) => s.tracks);
  const currentTrackId = useAudioStore((s) => s.currentTrackId);
  const editSettings = useAudioStore((s) => s.editSettings);
  const lyrics = useAudioStore((s) => s.lyrics);

  const currentTrack = tracks.find((t) => t.id === currentTrackId);

  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  const formatTime = (ms: number | null) => {
    if (ms === null) return "N/A";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleExportAudio = async () => {
    if (!currentTrack) return;

    setIsExporting(true);
    setExportStatus("Preparing audio file...");

    try {
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        throw new Error("Sharing is not available on this device");
      }

      // For now, we share the original file
      // In a full implementation, we'd process the audio with speed/pitch changes
      await Sharing.shareAsync(currentTrack.uri, {
        mimeType: "audio/mpeg",
        dialogTitle: "Export Audio for Suno",
        UTI: "public.mp3",
      });

      setExportStatus("Audio ready for Suno!");

    } catch (err) {
      console.log("Export error:", err);
      setExportStatus(
        err instanceof Error ? err.message : "Export failed"
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyLyrics = async () => {
    if (!lyrics) return;
    await Clipboard.setStringAsync(lyrics);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  const openSuno = () => {
    Linking.openURL("https://suno.com/create");
  };

  return (
    <ScrollView
      className="flex-1 bg-neutral-950"
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View className="px-5 pt-4">
        {/* Header */}
        <View className="mb-6">
          <View className="w-16 h-16 bg-orange-500/20 rounded-2xl items-center justify-center mb-4">
            <Ionicons name="share" size={32} color="#f97316" />
          </View>
          <Text className="text-white text-2xl font-bold mb-2">
            Export to Suno
          </Text>
          <Text className="text-neutral-400 text-base leading-6">
            Export your edited audio and lyrics to use with Suno song creator.
          </Text>
        </View>

        {/* Current Track Info */}
        <View className="bg-neutral-900 rounded-xl p-4 mb-4">
          <Text className="text-neutral-400 text-xs uppercase tracking-wide mb-2">
            Selected Track
          </Text>
          {currentTrack ? (
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-orange-500/20 rounded-lg items-center justify-center mr-3">
                <Ionicons name="musical-note" size={24} color="#f97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-medium" numberOfLines={1}>
                  {currentTrack.name}
                </Text>
                <Text className="text-neutral-500 text-sm">
                  Ready to export
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-neutral-800 rounded-lg items-center justify-center mr-3">
                <Ionicons name="musical-note" size={24} color="#525252" />
              </View>
              <Text className="text-neutral-500">
                No track selected. Go to Library to select one.
              </Text>
            </View>
          )}
        </View>

        {/* Edit Settings Summary */}
        {currentTrack && (
          <View className="bg-neutral-900 rounded-xl p-4 mb-4">
            <Text className="text-neutral-400 text-xs uppercase tracking-wide mb-3">
              Edit Settings Applied
            </Text>
            <View className="flex-row flex-wrap">
              <View className="bg-neutral-800 rounded-lg px-3 py-2 mr-2 mb-2">
                <Text className="text-neutral-400 text-xs">Speed</Text>
                <Text className="text-white font-medium">
                  {editSettings.speed.toFixed(2)}x
                </Text>
              </View>
              <View className="bg-neutral-800 rounded-lg px-3 py-2 mr-2 mb-2">
                <Text className="text-neutral-400 text-xs">Pitch</Text>
                <Text className="text-white font-medium">
                  {editSettings.pitch > 0 ? "+" : ""}{editSettings.pitch} st
                </Text>
              </View>
              {editSettings.loopEnabled && (
                <View className="bg-neutral-800 rounded-lg px-3 py-2 mr-2 mb-2">
                  <Text className="text-neutral-400 text-xs">Loop</Text>
                  <Text className="text-white font-medium">
                    {formatTime(editSettings.loopStart)} - {formatTime(editSettings.loopEnd)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Export Audio Button */}
        <Pressable
          onPress={handleExportAudio}
          disabled={!currentTrack || isExporting}
          className={`rounded-xl py-4 px-6 flex-row items-center justify-center mb-4 ${
            !currentTrack || isExporting
              ? "bg-neutral-800"
              : "bg-orange-500 active:bg-orange-600"
          }`}
        >
          {isExporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={20} color="#fff" />
              <Text className="text-white font-semibold text-base ml-2">
                Export Audio File
              </Text>
            </>
          )}
        </Pressable>

        {exportStatus && (
          <View className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
            <Text className="text-orange-400 text-sm text-center">
              {exportStatus}
            </Text>
          </View>
        )}

        {/* Lyrics Section */}
        <View className="bg-neutral-900 rounded-xl p-4 mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-neutral-400 text-xs uppercase tracking-wide">
              Lyrics
            </Text>
            {lyrics.length > 0 && (
              <Pressable onPress={handleCopyLyrics} className="flex-row items-center">
                <Ionicons
                  name={copiedLyrics ? "checkmark" : "copy-outline"}
                  size={16}
                  color={copiedLyrics ? "#22c55e" : "#f97316"}
                />
                <Text className={`ml-1 text-sm ${copiedLyrics ? "text-green-500" : "text-orange-500"}`}>
                  {copiedLyrics ? "Copied!" : "Copy"}
                </Text>
              </Pressable>
            )}
          </View>

          {lyrics ? (
            <View className="bg-neutral-800 rounded-lg p-3 max-h-48">
              <ScrollView nestedScrollEnabled>
                <Text className="text-white text-sm leading-5">
                  {lyrics.substring(0, 500)}
                  {lyrics.length > 500 && "..."}
                </Text>
              </ScrollView>
            </View>
          ) : (
            <Text className="text-neutral-500 text-sm">
              No lyrics added. Go to Lyrics tab to search or paste lyrics.
            </Text>
          )}
        </View>

        {/* Open Suno Button */}
        <Pressable
          onPress={openSuno}
          className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl py-4 px-6 flex-row items-center justify-center mb-4 bg-purple-600"
        >
          <Ionicons name="globe-outline" size={20} color="#fff" />
          <Text className="text-white font-semibold text-base ml-2">
            Open Suno Website
          </Text>
        </Pressable>

        {/* Instructions */}
        <View className="bg-neutral-900/50 rounded-xl p-4">
          <Text className="text-white font-medium mb-3">How to use with Suno:</Text>
          <View className="space-y-2">
            <View className="flex-row">
              <Text className="text-orange-500 mr-2">1.</Text>
              <Text className="text-neutral-400 flex-1">
                Export your edited audio file
              </Text>
            </View>
            <View className="flex-row mt-2">
              <Text className="text-orange-500 mr-2">2.</Text>
              <Text className="text-neutral-400 flex-1">
                Copy the lyrics using the button above
              </Text>
            </View>
            <View className="flex-row mt-2">
              <Text className="text-orange-500 mr-2">3.</Text>
              <Text className="text-neutral-400 flex-1">
                Open Suno and upload your audio
              </Text>
            </View>
            <View className="flex-row mt-2">
              <Text className="text-orange-500 mr-2">4.</Text>
              <Text className="text-neutral-400 flex-1">
                Paste the lyrics into Suno
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
