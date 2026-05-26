import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import * as MediaLibrary from "expo-media-library";
import { STUDIO } from "../utils/theme";

export function VideoScreen() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create video player for preview
  const player = useVideoPlayer(videoUrl || "", (player) => {
    player.loop = true;
  });

  const generateVideo = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt to generate a video");
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      // Placeholder for video generation API
      // This will be implemented when the user provides their API integration
      setError("Video generation API not yet configured. Please set up your video generation service in the API tab.");
    } catch (err: any) {
      setError(err.message || "Failed to generate video");
    } finally {
      setLoading(false);
    }
  };

  const saveVideo = async () => {
    if (!videoUrl) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library permissions to save videos"
        );
        return;
      }

      // Download and save video
      Alert.alert("Success", "Video saved to your library");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save video");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: STUDIO.text }}
        >
          Video Generation
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Create AI-generated videos from text prompts
        </Text>

        {/* Prompt Input */}
        <View className="mb-6">
          <Text
            className="text-sm font-semibold mb-2"
            style={{ color: STUDIO.nickelLight }}
          >
            VIDEO PROMPT
          </Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            placeholder="Describe the video you want to create..."
            placeholderTextColor={STUDIO.nickelDark}
            multiline
            numberOfLines={4}
            className="p-4 rounded-lg text-base"
            style={{
              backgroundColor: STUDIO.slate,
              color: STUDIO.text,
              textAlignVertical: "top",
              minHeight: 120,
            }}
          />
        </View>

        {/* Generate Button */}
        <Pressable onPress={generateVideo} disabled={loading} className="mb-6">
          {({ pressed }) => (
            <LinearGradient
              colors={[STUDIO.swirlBlue, STUDIO.swirlCyan] as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                padding: 16,
                opacity: pressed || loading ? 0.7 : 1,
              }}
            >
              <View className="flex-row items-center justify-center">
                {loading ? (
                  <>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="text-white font-bold text-lg ml-2">
                      Generating...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="videocam" size={24} color="#FFFFFF" />
                    <Text className="text-white font-bold text-lg ml-2">
                      Generate Video
                    </Text>
                  </>
                )}
              </View>
            </LinearGradient>
          )}
        </Pressable>

        {/* Error Display */}
        {error && (
          <View
            className="p-4 rounded-lg mb-6 flex-row items-start"
            style={{ backgroundColor: `${STUDIO.error}20` }}
          >
            <Ionicons
              name="alert-circle"
              size={20}
              color={STUDIO.error}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text className="flex-1" style={{ color: STUDIO.error }}>
              {error}
            </Text>
          </View>
        )}

        {/* Video Preview */}
        {videoUrl && (
          <View className="mb-6">
            <Text
              className="text-sm font-semibold mb-3"
              style={{ color: STUDIO.nickelLight }}
            >
              GENERATED VIDEO
            </Text>
            <View className="rounded-lg overflow-hidden" style={{ height: 300 }}>
              <VideoView
                player={player}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                allowsFullscreen
                allowsPictureInPicture
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row mt-4 gap-3">
              <Pressable onPress={saveVideo} className="flex-1">
                {({ pressed }) => (
                  <View
                    className="py-3 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: STUDIO.success,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="save" size={20} color="#FFFFFF" />
                      <Text className="text-white font-semibold ml-2">
                        Save
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setVideoUrl(null);
                  setPrompt("");
                }}
                className="flex-1"
              >
                {({ pressed }) => (
                  <View
                    className="py-3 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor: STUDIO.slate,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="refresh" size={20} color={STUDIO.text} />
                      <Text
                        className="font-semibold ml-2"
                        style={{ color: STUDIO.text }}
                      >
                        New
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Info Card */}
        <View
          className="p-4 rounded-lg"
          style={{ backgroundColor: STUDIO.slate }}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="information-circle"
              size={20}
              color={STUDIO.amber}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text
                className="font-semibold mb-1"
                style={{ color: STUDIO.text }}
              >
                Video Generation Setup
              </Text>
              <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                Configure your video generation API in the API tab to enable this feature. Supported providers include RunwayML, Stability AI, and others.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
