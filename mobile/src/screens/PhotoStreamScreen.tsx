import React, { useState, useEffect } from "react";
import { View, Text, FlatList, Pressable, Dimensions, Alert, Modal, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as Haptics from "expo-haptics";
import { GestureHandlerRootView, GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { STUDIO } from "../utils/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const numColumns = 3;
const imageSize = (SCREEN_WIDTH - 40 - (numColumns - 1) * 8) / numColumns;

export function PhotoStreamScreen() {
  const [photos, setPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MediaLibrary.Asset | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant photo library access to view your photos"
        );
        setLoading(false);
        return;
      }

      setHasPermission(true);

      // Load all photos with pagination
      const loadAllPhotos = async () => {
        let allPhotos: MediaLibrary.Asset[] = [];
        let after: string | undefined = undefined;
        let hasNextPage = true;

        while (hasNextPage) {
          const result = await MediaLibrary.getAssetsAsync({
            mediaType: "photo",
            sortBy: MediaLibrary.SortBy.creationTime,
            first: 100,
            after: after,
          });

          allPhotos = [...allPhotos, ...result.assets];
          hasNextPage = result.hasNextPage;
          after = result.endCursor;
        }

        return allPhotos;
      };

      const allPhotos = await loadAllPhotos();
      setPhotos(allPhotos);
      setLoading(false);
    } catch (err) {
      console.log("Error loading photos:", err);
      Alert.alert("Error", "Failed to load photos");
      setLoading(false);
    }
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

  const resetGestures = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const navigateToPhoto = (index: number) => {
    if (index >= 0 && index < photos.length) {
      setSelectedIndex(index);
      setSelectedPhoto(photos[index]);
      resetGestures();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const navigateNext = () => {
    navigateToPhoto(selectedIndex + 1);
  };

  const navigatePrevious = () => {
    navigateToPhoto(selectedIndex - 1);
  };

  const openPhoto = (photo: MediaLibrary.Asset, index: number) => {
    setSelectedPhoto(photo);
    setSelectedIndex(index);
    resetGestures();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const closePhoto = () => {
    setSelectedPhoto(null);
    resetGestures();
  };

  const sharePhoto = async (photo: MediaLibrary.Asset) => {
    try {
      await Share.share({
        url: photo.uri,
      });
    } catch (err) {
      console.log("Error sharing:", err);
    }
  };

  const deletePhoto = async (photo: MediaLibrary.Asset) => {
    try {
      await MediaLibrary.deleteAssetsAsync([photo]);
      setPhotos(photos.filter(p => p.id !== photo.id));
      setSelectedPhoto(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Photo deleted from library");
    } catch (err) {
      Alert.alert("Error", "Failed to delete photo");
    }
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

  const renderPhoto = ({ item, index }: { item: MediaLibrary.Asset; index: number }) => (
    <Pressable
      onPress={() => openPhoto(item, index)}
      style={{ marginBottom: 8, marginRight: 8 }}
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
          Photo Stream
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Photos from your iPhone
        </Text>

        {!hasPermission ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="images-outline" size={64} color={STUDIO.nickelDark} />
            <Text className="text-center mt-4" style={{ color: STUDIO.nickelDark }}>
              Photo library access is required
            </Text>
            <Pressable
              onPress={loadPhotos}
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
            <Text style={{ color: STUDIO.nickelDark }}>Loading photos...</Text>
          </View>
        ) : photos.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="images-outline" size={64} color={STUDIO.nickelDark} />
            <Text className="text-center mt-4" style={{ color: STUDIO.nickelDark }}>
              No photos found
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhoto}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Photo Preview Modal */}
      <Modal
        visible={!!selectedPhoto}
        animationType="fade"
        transparent
        onRequestClose={closePhoto}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View
            className="flex-1"
            style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
          >
            <SafeAreaView className="flex-1 w-full" edges={["top"]}>
              {/* Image with Gestures */}
              <View className="flex-1 items-center justify-center">
                {selectedPhoto && (
                  <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7, alignItems: "center", justifyContent: "center" }, animatedStyle]}>
                      <Image
                        source={{ uri: selectedPhoto.uri }}
                        style={{
                          width: SCREEN_WIDTH - 32,
                          height: SCREEN_HEIGHT * 0.7 - 32,
                        }}
                        contentFit="contain"
                      />
                    </Animated.View>
                  </GestureDetector>
                )}
              </View>

              {/* Bottom Info Panel */}
              <View style={{ backgroundColor: STUDIO.void, paddingHorizontal: 16, paddingBottom: 16 }}>
                {selectedPhoto && (
                  <>
                    {/* Photo Counter & Navigation */}
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
                        {selectedIndex + 1} / {photos.length}
                      </Text>

                      <Pressable
                        onPress={navigateNext}
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
                            {formatDate(selectedPhoto.creationTime || selectedPhoto.modificationTime)}
                          </Text>
                          <Text className="text-xs mt-1" style={{ color: STUDIO.nickelDark }}>
                            {selectedPhoto.width} × {selectedPhoto.height}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="flex-row gap-3">
                      <Pressable
                        onPress={() => selectedPhoto && sharePhoto(selectedPhoto)}
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
                          if (selectedPhoto) {
                            Alert.alert(
                              "Delete Photo",
                              "Are you sure you want to delete this photo from your library?",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => deletePhoto(selectedPhoto),
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
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}
