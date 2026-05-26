import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Modal,
  Dimensions,
  Share,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAudioStore, AudioTrack } from "../state/audioStore";
import { useFocusEffect } from "@react-navigation/native";
import { format } from "date-fns";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "../components/MiniPlayer";
import { STUDIO } from "../utils/theme";

type ContentTab = "all" | "downloads" | "edited" | "images";

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

interface GeneratedImage {
  url: string;
  prompt: string;
  createdAt: number;
  model: "openai" | "google" | "nanobananapro";
  aspectRatio: string;
  size: string;
}

const IMAGE_HISTORY_KEY = "image_generation_history";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function AudioTrackItem({
  track,
  onPress,
  onDelete,
  isEdited,
  isPlaying,
  isOpening,
}: {
  track: AudioTrack;
  onPress: () => void;
  onDelete: () => void;
  isEdited?: boolean;
  isPlaying?: boolean;
  isOpening?: boolean;
}) {
  const formatDuration = (ms: number) => {
    if (!ms) return "--:--";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Format edit settings for display
  const getEditBadges = () => {
    if (!track.savedSettings) return null;
    const badges: string[] = [];
    if (track.savedSettings.speed !== 1.0) {
      badges.push(`${track.savedSettings.speed.toFixed(2)}x`);
    }
    if (track.savedSettings.pitch !== 0) {
      const sign = track.savedSettings.pitch > 0 ? "+" : "";
      badges.push(`${sign}${track.savedSettings.pitch}st`);
    }
    if (track.savedSettings.loopStart !== null || track.savedSettings.loopEnd !== null) {
      badges.push("Trimmed");
    }
    return badges;
  };

  const editBadges = getEditBadges();

  return (
    <Pressable
      onPress={onPress}
      disabled={isOpening}
      className="rounded-xl p-4 mb-3 flex-row items-center"
      style={{
        backgroundColor: isPlaying ? TWILIGHT.shadow : TWILIGHT.dusk,
        borderWidth: isPlaying || isOpening ? 2 : 1,
        borderColor: isOpening ? TWILIGHT.cyan : isPlaying ? TWILIGHT.gold : TWILIGHT.purple,
        opacity: isOpening ? 0.7 : 1,
      }}
    >
      <View
        className="w-12 h-12 rounded-lg items-center justify-center mr-4"
        style={{
          backgroundColor: isPlaying
            ? "rgba(212, 168, 75, 0.3)"
            : isEdited
            ? "rgba(78, 205, 196, 0.2)"
            : "rgba(212, 168, 75, 0.2)",
        }}
      >
        <Ionicons
          name={isPlaying ? "volume-high" : isEdited ? "options" : "musical-note"}
          size={24}
          color={isPlaying ? TWILIGHT.gold : isEdited ? TWILIGHT.cyan : TWILIGHT.gold}
        />
      </View>

      <View className="flex-1 mr-3">
        <Text className="font-medium text-base mb-1" style={{ color: "#fff" }} numberOfLines={1}>
          {track.name}
        </Text>
        <View className="flex-row items-center flex-wrap">
          <Text className="text-sm" style={{ color: TWILIGHT.fur }}>
            {formatDuration(track.duration)}
          </Text>
          <Text className="text-sm mx-2" style={{ color: TWILIGHT.wolf }}>•</Text>
          <Text className="text-sm" style={{ color: TWILIGHT.fur }}>
            {format(track.createdAt, "MMM d, yyyy")}
          </Text>
        </View>
        {/* Edit badges row */}
        {isEdited && editBadges && editBadges.length > 0 && (
          <View className="flex-row items-center mt-1.5 flex-wrap">
            {editBadges.map((badge, index) => (
              <View
                key={index}
                className="px-2 py-0.5 rounded mr-1.5 mb-1"
                style={{ backgroundColor: "rgba(78, 205, 196, 0.2)" }}
              >
                <Text className="text-xs font-medium" style={{ color: TWILIGHT.cyan }}>
                  {badge}
                </Text>
              </View>
            ))}
            <Text className="text-[10px] ml-1" style={{ color: TWILIGHT.wolf }}>
              Applied on playback
            </Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={onDelete}
        hitSlop={10}
        className="w-10 h-10 items-center justify-center"
      >
        <Ionicons name="trash-outline" size={20} color={TWILIGHT.fur} />
      </Pressable>
    </Pressable>
  );
}

function ImageItem({
  image,
  onPress,
  onDelete,
}: {
  image: GeneratedImage;
  onPress: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="w-[48%] mb-3">
      <Pressable
        onPress={onPress}
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: TWILIGHT.dusk,
          borderWidth: 1,
          borderColor: TWILIGHT.purple,
        }}
      >
        <Image
          source={{ uri: image.url }}
          style={{ width: "100%", aspectRatio: 1 }}
          contentFit="cover"
          transition={200}
        />
        <View className="absolute bottom-0 left-0 right-0 p-2">
          <LinearGradient
            colors={["transparent", "rgba(10, 8, 18, 0.9)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 60,
            }}
          />
          <View className="flex-row items-center justify-between">
            <View
              className="px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: image.model === "google"
                  ? "rgba(78, 205, 196, 0.3)"
                  : image.model === "nanobananapro"
                  ? "rgba(42, 157, 143, 0.3)"
                  : "rgba(212, 168, 75, 0.3)",
              }}
            >
              <Text
                className="text-[10px] font-medium"
                style={{
                  color: image.model === "google"
                    ? TWILIGHT.cyan
                    : image.model === "nanobananapro"
                    ? TWILIGHT.teal
                    : TWILIGHT.gold
                }}
              >
                {image.model === "google" ? "Nano Banana" : image.model === "nanobananapro" ? "Banana Pro" : "OpenAI"}
              </Text>
            </View>
            <Pressable
              onPress={onDelete}
              hitSlop={10}
              className="w-6 h-6 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={14} color="#ff6b6b" />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const tracks = useAudioStore((s) => s.tracks);
  const removeTrack = useAudioStore((s) => s.removeTrack);

  const [activeTab, setActiveTab] = useState<ContentTab>("all");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<AudioTrack | null>(null);
  const [openingTrack, setOpeningTrack] = useState<string | null>(null);

  // Separate tracks
  const downloadedTracks = tracks.filter((t) => !t.savedSettings);
  const editedTracks = tracks.filter((t) => t.savedSettings);

  const loadImages = async () => {
    try {
      const stored = await AsyncStorage.getItem(IMAGE_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored) as GeneratedImage[];
        setImages(history.slice(0, 50));
      }
    } catch (err) {
      console.log("Error loading images:", err);
    }
  };

  // Load images on mount and when screen focuses
  useEffect(() => {
    loadImages();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadImages();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadImages();
    setRefreshing(false);
  };

  const handleTrackPress = async (track: AudioTrack) => {
    // Open the file in AudioStretch via share sheet
    if (!track.uri) return;

    setOpeningTrack(track.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(track.uri, {
          mimeType: "audio/mpeg",
          dialogTitle: "Open in AudioStretch",
          UTI: "public.audio",
        });
      } else {
        // Fallback: try to open AudioStretch app directly or App Store
        const schemes = ["audiostretch://", "com.noisegate.audiostretch://"];
        let opened = false;

        for (const scheme of schemes) {
          try {
            const canOpen = await Linking.canOpenURL(scheme);
            if (canOpen) {
              await Linking.openURL(scheme);
              opened = true;
              break;
            }
          } catch {
            // Continue to next scheme
          }
        }

        if (!opened) {
          // Open App Store page for AudioStretch
          await Linking.openURL("https://apps.apple.com/us/app/audiostretch/id571863178");
        }
      }
    } catch (error) {
      console.log("Error opening file:", error);
    } finally {
      setOpeningTrack(null);
    }
  };

  const handleDeleteImage = async (createdAt: number) => {
    const updated = images.filter((img) => img.createdAt !== createdAt);
    setImages(updated);
    try {
      const toSave = updated.filter((img) => !img.url.startsWith("data:")).slice(0, 20);
      await AsyncStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(toSave));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.log("Error deleting image:", err);
    }
  };

  const handleSaveImage = async (imageUrl: string) => {
    setSavingImage(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const filename = `library_${Date.now()}.png`;
      const fileUri = FileSystem.documentDirectory + filename;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

      if (downloadResult.status === 200) {
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.log("Save error:", err);
    } finally {
      setSavingImage(false);
    }
  };

  const handleShareImage = async (imageUrl: string) => {
    try {
      await Share.share({ url: imageUrl });
    } catch (err) {
      console.log("Share error:", err);
    }
  };

  const tabs: { id: ContentTab; label: string; count: number }[] = [
    { id: "all", label: "All", count: tracks.length + images.length },
    { id: "downloads", label: "Downloads", count: downloadedTracks.length },
    { id: "edited", label: "Edited", count: editedTracks.length },
    { id: "images", label: "Images", count: images.length },
  ];

  const isEmpty =
    (activeTab === "all" && tracks.length === 0 && images.length === 0) ||
    (activeTab === "downloads" && downloadedTracks.length === 0) ||
    (activeTab === "edited" && editedTracks.length === 0) ||
    (activeTab === "images" && images.length === 0);

  const getEmptyMessage = () => {
    switch (activeTab) {
      case "downloads":
        return {
          icon: "cube-outline" as const,
          title: "No downloads yet",
          subtitle: "Go to YT tab to download audio from YouTube",
        };
      case "edited":
        return {
          icon: "sparkles" as const,
          title: "No edited files yet",
          subtitle: "Use the Editor to trim and edit your audio",
        };
      case "images":
        return {
          icon: "eye-outline" as const,
          title: "No images yet",
          subtitle: "Go to Image tab to generate AI images",
        };
      default:
        return {
          icon: "cube-outline" as const,
          title: "Library is empty",
          subtitle: "Your downloads, edited files, and images will appear here",
        };
    }
  };

  return (
    <LinearGradient
      colors={[TWILIGHT.void, TWILIGHT.dark, TWILIGHT.shadow]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-14"
        style={{ borderBottomWidth: 1, borderBottomColor: TWILIGHT.purple }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => {
              setActiveTab(tab.id);
              Haptics.selectionAsync();
            }}
            className="px-4 py-2 mr-2 rounded-full flex-row items-center"
            style={{
              backgroundColor: activeTab === tab.id ? TWILIGHT.gold : TWILIGHT.dusk,
            }}
          >
            <Text
              className="font-semibold"
              style={{
                color: activeTab === tab.id ? TWILIGHT.void : TWILIGHT.fur,
              }}
            >
              {tab.label}
            </Text>
            <View
              className="ml-2 px-1.5 py-0.5 rounded-full min-w-[20px] items-center"
              style={{
                backgroundColor: activeTab === tab.id
                  ? "rgba(10, 8, 18, 0.3)"
                  : TWILIGHT.wolf,
              }}
            >
              <Text
                className="text-xs font-medium"
                style={{
                  color: activeTab === tab.id ? TWILIGHT.void : TWILIGHT.fur,
                }}
              >
                {tab.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: TWILIGHT.dusk }}
          >
            <Ionicons name={getEmptyMessage().icon} size={40} color={TWILIGHT.wolf} />
          </View>
          <Text className="text-xl font-bold mb-2 text-center" style={{ color: TWILIGHT.gold }}>
            {getEmptyMessage().title}
          </Text>
          <Text className="text-base text-center leading-6" style={{ color: TWILIGHT.fur }}>
            {getEmptyMessage().subtitle}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: playingTrack ? 140 : 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TWILIGHT.gold}
            />
          }
        >
          {/* Downloads Section */}
          {(activeTab === "all" || activeTab === "downloads") &&
            downloadedTracks.length > 0 && (
              <View className="mb-6">
                {activeTab === "all" && (
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="cube-outline" size={18} color={TWILIGHT.gold} />
                    <Text className="font-bold ml-2" style={{ color: TWILIGHT.gold }}>
                      Downloads
                    </Text>
                    <Text className="text-sm ml-2" style={{ color: TWILIGHT.fur }}>
                      ({downloadedTracks.length})
                    </Text>
                  </View>
                )}
                {downloadedTracks.map((track) => (
                  <AudioTrackItem
                    key={track.id}
                    track={track}
                    onPress={() => handleTrackPress(track)}
                    onDelete={() => removeTrack(track.id)}
                    isPlaying={playingTrack?.id === track.id}
                    isOpening={openingTrack === track.id}
                  />
                ))}
              </View>
            )}

          {/* Edited Section */}
          {(activeTab === "all" || activeTab === "edited") &&
            editedTracks.length > 0 && (
              <View className="mb-6">
                {activeTab === "all" && (
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="sparkles-outline" size={18} color={TWILIGHT.cyan} />
                    <Text className="font-bold ml-2" style={{ color: TWILIGHT.cyan }}>
                      Edited Files
                    </Text>
                    <Text className="text-sm ml-2" style={{ color: TWILIGHT.fur }}>
                      ({editedTracks.length})
                    </Text>
                  </View>
                )}
                {editedTracks.map((track) => (
                  <AudioTrackItem
                    key={track.id}
                    track={track}
                    onPress={() => handleTrackPress(track)}
                    onDelete={() => removeTrack(track.id)}
                    isEdited
                    isPlaying={playingTrack?.id === track.id}
                    isOpening={openingTrack === track.id}
                  />
                ))}
              </View>
            )}

          {/* Images Section */}
          {(activeTab === "all" || activeTab === "images") && images.length > 0 && (
            <View className="mb-6">
              {activeTab === "all" && (
                <View className="flex-row items-center mb-3">
                  <Ionicons name="eye-outline" size={18} color={TWILIGHT.amber} />
                  <Text className="font-bold ml-2" style={{ color: TWILIGHT.amber }}>
                    Generated Images
                  </Text>
                  <Text className="text-sm ml-2" style={{ color: TWILIGHT.fur }}>
                    ({images.length})
                  </Text>
                </View>
              )}
              <View className="flex-row flex-wrap justify-between">
                {images.map((image) => (
                  <ImageItem
                    key={image.createdAt}
                    image={image}
                    onPress={() => setPreviewImage(image)}
                    onDelete={() => handleDeleteImage(image.createdAt)}
                  />
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Image Preview Modal */}
      <Modal
        visible={previewImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <View className="flex-1" style={{ backgroundColor: TWILIGHT.void }}>
          <View
            className="flex-row justify-between items-center px-4 py-2"
            style={{ paddingTop: insets.top + 8 }}
          >
            <Pressable onPress={() => setPreviewImage(null)} className="p-2">
              <Ionicons name="close" size={28} color={TWILIGHT.gold} />
            </Pressable>
            <View className="flex-row">
              {previewImage && (
                <>
                  <Pressable
                    onPress={() => handleSaveImage(previewImage.url)}
                    disabled={savingImage}
                    className="p-2 mr-2"
                  >
                    <Ionicons
                      name="download-outline"
                      size={24}
                      color={savingImage ? TWILIGHT.wolf : TWILIGHT.gold}
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => handleShareImage(previewImage.url)}
                    className="p-2"
                  >
                    <Ionicons name="share-outline" size={24} color={TWILIGHT.gold} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {previewImage && (
            <View className="flex-1 justify-center items-center px-4">
              <View
                className="rounded-xl overflow-hidden"
                style={{ borderWidth: 2, borderColor: TWILIGHT.purple }}
              >
                <Image
                  source={{ uri: previewImage.url }}
                  style={{
                    width: SCREEN_WIDTH - 32,
                    height: SCREEN_WIDTH - 32,
                    maxHeight: "80%",
                  }}
                  contentFit="contain"
                  transition={200}
                />
              </View>
              <View className="mt-4 px-4">
                <Text
                  className="text-center text-sm"
                  style={{ color: "#fff" }}
                  numberOfLines={3}
                >
                  {previewImage.prompt}
                </Text>
                <View className="flex-row justify-center mt-2 items-center">
                  <View
                    className="px-2 py-1 rounded-md mr-2"
                    style={{
                      backgroundColor: previewImage.model === "google"
                        ? "rgba(78, 205, 196, 0.2)"
                        : previewImage.model === "nanobananapro"
                        ? "rgba(42, 157, 143, 0.2)"
                        : "rgba(212, 168, 75, 0.2)",
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: previewImage.model === "google"
                          ? TWILIGHT.cyan
                          : previewImage.model === "nanobananapro"
                          ? TWILIGHT.teal
                          : TWILIGHT.gold,
                      }}
                    >
                      {previewImage.model === "google" ? "Nano Banana" : previewImage.model === "nanobananapro" ? "Banana Pro" : "OpenAI"}
                    </Text>
                  </View>
                  <Text className="text-xs" style={{ color: TWILIGHT.fur }}>
                    {format(previewImage.createdAt, "MMM d, yyyy h:mm a")}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Mini Player */}
      {playingTrack && (
        <MiniPlayer
          track={playingTrack}
          onClose={() => setPlayingTrack(null)}
          bottomInset={insets.bottom}
        />
      )}
    </LinearGradient>
  );
}
