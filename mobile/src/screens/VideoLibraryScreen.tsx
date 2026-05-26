import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
  Share,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { VideoStackParamList } from "../navigation/RootNavigator";
import { STUDIO } from "../utils/theme";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType } from "../utils/platform";

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
  const [stitching, setStitching] = useState(false);

  // Swipe navigation
  const translateX = useSharedValue(0);

  // Create video player for selected video - initialize with empty string
  const player = useVideoPlayer("", (player) => {
    player.loop = true;
  });

  // Get current video index
  const getCurrentIndex = () => {
    if (!selectedVideo) return -1;
    return videos.findIndex(v => v.url === selectedVideo.url);
  };

  const navigateToPrevious = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex > 0) {
      setSelectedVideo(videos[currentIndex - 1]);
      safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  const navigateToNext = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex < videos.length - 1 && currentIndex !== -1) {
      setSelectedVideo(videos[currentIndex + 1]);
      safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  // Swipe gesture for navigation
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = SCREEN_WIDTH * 0.25;

      if (event.translationX > threshold) {
        // Swipe right - go to previous
        runOnJS(navigateToPrevious)();
      } else if (event.translationX < -threshold) {
        // Swipe left - go to next
        runOnJS(navigateToNext)();
      }

      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.5 }], // Dampen the movement
    opacity: 1 - Math.abs(translateX.value) / SCREEN_WIDTH * 0.5,
  }));

  // Update player source and play when selectedVideo changes
  useEffect(() => {
    if (selectedVideo?.url && player) {
      // Stop current playback first
      player.pause();
      // Replace the video source and play
      player.replaceAsync(selectedVideo.url).then(() => {
        player.play();
      }).catch(err => {
        console.log("Error loading video:", err);
      });
    } else if (!selectedVideo && player) {
      // If no video selected, pause the player
      player.pause();
    }
  }, [selectedVideo?.url]);

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
    try {
      const updatedVideos = videos.filter((vid) => vid.url !== videoToDelete.url);
      setVideos(updatedVideos);
      await AsyncStorage.setItem(VIDEO_HISTORY_KEY, JSON.stringify(updatedVideos));
      setSelectedVideo(null);
      safeHaptics.notificationAsync(NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Error", "Failed to delete video");
    }
  };

  const saveVideoToLibrary = async (video: GeneratedVideo) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library permissions to save videos"
        );
        return;
      }

      const filename = `${FileSystem.cacheDirectory}video_${Date.now()}.mp4`;
      await FileSystem.downloadAsync(video.url, filename);
      await MediaLibrary.createAssetAsync(filename);

      safeHaptics.notificationAsync(NotificationFeedbackType.Success);
      Alert.alert("Success", "Video saved to your library");
    } catch (err) {
      Alert.alert("Error", "Failed to save video");
    }
  };

  const shareVideo = async (video: GeneratedVideo) => {
    try {
      await Share.share({
        message: `AI Generated Video\nPrompt: ${video.prompt}`,
        url: video.url,
      });
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

  const stitchVideos = async () => {
    if (selectedVideos.size < 2) {
      Alert.alert("Error", "Please select at least 2 videos to stitch together");
      return;
    }

    setStitching(true);
    try {
      // Get selected videos in order
      const videosToStitch = videos.filter((v) => selectedVideos.has(v.url));

      Alert.alert(
        "Video Stitching",
        `Stitching ${videosToStitch.length} videos together. This feature requires FFmpeg which is not available in this environment. Would you like to save these videos individually instead?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save Individually",
            onPress: async () => {
              for (const video of videosToStitch) {
                await saveVideoToLibrary(video);
              }
              setMultiSelectMode(false);
              setSelectedVideos(new Set());
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert("Error", "Failed to stitch videos");
    } finally {
      setStitching(false);
    }
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
                      onPress={stitchVideos}
                      disabled={selectedVideos.size < 2 || stitching}
                    >
                      {({ pressed }) => (
                        <View
                          className="px-4 py-2 rounded-lg flex-row items-center"
                          style={{
                            backgroundColor: selectedVideos.size >= 2 ? STUDIO.amber : STUDIO.slate,
                            opacity: pressed || stitching ? 0.7 : 1,
                          }}
                        >
                          <Ionicons
                            name="link"
                            size={16}
                            color={selectedVideos.size >= 2 ? STUDIO.void : STUDIO.nickelDark}
                          />
                          <Text
                            className="text-sm font-semibold ml-1"
                            style={{
                              color: selectedVideos.size >= 2 ? STUDIO.void : STUDIO.nickelDark,
                            }}
                          >
                            Stitch
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
                    safeHaptics.impactAsync(ImpactFeedbackStyle.Medium);
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
                        {/* Thumbnail overlay - video preview disabled for thumbnails */}
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
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
            {/* Close Button - Top */}
            <View
              className="px-4 py-4 flex-row items-center justify-between"
              style={{ backgroundColor: STUDIO.dark }}
            >
              <Pressable
                onPress={() => {
                  setSelectedVideo(null);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {({ pressed }) => (
                  <View
                    className="flex-row items-center"
                    style={{
                      opacity: pressed ? 0.7 : 1,
                    }}
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

            {/* Video with swipe gesture */}
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                padding: 16,
              }}
              showsVerticalScrollIndicator={false}
            >
              {selectedVideo && (
                <>
                  <GestureDetector gesture={swipeGesture}>
                    <Animated.View style={[animatedStyle]}>
                      <View className="rounded-lg overflow-hidden" style={{ height: 400, backgroundColor: STUDIO.charcoal }}>
                        <VideoView
                          player={player}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="contain"
                          allowsFullscreen
                          allowsPictureInPicture
                          nativeControls
                        />

                        {/* Navigation arrows */}
                        <View className="absolute inset-0 flex-row justify-between items-center px-4" style={{ pointerEvents: "box-none" }}>
                          {getCurrentIndex() > 0 && (
                            <Pressable
                              onPress={navigateToPrevious}
                              style={{ padding: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 24 }}
                            >
                              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                            </Pressable>
                          )}
                          <View style={{ flex: 1 }} />
                          {getCurrentIndex() < videos.length - 1 && (
                            <Pressable
                              onPress={navigateToNext}
                              style={{ padding: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 24 }}
                            >
                              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    </Animated.View>
                  </GestureDetector>

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
                      onPress={() => selectedVideo && saveVideoToLibrary(selectedVideo)}
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
                            <Ionicons name="save" size={20} color="#FFFFFF" />
                            <Text className="text-white font-semibold ml-2">Save</Text>
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
                      onPress={() => {
                        if (selectedVideo) {
                          Alert.alert(
                            "Delete Video",
                            "Are you sure you want to delete this video?",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: () => deleteVideo(selectedVideo),
                              },
                            ]
                          );
                        }
                      }}
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
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}
