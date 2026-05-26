import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable, Dimensions, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { STUDIO } from "../utils/theme";

const { width } = Dimensions.get("window");
const numColumns = 3;
const imageSize = (width - 40 - (numColumns - 1) * 8) / numColumns;

interface VideoItem {
  id: string;
  uri: string;
  name: string;
  duration: number;
  width: number;
  height: number;
  creationTime: number;
  thumbnailUri: string;
}

export function PhotosVideosScreen() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("video/")) {
        const url = URL.createObjectURL(file);

        // Create video element to get metadata
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          // Create thumbnail from first frame
          video.currentTime = 0.1;
        };

        video.onseeked = () => {
          // Create canvas to capture thumbnail
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0);
            const thumbnailUri = canvas.toDataURL("image/jpeg");

            const videoItem: VideoItem = {
              id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
              uri: url,
              name: file.name,
              duration: video.duration,
              width: video.videoWidth,
              height: video.videoHeight,
              creationTime: file.lastModified,
              thumbnailUri,
            };
            setVideos((prev) => [...prev, videoItem]);
          }
        };

        video.src = url;
      }
    });
  }, []);

  const handleFileSelect = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    processFiles(target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [processFiles]);

  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    input.addEventListener("change", handleFileSelect);
    return () => {
      input.removeEventListener("change", handleFileSelect);
    };
  }, [handleFileSelect]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getCurrentIndex = () => {
    if (!selectedVideo) return -1;
    return videos.findIndex(v => v.id === selectedVideo.id);
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

  const deleteVideo = (video: VideoItem) => {
    URL.revokeObjectURL(video.uri);
    setVideos(videos.filter(v => v.id !== video.id));
    setSelectedVideo(null);
  };

  const downloadVideo = (video: VideoItem) => {
    const link = document.createElement("a");
    link.href = video.uri;
    link.download = video.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderVideo = (item: VideoItem) => (
    <Pressable
      key={item.id}
      onPress={() => setSelectedVideo(item)}
      style={{ marginBottom: 8, marginRight: 8 }}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: item.thumbnailUri }}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: 8,
          }}
          contentFit="cover"
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
            {formatDuration(item.duration)}
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
      {/* Hidden file input */}
      <input
        ref={(el) => { fileInputRef.current = el; }}
        type="file"
        accept="video/*"
        multiple
        style={{ display: "none" }}
      />

      <View className="flex-1 px-5 pt-4">
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: STUDIO.text }}
        >
          Videos
        </Text>
        <Text className="text-base mb-4" style={{ color: STUDIO.nickelDark }}>
          Upload videos from your computer
        </Text>

        {/* Upload Button */}
        <Pressable onPress={triggerFileInput} className="mb-4">
          {({ pressed }) => (
            <View
              className="py-3 px-6 rounded-lg flex-row items-center justify-center"
              style={{
                backgroundColor: STUDIO.amber,
                opacity: pressed ? 0.8 : 1,
              }}
            >
              <Ionicons name="cloud-upload" size={20} color={STUDIO.void} />
              <Text className="font-semibold ml-2" style={{ color: STUDIO.void }}>
                Upload Videos
              </Text>
            </View>
          )}
        </Pressable>

        {videos.length === 0 ? (
          <View
            className="flex-1 items-center justify-center rounded-xl"
            style={{
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: STUDIO.border,
            }}
          >
            <Ionicons name="videocam-outline" size={64} color={STUDIO.nickelDark} />
            <Text className="text-center mt-4 text-lg" style={{ color: STUDIO.nickelDark }}>
              No videos uploaded
            </Text>
            <Text className="text-center mt-2" style={{ color: STUDIO.nickelDark }}>
              Click Upload Videos to get started
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
              }}
            >
              {videos.map((video) => renderVideo(video))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Video Preview Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
          <View className="px-4 py-4 flex-row items-center justify-between" style={{ backgroundColor: STUDIO.dark }}>
            <Pressable onPress={() => setSelectedVideo(null)}>
              {({ pressed }) => (
                <View className="flex-row items-center" style={{ opacity: pressed ? 0.7 : 1 }}>
                  <Ionicons name="arrow-back" size={28} color={STUDIO.amber} />
                  <Text className="text-lg font-bold ml-3" style={{ color: STUDIO.text }}>
                    Video Preview
                  </Text>
                </View>
              )}
            </Pressable>

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
                  className="rounded-lg overflow-hidden mb-6"
                  style={{ height: 400, backgroundColor: STUDIO.charcoal }}
                >
                  <video
                    ref={(el) => { videoRef.current = el; }}
                    src={selectedVideo.uri}
                    controls
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

                <View className="p-4 rounded-lg mb-4" style={{ backgroundColor: STUDIO.dark }}>
                  <View className="flex-row items-center justify-between mb-3">
                    <View>
                      <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                        DURATION
                      </Text>
                      <Text className="text-base" style={{ color: STUDIO.text }}>
                        {formatDuration(selectedVideo.duration)}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                        SIZE
                      </Text>
                      <Text className="text-base" style={{ color: STUDIO.text }}>
                        {selectedVideo.width}x{selectedVideo.height}
                      </Text>
                    </View>
                  </View>

                  {selectedVideo.name && (
                    <View className="mt-3">
                      <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                        FILENAME
                      </Text>
                      <Text className="text-base" style={{ color: STUDIO.text }} numberOfLines={1}>
                        {selectedVideo.name}
                      </Text>
                    </View>
                  )}

                  {selectedVideo.creationTime && (
                    <View className="mt-3">
                      <Text className="text-sm font-semibold mb-1" style={{ color: STUDIO.nickelLight }}>
                        CREATED
                      </Text>
                      <Text className="text-base" style={{ color: STUDIO.text }}>
                        {formatDate(selectedVideo.creationTime)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => selectedVideo && downloadVideo(selectedVideo)}
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
                          <Ionicons name="download" size={20} color="#FFFFFF" />
                          <Text className="text-white font-semibold ml-2">Download</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (selectedVideo && window.confirm("Are you sure you want to remove this video?")) {
                        deleteVideo(selectedVideo);
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
                          <Text className="text-white font-semibold ml-2">Remove</Text>
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
