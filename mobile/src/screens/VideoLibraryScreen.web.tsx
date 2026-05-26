import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { VideoStackParamList } from "../navigation/RootNavigator";
import { STUDIO } from "../utils/theme";

const VIDEO_HISTORY_KEY = "video_generation_history";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface GeneratedVideo {
  url: string;
  prompt: string;
  createdAt: number;
  model: string;
  duration?: number;
}

export function VideoLibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<VideoStackParamList>>();
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Get current video index
  const getCurrentIndex = () => {
    if (!selectedVideo) return -1;
    return videos.findIndex(v => v.url === selectedVideo.url);
  };

  const navigateToPrevious = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex > 0) {
      setSelectedVideo(videos[currentIndex - 1]);
    }
  };

  const navigateToNext = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex < videos.length - 1 && currentIndex !== -1) {
      setSelectedVideo(videos[currentIndex + 1]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadVideos();
    }, [])
  );

  const loadVideos = async () => {
    try {
      const stored = await AsyncStorage.getItem(VIDEO_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored) as GeneratedVideo[];
        setVideos(history);
      }
    } catch (err) {
      console.log("Error loading videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoToDelete: GeneratedVideo) => {
    if (!window.confirm("Are you sure you want to delete this video?")) {
      return;
    }
    try {
      const updatedVideos = videos.filter((vid) => vid.url !== videoToDelete.url);
      setVideos(updatedVideos);
      await AsyncStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(updatedVideos));
      setSelectedVideo(null);
    } catch (err) {
      window.alert("Failed to delete video");
    }
  };

  const downloadVideo = async (video: GeneratedVideo) => {
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ai_video_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.alert("Video downloaded!");
    } catch (err) {
      window.alert("Failed to download video");
    }
  };

  const shareVideo = async (video: GeneratedVideo) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI Generated Video",
          text: `Prompt: ${video.prompt}`,
          url: video.url,
        });
      } else {
        await navigator.clipboard.writeText(video.url);
        window.alert("Video URL copied to clipboard!");
      }
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  const toggleVideoSelection = (videoUrl: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoUrl)) {
      newSelection.delete(videoUrl);
    } else {
      newSelection.add(videoUrl);
    }
    setSelectedVideos(newSelection);
  };

  const downloadSelectedVideos = async () => {
    if (selectedVideos.size < 1) {
      window.alert("Please select at least 1 video to download");
      return;
    }

    const videosToDownload = videos.filter((v) => selectedVideos.has(v.url));

    for (const video of videosToDownload) {
      await downloadVideo(video);
    }

    setMultiSelectMode(false);
    setSelectedVideos(new Set());
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: STUDIO.nickelDark }}>Loading videos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {videos.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="film-outline" size={64} color={STUDIO.nickelDark} />
            <Text
              className="text-lg font-semibold mt-4"
              style={{ color: STUDIO.text }}
            >
              No Videos Yet
            </Text>
            <Text className="text-sm mt-2" style={{ color: STUDIO.nickelDark }}>
              Create your first AI video
            </Text>
          </View>
        ) : (
          <View>
            {/* Multi-select header */}
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold" style={{ color: STUDIO.text }}>
                {multiSelectMode
                  ? `${selectedVideos.size} selected`
                  : `${videos.length} videos`}
              </Text>
              <View className="flex-row gap-2">
                {multiSelectMode ? (
                  <>
                    <Pressable
                      onPress={downloadSelectedVideos}
                      disabled={selectedVideos.size < 1}
                    >
                      {({ pressed }) => (
                        <View
                          className="px-4 py-2 rounded-lg flex-row items-center"
                          style={{
                            backgroundColor: selectedVideos.size >= 1 ? STUDIO.amber : STUDIO.slate,
                            opacity: pressed ? 0.7 : 1,
                          }}
                        >
                          <Ionicons
                            name="download"
                            size={16}
                            color={selectedVideos.size >= 1 ? STUDIO.void : STUDIO.nickelDark}
                          />
                          <Text
                            className="text-sm font-semibold ml-1"
                            style={{
                              color: selectedVideos.size >= 1 ? STUDIO.void : STUDIO.nickelDark,
                            }}
                          >
                            Download
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setMultiSelectMode(false);
                        setSelectedVideos(new Set());
                      }}
                    >
                      {({ pressed }) => (
                        <View
                          className="px-4 py-2 rounded-lg"
                          style={{
                            backgroundColor: STUDIO.slate,
                            opacity: pressed ? 0.7 : 1,
                          }}
                        >
                          <Text className="text-sm font-semibold" style={{ color: STUDIO.text }}>
                            Cancel
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <Pressable onPress={() => setMultiSelectMode(true)}>
                    {({ pressed }) => (
                      <View
                        className="px-4 py-2 rounded-lg flex-row items-center"
                        style={{
                          backgroundColor: STUDIO.slate,
                          opacity: pressed ? 0.7 : 1,
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color={STUDIO.text} />
                        <Text className="text-sm font-semibold ml-1" style={{ color: STUDIO.text }}>
                          Select
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            </View>

            {videos.map((video, index) => {
              const isSelected = selectedVideos.has(video.url);
              return (
                <Pressable
                  key={`${video.url}-${index}`}
                  onPress={() => {
                    if (multiSelectMode) {
                      toggleVideoSelection(video.url);
                    } else {
                      setSelectedVideo(video);
                    }
                  }}
                  className="mb-4"
                >
                  {({ pressed }) => (
                    <View
                      className="rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: STUDIO.amber,
                      }}
                    >
                      <View style={{ height: 200, backgroundColor: STUDIO.charcoal }}>
                        {/* Thumbnail overlay */}
                        <View
                          className="absolute inset-0 items-center justify-center"
                          style={{ backgroundColor: STUDIO.charcoal }}
                        >
                          <View
                            className="w-16 h-16 rounded-full items-center justify-center"
                            style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                          >
                            <Ionicons name="play" size={32} color={STUDIO.void} />
                          </View>
                        </View>
                        {/* Selection indicator */}
                        {multiSelectMode && (
                          <View className="absolute top-3 right-3">
                            <View
                              className="w-8 h-8 rounded-full items-center justify-center"
                              style={{
                                backgroundColor: isSelected ? STUDIO.amber : "rgba(0,0,0,0.5)",
                              }}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark" size={20} color={STUDIO.void} />
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                      <View className="p-4">
                        <Text
                          className="text-sm font-semibold mb-1"
                          style={{ color: STUDIO.text }}
                          numberOfLines={2}
                        >
                          {video.prompt}
                        </Text>
                        <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                          {formatDate(video.createdAt)} • {video.model}
                        </Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Video Detail Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
          {/* Close Button - Top */}
          <View
            className="px-4 py-4 flex-row items-center justify-between"
            style={{ backgroundColor: STUDIO.dark }}
          >
            <Pressable onPress={() => setSelectedVideo(null)}>
              {({ pressed }) => (
                <View
                  className="flex-row items-center"
                  style={{ opacity: pressed ? 0.7 : 1 }}
                >
                  <Ionicons name="arrow-back" size={28} color={STUDIO.amber} />
                  <Text className="text-lg font-bold ml-3" style={{ color: STUDIO.text }}>
                    Video Preview
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Video counter */}
            <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
              {getCurrentIndex() + 1} / {videos.length}
            </Text>
          </View>

          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {selectedVideo && (
              <>
                <View
                  className="rounded-lg overflow-hidden"
                  style={{ height: 400, backgroundColor: STUDIO.charcoal }}
                >
                  <video
                    ref={(el) => { videoRef.current = el; }}
                    src={selectedVideo.url}
                    controls
                    autoPlay
                    loop
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />

                  {/* Navigation arrows */}
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingHorizontal: 16,
                      pointerEvents: "none",
                    }}
                  >
                    {getCurrentIndex() > 0 && (
                      <Pressable
                        onPress={navigateToPrevious}
                        style={{ padding: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 24, pointerEvents: "auto" }}
                      >
                        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                      </Pressable>
                    )}
                    <View style={{ flex: 1 }} />
                    {getCurrentIndex() < videos.length - 1 && (
                      <Pressable
                        onPress={navigateToNext}
                        style={{ padding: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 24, pointerEvents: "auto" }}
                      >
                        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* Video Info */}
                <View className="mt-6 p-4 rounded-lg" style={{ backgroundColor: STUDIO.dark }}>
                  <Text className="text-sm font-semibold mb-2" style={{ color: STUDIO.nickelLight }}>
                    PROMPT
                  </Text>
                  <Text className="text-base mb-4" style={{ color: STUDIO.text }}>
                    {selectedVideo.prompt}
                  </Text>

                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                        {formatDate(selectedVideo.createdAt)}
                      </Text>
                      <Text className="text-xs mt-1" style={{ color: STUDIO.nickelDark }}>
                        {selectedVideo.model}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Reuse Prompt Button */}
                <Pressable
                  onPress={() => {
                    if (selectedVideo) {
                      navigation.navigate("VideoCreate", { prompt: selectedVideo.prompt });
                      setSelectedVideo(null);
                    }
                  }}
                  className="mt-4"
                >
                  {({ pressed }) => (
                    <View
                      className="py-3 rounded-lg items-center justify-center flex-row"
                      style={{
                        backgroundColor: STUDIO.amber,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Ionicons name="reload" size={20} color={STUDIO.void} />
                      <Text className="font-semibold ml-2" style={{ color: STUDIO.void }}>
                        Reuse This Prompt
                      </Text>
                    </View>
                  )}
                </Pressable>

                {/* Action Buttons */}
                <View className="flex-row gap-3 mt-4">
                  <Pressable
                    onPress={() => selectedVideo && downloadVideo(selectedVideo)}
                    className="flex-1"
                  >
                    {({ pressed }) => (
                      <View
                        className="py-3 rounded-lg items-center justify-center"
                        style={{
                          backgroundColor: STUDIO.success,
                          opacity: pressed ? 0.7 : 1,
                        }}
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="download" size={20} color="#FFFFFF" />
                          <Text className="text-white font-semibold ml-2">Download</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => selectedVideo && shareVideo(selectedVideo)}
                    className="flex-1"
                  >
                    {({ pressed }) => (
                      <View
                        className="py-3 rounded-lg items-center justify-center"
                        style={{
                          backgroundColor: STUDIO.swirlBlue,
                          opacity: pressed ? 0.7 : 1,
                        }}
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="share-social" size={20} color="#FFFFFF" />
                          <Text className="text-white font-semibold ml-2">Share</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => selectedVideo && deleteVideo(selectedVideo)}
                    className="flex-1"
                  >
                    {({ pressed }) => (
                      <View
                        className="py-3 rounded-lg items-center justify-center"
                        style={{
                          backgroundColor: STUDIO.error,
                          opacity: pressed ? 0.7 : 1,
                        }}
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="trash" size={20} color="#FFFFFF" />
                          <Text className="text-white font-semibold ml-2">Delete</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
