import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { STUDIO } from "../utils/theme";
import { ImageStackParamList } from "../navigation/RootNavigator";

const IMAGE_HISTORY_KEY = "image_generation_history";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GeneratedImage {
  url: string;
  prompt: string;
  createdAt: number;
  model: string;
  aspectRatio: string;
  size: string;
}

export function ImageLibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ImageStackParamList>>();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);

  // Gesture values for zoom
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const stored = await AsyncStorage.getItem(IMAGE_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored) as GeneratedImage[];
        const validHistory = history.filter(
          (img) => !img.url.startsWith("data:") || img.url.length < 100000
        );
        setImages(validHistory);
      }
    } catch (err) {
      console.log("Error loading images:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (imageToDelete: GeneratedImage) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }
    try {
      const updatedImages = images.filter((img) => img.url !== imageToDelete.url);
      setImages(updatedImages);
      await AsyncStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(updatedImages));
      setSelectedImage(null);
    } catch (err) {
      window.alert("Failed to delete image");
    }
  };

  const downloadImage = async (image: GeneratedImage) => {
    try {
      const link = document.createElement("a");

      if (image.url.startsWith("data:")) {
        link.href = image.url;
        link.download = `ai_image_${Date.now()}.png`;
      } else {
        const response = await fetch(image.url);
        const blob = await response.blob();
        link.href = URL.createObjectURL(blob);
        link.download = `ai_image_${Date.now()}.png`;
      }

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.alert("Image downloaded!");
    } catch (err) {
      window.alert("Failed to download image");
    }
  };

  const shareImage = async (image: GeneratedImage) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI Generated Image",
          text: `Prompt: ${image.prompt}`,
          url: image.url,
        });
      } else {
        await navigator.clipboard.writeText(image.url);
        window.alert("Image URL copied to clipboard!");
      }
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  const reusePrompt = (image: GeneratedImage) => {
    closeImage();
    navigation.navigate("ImageCreate", { prompt: image.prompt });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const resetGestures = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    setIsZoomed(false);
  };

  const navigateToImage = (index: number) => {
    if (index >= 0 && index < images.length) {
      setSelectedIndex(index);
      setSelectedImage(images[index]);
      resetGestures();
    }
  };

  const navigateNext = () => {
    navigateToImage(selectedIndex + 1);
  };

  const navigatePrevious = () => {
    navigateToImage(selectedIndex - 1);
  };

  const openImage = (image: GeneratedImage, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
    resetGestures();
  };

  const closeImage = () => {
    setSelectedImage(null);
    resetGestures();
  };

  const handleDoubleTap = () => {
    if (isZoomed) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      setIsZoomed(false);
    } else {
      scale.value = withSpring(2.5);
      setIsZoomed(true);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: STUDIO.nickelDark }}>Loading images...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {images.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="images-outline" size={64} color={STUDIO.nickelDark} />
            <Text
              className="text-lg font-semibold mt-4"
              style={{ color: STUDIO.text }}
            >
              No Images Yet
            </Text>
            <Text className="text-sm mt-2" style={{ color: STUDIO.nickelDark }}>
              Create your first AI image
            </Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap">
            {images.map((image, index) => (
              <Pressable
                key={`${image.url}-${index}`}
                onPress={() => openImage(image, index)}
                className="p-1"
                style={{ width: SCREEN_WIDTH / 3 }}
              >
                {({ pressed }) => (
                  <View style={{ opacity: pressed ? 0.7 : 1 }}>
                    <Image
                      source={{ uri: image.url }}
                      style={{
                        width: "100%",
                        aspectRatio: 1,
                        borderRadius: 8,
                        backgroundColor: STUDIO.slate,
                      }}
                      contentFit="cover"
                    />
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Image Detail Modal */}
      <Modal
        visible={!!selectedImage}
        animationType="fade"
        transparent
        onRequestClose={closeImage}
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
              <Pressable onPress={closeImage}>
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

            {/* Image with double-tap zoom */}
            <View className="flex-1 items-center justify-center">
              {selectedImage && (
                <Pressable onPress={handleDoubleTap}>
                  <Animated.View
                    style={[
                      {
                        width: SCREEN_WIDTH,
                        height: SCREEN_HEIGHT * 0.6,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      animatedStyle,
                    ]}
                  >
                    <Image
                      source={{ uri: selectedImage.url }}
                      style={{
                        width: SCREEN_WIDTH - 32,
                        height: SCREEN_WIDTH - 32,
                      }}
                      contentFit="contain"
                    />
                  </Animated.View>
                </Pressable>
              )}
            </View>

            {/* Bottom Info Panel */}
            <View style={{ backgroundColor: STUDIO.void, paddingHorizontal: 16, paddingBottom: 16 }}>
              {selectedImage && (
                <>
                  {/* Image Counter & Navigation */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Pressable
                      onPress={navigatePrevious}
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
                      {selectedIndex + 1} / {images.length}
                    </Text>

                    <Pressable
                      onPress={navigateNext}
                      disabled={selectedIndex === images.length - 1}
                    >
                      {({ pressed }) => (
                        <View
                          className="w-10 h-10 rounded-full items-center justify-center"
                          style={{
                            backgroundColor: STUDIO.slate,
                            opacity: selectedIndex === images.length - 1 ? 0.3 : pressed ? 0.7 : 1,
                          }}
                        >
                          <Ionicons name="chevron-forward" size={24} color={STUDIO.text} />
                        </View>
                      )}
                    </Pressable>
                  </View>

                  {/* Image Info */}
                  <View className="p-4 rounded-lg mb-4" style={{ backgroundColor: STUDIO.dark }}>
                    <Text className="text-sm font-semibold mb-2" style={{ color: STUDIO.nickelLight }}>
                      PROMPT
                    </Text>
                    <Text className="text-base mb-4" style={{ color: STUDIO.text }} numberOfLines={3}>
                      {selectedImage.prompt}
                    </Text>

                    <View className="flex-row justify-between">
                      <View>
                        <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                          {formatDate(selectedImage.createdAt)}
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: STUDIO.nickelDark }}>
                          {selectedImage.model} • {selectedImage.aspectRatio}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row gap-3 mb-3">
                    <Pressable
                      onPress={() => selectedImage && reusePrompt(selectedImage)}
                      className="flex-1"
                    >
                      {({ pressed }) => (
                        <View
                          className="py-3 rounded-lg items-center justify-center"
                          style={{
                            backgroundColor: STUDIO.amber,
                            opacity: pressed ? 0.8 : 1,
                          }}
                        >
                          <View className="flex-row items-center">
                            <Ionicons name="repeat" size={20} color={STUDIO.void} />
                            <Text className="font-semibold ml-2" style={{ color: STUDIO.void }}>
                              Reuse Prompt
                            </Text>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  </View>

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => selectedImage && downloadImage(selectedImage)}
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
                      onPress={() => selectedImage && shareImage(selectedImage)}
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
                      onPress={() => selectedImage && deleteImage(selectedImage)}
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
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
