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
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { GestureHandlerRootView, GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
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

  // Gesture values for zoom and pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

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
    try {
      const updatedImages = images.filter((img) => img.url !== imageToDelete.url);
      setImages(updatedImages);
      await AsyncStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(updatedImages));
      setSelectedImage(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert("Error", "Failed to delete image");
    }
  };

  const saveImageToLibrary = async (image: GeneratedImage) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant media library permissions to save images"
        );
        return;
      }

      if (image.url.startsWith("data:")) {
        const base64Data = image.url.split(",")[1];
        const filename = `${FileSystem.cacheDirectory}image_${Date.now()}.jpg`;
        await FileSystem.writeAsStringAsync(filename, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await MediaLibrary.createAssetAsync(filename);
      } else {
        const filename = `${FileSystem.cacheDirectory}image_${Date.now()}.jpg`;
        await FileSystem.downloadAsync(image.url, filename);
        await MediaLibrary.createAssetAsync(filename);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Image saved to your library");
    } catch (err) {
      Alert.alert("Error", "Failed to save image");
    }
  };

  const shareImage = async (image: GeneratedImage) => {
    try {
      await Share.share({
        message: `AI Generated Image\nPrompt: ${image.prompt}`,
        url: image.url,
      });
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  const reusePrompt = (image: GeneratedImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const navigateToImage = (index: number) => {
    if (index >= 0 && index < images.length) {
      setSelectedIndex(index);
      setSelectedImage(images[index]);
      resetGestures();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;

      // Calculate focal point offset
      const adjustedFocalX = (focalX.value - SCREEN_WIDTH / 2 - savedTranslateX.value) / savedScale.value;
      const adjustedFocalY = (focalY.value - SCREEN_HEIGHT / 2 - savedTranslateY.value) / savedScale.value;

      translateX.value = savedTranslateX.value + adjustedFocalX * (scale.value - savedScale.value);
      translateY.value = savedTranslateY.value + adjustedFocalY * (scale.value - savedScale.value);
    })
    .onEnd(() => {
      // Limit scale between 1 and 4
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pan gesture for dragging
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (savedScale.value > 1) {
        // Only allow panning when zoomed in
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      } else {
        // Allow horizontal swipe for navigation when not zoomed
        translateX.value = event.translationX;
      }
    })
    .onEnd((event) => {
      if (savedScale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        // Handle swipe navigation
        if (event.translationX > 100 && event.velocityX > 300) {
          // Swipe right - go to previous
          runOnJS(navigatePrevious)();
        } else if (event.translationX < -100 && event.velocityX < -300) {
          // Swipe left - go to next
          runOnJS(navigateNext)();
        }
        translateX.value = withSpring(0);
      }
    });

  // Double tap to zoom
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (savedScale.value > 1) {
        // Zoom out
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to 2x at tap location
        const targetScale = 2;
        focalX.value = event.x;
        focalY.value = event.y;

        const adjustedFocalX = (event.x - SCREEN_WIDTH / 2) / savedScale.value;
        const adjustedFocalY = (event.y - SCREEN_HEIGHT / 2) / savedScale.value;

        scale.value = withSpring(targetScale);
        translateX.value = withSpring(adjustedFocalX * (1 - targetScale));
        translateY.value = withSpring(adjustedFocalY * (1 - targetScale));

        savedScale.value = targetScale;
        savedTranslateX.value = adjustedFocalX * (1 - targetScale);
        savedTranslateY.value = adjustedFocalY * (1 - targetScale);
      }
    });

  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(doubleTap, pinchGesture),
    panGesture
  );

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
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            className="flex-1"
            style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
          >
            <SafeAreaView className="flex-1 w-full" edges={["top"]}>
              {/* Image with Gestures */}
              <View className="flex-1 items-center justify-center">
                {selectedImage && (
                  <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.6, alignItems: "center", justifyContent: "center" }, animatedStyle]}>
                      <Image
                        source={{ uri: selectedImage.url }}
                        style={{
                          width: SCREEN_WIDTH - 32,
                          height: SCREEN_WIDTH - 32,
                        }}
                        contentFit="contain"
                      />
                    </Animated.View>
                  </GestureDetector>
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
                        onPress={() => selectedImage && saveImageToLibrary(selectedImage)}
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
                      onPress={() => {
                        if (selectedImage) {
                          Alert.alert(
                            "Delete Image",
                            "Are you sure you want to delete this image?",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete",
                                style: "destructive",
                                onPress: () => deleteImage(selectedImage),
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
              </View>
            </SafeAreaView>

            {/* Close Button - Positioned absolutely for easy access */}
            <View
              style={{
                position: "absolute",
                top: 60,
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
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}
