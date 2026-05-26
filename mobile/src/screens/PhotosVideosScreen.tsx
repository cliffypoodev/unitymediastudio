import React, { useState, useEffect, useRef } from "react";
import { View, Text, FlatList, Pressable, Image, Dimensions, Alert, Modal, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { VideoView, useVideoPlayer } from "expo-video";
import { STUDIO } from "../utils/theme";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { safeHaptics, ImpactFeedbackStyle } from "../utils/platform";

const { width } = Dimensions.get("window");
const SCREEN_WIDTH = width;
const numColumns = 3;
const imageSize = (width - 40 - (numColumns - 1) * 8) / numColumns;

// Separate component for video modal to properly handle player lifecycle
function VideoPreviewModal({
  video,
  videos,
  onClose,
  onNavigate,
}: {
  video: MediaLibrary.Asset | null;
  videos: MediaLibrary.Asset[];
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}) {
  const [videoUri, setVideoUri] = useState<string>("");
  const translateX = useSharedValue(0);

  // Get current video index
  const getCurrentIndex = () => {
    if (!video) return -1;
    return videos.findIndex(v => v.id === video.id);
  };

  const navigateToPrevious = () => {
    if (getCurrentIndex() > 0) {
      onNavigate('prev');
      safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  const navigateToNext = () => {
    const currentIndex = getCurrentIndex();
    if (currentIndex < videos.length - 1 && currentIndex !== -1) {
      onNavigate('next');
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
        runOnJS(navigateToPrevious)();
      } else if (event.translationX < -threshold) {
        runOnJS(navigateToNext)();
      }

      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 0.5 }],
    opacity: 1 - Math.abs(translateX.value) / SCREEN_WIDTH * 0.5,
  }));

  // Load actual video URI when video is selected
  useEffect(() => {
    const loadVideoUri = async () => {
      if (video) {
        try {
          console.log("[Video] Loading video:", video.filename);
          const assetInfo = await MediaLibrary.getAssetInfoAsync(video.id);
          console.log("[Video] Asset info:", JSON.stringify(assetInfo, null, 2));

          let uri = assetInfo.localUri || assetInfo.uri;

          // Remove fragment if present
          if (uri && uri.includes("#")) {
            uri = uri.split("#")[0];
          }

          // Copy the video to a temporary file to avoid permission issues
          if (uri) {
            console.log("[Video] Copying video to temp location...");
            const filename = video.filename || "video.mp4";
            const tempUri = `${FileSystem.cacheDirectory}${Date.now()}_${filename}`;

            await FileSystem.copyAsync({
              from: uri,
              to: tempUri,
            });

            console.log("[Video] Playing from temp URI:", tempUri);
            setVideoUri(tempUri);
          }
        } catch (err) {
          console.log("[Video] Error loading video:", err);
        }
      } else {
        setVideoUri("");
      }
    };

    loadVideoUri();
  }, [video]);

  // Create player with the video URI
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = false;
  });

  // Auto-play when URI is set
  useEffect(() => {
    if (videoUri && player) {
      console.log("[Video] Starting playback");
      player.play();
    }
  }, [videoUri, player]);

  if (!video || !videoUri) return null;

  return (
    <Modal
      visible={!!video}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
          <View className="px-4 py-4 flex-row items-center justify-between" style={{ backgroundColor: STUDIO.dark }}>
            <Pressable onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              {({ pressed }) => (
                <View className="flex-row items-center" style={{ opacity: pressed ? 0.7 : 1 }}>
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
            {videoUri && (
              <>
                <GestureDetector gesture={swipeGesture}>
                  <Animated.View style={[animatedStyle]}>
                    <View
                      className="rounded-lg overflow-hidden mb-6"
                      style={{ height: 500, backgroundColor: STUDIO.charcoal }}
                    >
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

              <View className="p-4 rounded-lg" style={{ backgroundColor: STUDIO.dark }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View>
                    <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                      DURATION
                    </Text>
                    <Text className="text-base" style={{ color: STUDIO.text }}>
                      {Math.floor(video.duration / 60)}:{String(Math.floor(video.duration % 60)).padStart(2, "0")}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                      SIZE
                    </Text>
                    <Text className="text-base" style={{ color: STUDIO.text }}>
                      {video.width}x{video.height}
                    </Text>
                  </View>
                </View>

                {video.filename && (
                  <View className="mt-3">
                    <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                      FILENAME
                    </Text>
                    <Text className="text-base" style={{ color: STUDIO.text }} numberOfLines={1}>
                      {video.filename}
                    </Text>
                  </View>
                )}

                {video.creationTime && (
                  <View className="mt-3">
                    <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                      CREATED
                    </Text>
                    <Text className="text-base" style={{ color: STUDIO.text }}>
                      {new Date(video.creationTime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
    </Modal>
  );
}

export function PhotosVideosScreen() {
  const [videos, setVideos] = useState<MediaLibrary.Asset[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [selectedVideo, setSelectedVideo] = useState<MediaLibrary.Asset | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to view your videos"
        );
        setLoading(false);
        return;
      }

      setHasPermission(true);

      // Load all videos with pagination
      const loadAllVideos = async () => {
        let allVideos: MediaLibrary.Asset[] = [];
        let after: string | undefined = undefined;
        let hasNextPage = true;

        while (hasNextPage) {
          const result = await MediaLibrary.getAssetsAsync({
            mediaType: "video",
            sortBy: MediaLibrary.SortBy.creationTime,
            first: 100,
            after: after,
          });

          allVideos = [...allVideos, ...result.assets];
          hasNextPage = result.hasNextPage;
          after = result.endCursor;
        }

        return allVideos;
      };

      const allVideos = await loadAllVideos();
      setVideos(allVideos);
      setLoading(false);
    } catch (err) {
      console.log("Error loading videos:", err);
      Alert.alert("Error", "Failed to load videos");
      setLoading(false);
    }
  };

  const renderVideo = ({ item }: { item: MediaLibrary.Asset }) => (
    <Pressable
      onPress={() => {
        safeHaptics.impactAsync(ImpactFeedbackStyle.Medium);
        setSelectedVideo(item);
      }}
      style={{ marginBottom: 8, marginRight: 8 }}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: item.uri }}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: 8,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)",
            borderRadius: 8,
          }}
        >
          <Ionicons name="play-circle" size={40} color="#FFFFFF" />
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            backgroundColor: "rgba(0,0,0,0.6)",
            paddingHorizontal: 4,
            paddingVertical: 2,
            borderRadius: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 10 }}>
            {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, "0")}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: STUDIO.void }}
      edges={["bottom"]}
    >
      <View className="flex-1 px-5 pt-4">
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: STUDIO.text }}
        >
          Videos
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Videos from your iPhone
        </Text>

        {!hasPermission ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="videocam-outline" size={64} color={STUDIO.nickelDark} />
            <Text className="text-center mt-4" style={{ color: STUDIO.nickelDark }}>
              Photo library access is required
            </Text>
            <Pressable
              onPress={loadVideos}
              className="mt-4 px-6 py-3 rounded-lg"
              style={{ backgroundColor: STUDIO.amber }}
            >
              <Text className="font-semibold" style={{ color: STUDIO.void }}>
                Grant Access
              </Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View className="flex-1 items-center justify-center">
            <Text style={{ color: STUDIO.nickelDark }}>Loading videos...</Text>
          </View>
        ) : videos.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="videocam-outline" size={64} color={STUDIO.nickelDark} />
            <Text className="text-center mt-4" style={{ color: STUDIO.nickelDark }}>
              No videos found
            </Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            renderItem={renderVideo}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <VideoPreviewModal
        video={selectedVideo}
        videos={videos}
        onClose={() => setSelectedVideo(null)}
        onNavigate={(direction) => {
          const currentIndex = videos.findIndex(v => v.id === selectedVideo?.id);
          if (direction === 'prev' && currentIndex > 0) {
            setSelectedVideo(videos[currentIndex - 1]);
          } else if (direction === 'next' && currentIndex < videos.length - 1) {
            setSelectedVideo(videos[currentIndex + 1]);
          }
        }}
      />
    </SafeAreaView>
  );
}
