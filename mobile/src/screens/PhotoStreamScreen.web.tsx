import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, Pressable, Dimensions, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { STUDIO } from "../utils/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const numColumns = 3;
const imageSize = (SCREEN_WIDTH - 40 - (numColumns - 1) * 8) / numColumns;

interface PhotoItem {
  id: string;
  uri: string;
  name: string;
  width: number;
  height: number;
  creationTime: number;
}

export function PhotoStreamScreen() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dropZoneRef = useRef<HTMLDivElement | null>(null);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);

        const img = new window.Image();
        img.onload = () => {
          const photoItem: PhotoItem = {
            id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            uri: url,
            name: file.name,
            width: img.width,
            height: img.height,
            creationTime: file.lastModified,
          };
          setPhotos((prev) => [...prev, photoItem]);
        };
        img.src = url;
      }
    });
  }, []);

  const handleFileSelect = useCallback((event: Event) => {
    const target = event.target as HTMLInputElement;
    processFiles(target.files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [processFiles]);

  // Set up drag and drop event listeners
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer?.files || null);
    };

    dropZone.addEventListener("dragover", handleDragOver);
    dropZone.addEventListener("dragleave", handleDragLeave);
    dropZone.addEventListener("drop", handleDrop);

    return () => {
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);
    };
  }, [processFiles]);

  // Set up file input event listener
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    input.addEventListener("change", handleFileSelect);
    return () => {
      input.removeEventListener("change", handleFileSelect);
    };
  }, [handleFileSelect]);

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

  const openPhoto = (photo: PhotoItem, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
  };

  const navigateToPhoto = (index: number) => {
    if (index >= 0 && index < photos.length) {
      setSelectedIndex(index);
      setSelectedPhoto(photos[index]);
    }
  };

  const deletePhoto = (photo: PhotoItem) => {
    URL.revokeObjectURL(photo.uri);
    setPhotos(photos.filter(p => p.id !== photo.id));
    setSelectedPhoto(null);
  };

  const downloadPhoto = (photo: PhotoItem) => {
    const link = document.createElement("a");
    link.href = photo.uri;
    link.download = photo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPhoto = (item: PhotoItem, index: number) => (
    <Pressable
      key={item.id}
      onPress={() => openPhoto(item, index)}
      style={{ marginBottom: 8, marginRight: index % numColumns === numColumns - 1 ? 0 : 8 }}
    >
      {({ pressed }) => (
        <Image
          source={{ uri: item.uri }}
          style={{
            width: imageSize,
            height: imageSize,
            borderRadius: 8,
            opacity: pressed ? 0.7 : 1,
          }}
          contentFit="cover"
        />
      )}
    </Pressable>
  );

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: STUDIO.void }}
      edges={["bottom"]}
    >
      {/* Hidden file input - using raw HTML for web */}
      <input
        ref={(el) => { fileInputRef.current = el; }}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
      />

      <View className="flex-1 px-5 pt-4">
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: STUDIO.text }}
        >
          Photo Stream
        </Text>
        <Text className="text-base mb-4" style={{ color: STUDIO.nickelDark }}>
          Upload images from your computer
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
                Upload Photos
              </Text>
            </View>
          )}
        </Pressable>

        {/* Drop Zone / Photo Grid - using div for drag/drop support */}
        <div
          ref={(el) => { dropZoneRef.current = el; }}
          style={{ flex: 1, display: "flex", flexDirection: "column" }}
        >
          {photos.length === 0 ? (
            <View
              className="flex-1 items-center justify-center rounded-xl"
              style={{
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: isDragging ? STUDIO.amber : STUDIO.border,
                backgroundColor: isDragging ? "rgba(255, 191, 0, 0.1)" : "transparent",
              }}
            >
              <Ionicons
                name="images-outline"
                size={64}
                color={isDragging ? STUDIO.amber : STUDIO.nickelDark}
              />
              <Text
                className="text-center mt-4 text-lg"
                style={{ color: isDragging ? STUDIO.amber : STUDIO.nickelDark }}
              >
                {isDragging ? "Drop images here" : "Drag & drop images here"}
              </Text>
              <Text className="text-center mt-2" style={{ color: STUDIO.nickelDark }}>
                or click Upload Photos above
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
                {photos.map((photo, index) => renderPhoto(photo, index))}
              </View>
            </ScrollView>
          )}
        </div>
      </View>

      {/* Photo Preview Modal */}
      <Modal
        visible={!!selectedPhoto}
        animationType="fade"
        transparent
        onRequestClose={closePhoto}
      >
        <View
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
        >
          <SafeAreaView className="flex-1 w-full" edges={["top"]}>
            {/* Close Button */}
            <View
              style={{
                position: "absolute",
                top: 20,
                left: 16,
                zIndex: 1000,
              }}
            >
              <Pressable onPress={closePhoto}>
                {({ pressed }) => (
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: STUDIO.amber,
                      opacity: pressed ? 0.8 : 1,
                    }}
                  >
                    <Ionicons name="close" size={28} color={STUDIO.void} />
                  </View>
                )}
              </Pressable>
            </View>

            {/* Image with Navigation */}
            <View className="flex-1 items-center justify-center">
              {selectedPhoto && (
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={{
                    width: SCREEN_WIDTH - 32,
                    height: SCREEN_HEIGHT * 0.6,
                  }}
                  contentFit="contain"
                />
              )}
            </View>

            {/* Bottom Info Panel */}
            <View style={{ backgroundColor: STUDIO.void, paddingHorizontal: 16, paddingBottom: 16 }}>
              {selectedPhoto && (
                <>
                  {/* Photo Counter & Navigation */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Pressable
                      onPress={() => navigateToPhoto(selectedIndex - 1)}
                      disabled={selectedIndex === 0}
                    >
                      {({ pressed }) => (
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: STUDIO.slate,
                            opacity: selectedIndex === 0 ? 0.3 : pressed ? 0.7 : 1,
                          }}
                        >
                          <Ionicons name="chevron-back" size={24} color={STUDIO.text} />
                        </View>
                      )}
                    </Pressable>

                    <Text className="text-sm" style={{ color: STUDIO.nickelLight }}>
                      {selectedIndex + 1} / {photos.length}
                    </Text>

                    <Pressable
                      onPress={() => navigateToPhoto(selectedIndex + 1)}
                      disabled={selectedIndex === photos.length - 1}
                    >
                      {({ pressed }) => (
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: STUDIO.slate,
                            opacity: selectedIndex === photos.length - 1 ? 0.3 : pressed ? 0.7 : 1,
                          }}
                        >
                          <Ionicons name="chevron-forward" size={24} color={STUDIO.text} />
                        </View>
                      )}
                    </Pressable>
                  </View>

                  {/* Photo Info */}
                  <View className="p-4 rounded-lg mb-4" style={{ backgroundColor: STUDIO.dark }}>
                    <Text className="text-sm font-semibold mb-2" style={{ color: STUDIO.nickelLight }}>
                      PHOTO INFO
                    </Text>
                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                          {formatDate(selectedPhoto.creationTime)}
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: STUDIO.nickelDark }}>
                          {selectedPhoto.width} x {selectedPhoto.height}
                        </Text>
                      </View>
                      <View>
                        <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                          {selectedPhoto.name}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => selectedPhoto && downloadPhoto(selectedPhoto)}
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
                        if (selectedPhoto && window.confirm("Are you sure you want to remove this photo?")) {
                          deletePhoto(selectedPhoto);
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
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
