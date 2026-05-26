import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image as ExpoImage } from "expo-image";
import { STUDIO } from "../utils/theme";
import * as Haptics from "expo-haptics";
import { upscaleImage as aiUpscaleImage, UpscaleScale } from "../api/image-upscaling";

const IMAGE_HISTORY_KEY = "image_generation_history";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface GeneratedImage {
  url: string;
  prompt: string;
  createdAt: number;
  model: string;
  aspectRatio: string;
  size: string;
}

export function ImageUpscalerScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [selectedScale, setSelectedScale] = useState<UpscaleScale>(2);

  useEffect(() => {
    loadGeneratedImages();
  }, []);

  const loadGeneratedImages = async () => {
    try {
      const stored = await AsyncStorage.getItem(IMAGE_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored) as GeneratedImage[];
        setGeneratedImages(history);
      }
    } catch (err) {
      console.log("Error loading generated images:", err);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setError("Permission denied. We need access to your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setUpscaledImage(null);
        setError(null);
        setSuccessMessage(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err: any) {
      setError("Failed to pick image. Please try again.");
    }
  };

  const selectGeneratedImage = (image: GeneratedImage) => {
    setSelectedImage(image.url);
    setUpscaledImage(null);
    setError(null);
    setSuccessMessage(null);
    setShowImagePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUpscale = async () => {
    if (!selectedImage) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setProgress(0);
    setProgressStatus("Starting AI upscale...");

    try {
      const result = await aiUpscaleImage(
        selectedImage,
        { scale: selectedScale, model: "plus" },
        (prog, status) => {
          setProgress(prog);
          setProgressStatus(status);
        }
      );

      if (result.success && result.imageUri) {
        // Save the base64 data to a local file
        const fileName = `upscaled_${Date.now()}.png`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        // If result is base64 data URI, extract and save
        if (result.imageUri.startsWith("data:")) {
          const base64Data = result.imageUri.split(",")[1];
          await FileSystem.writeAsStringAsync(fileUri, base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setUpscaledImage(fileUri);
        } else {
          setUpscaledImage(result.imageUri);
        }

        setProgress(100);
        setProgressStatus("Complete!");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(result.error || "Upscaling failed");
      }
    } catch (err: any) {
      console.log("Upscale error:", err);
      setError(err.message || "Failed to upscale image. Please try again.");
      setProgress(0);
      setProgressStatus("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setTimeout(() => {
        setProgressStatus("");
        setProgress(0);
      }, 2000);
    }
  };

  const saveToLibrary = async () => {
    if (!upscaledImage) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Permission denied. We need access to save to your photo library.");
        return;
      }

      await MediaLibrary.saveToLibraryAsync(upscaledImage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccessMessage("Image saved to your photo library!");
    } catch (err) {
      setError("Failed to save image. Please try again.");
    }
  };

  const scaleOptions: { value: UpscaleScale; label: string }[] = [
    { value: 2, label: "2x" },
    { value: 4, label: "4x" },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold mb-2" style={{ color: STUDIO.text }}>
          AI Image Upscaler
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Enhance image quality with AI-powered upscaling
        </Text>

        {/* Image Selection Buttons */}
        <View className="flex-row gap-3 mb-6">
          <Pressable onPress={pickImage} className="flex-1">
            {({ pressed }) => (
              <LinearGradient
                colors={[STUDIO.swirlPink, STUDIO.swirlBlue] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View className="items-center justify-center">
                  <Ionicons name="image" size={24} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm mt-2 text-center">
                    Upload Photo
                  </Text>
                </View>
              </LinearGradient>
            )}
          </Pressable>

          <Pressable onPress={() => setShowImagePicker(true)} className="flex-1">
            {({ pressed }) => (
              <LinearGradient
                colors={[STUDIO.swirlCyan, STUDIO.swirlBlue] as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 12,
                  padding: 16,
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View className="items-center justify-center">
                  <Ionicons name="images" size={24} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm mt-2 text-center">
                    Use Generated
                  </Text>
                </View>
              </LinearGradient>
            )}
          </Pressable>
        </View>

        {/* Selected Image Preview */}
        {selectedImage && (
          <View className="mb-6">
            <Text
              className="text-sm font-semibold mb-3"
              style={{ color: STUDIO.nickelLight }}
            >
              ORIGINAL IMAGE
            </Text>
            <View
              className="rounded-lg overflow-hidden"
              style={{ backgroundColor: STUDIO.slate }}
            >
              <ExpoImage
                source={{ uri: selectedImage }}
                style={{ width: "100%", aspectRatio: 1 }}
                contentFit="contain"
              />
            </View>
          </View>
        )}

        {/* Scale Selection */}
        {selectedImage && !upscaledImage && (
          <View className="mb-4">
            <Text
              className="text-sm font-semibold mb-3"
              style={{ color: STUDIO.nickelLight }}
            >
              UPSCALE AMOUNT
            </Text>
            <View className="flex-row gap-3">
              {scaleOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setSelectedScale(option.value);
                    Haptics.selectionAsync();
                  }}
                  className="flex-1"
                >
                  {({ pressed }) => (
                    <View
                      className="py-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor:
                          selectedScale === option.value ? STUDIO.amber : STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Text
                        className="font-bold text-lg"
                        style={{
                          color:
                            selectedScale === option.value ? STUDIO.void : STUDIO.text,
                        }}
                      >
                        {option.label}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Upscale Button */}
        {selectedImage && !upscaledImage && (
          <>
            <Pressable onPress={handleUpscale} disabled={loading} className="mb-4">
              {({ pressed }) => (
                <LinearGradient
                  colors={[STUDIO.swirlOrange, STUDIO.swirlYellow] as any}
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
                          AI Upscaling...
                        </Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                        <Text className="text-white font-bold text-lg ml-2">
                          Upscale with AI ({selectedScale}x)
                        </Text>
                      </>
                    )}
                  </View>
                </LinearGradient>
              )}
            </Pressable>

            {/* Progress Bar */}
            {loading && progress > 0 && (
              <View className="mb-6">
                <View
                  className="rounded-lg p-4"
                  style={{ backgroundColor: STUDIO.slate }}
                >
                  {/* Status Text */}
                  <View className="flex-row items-center justify-between mb-2">
                    <Text
                      className="text-sm font-semibold flex-1 mr-2"
                      style={{ color: STUDIO.text }}
                      numberOfLines={1}
                    >
                      {progressStatus}
                    </Text>
                    <Text
                      className="text-sm font-bold"
                      style={{ color: STUDIO.amber }}
                    >
                      {Math.round(progress)}%
                    </Text>
                  </View>

                  {/* Progress Bar Background */}
                  <View
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: STUDIO.void }}
                  >
                    {/* Progress Bar Fill */}
                    <View
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: STUDIO.amber,
                      }}
                    />
                  </View>
                </View>
              </View>
            )}
          </>
        )}

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

        {/* Success Message */}
        {successMessage && (
          <View
            className="p-4 rounded-lg mb-6 flex-row items-start"
            style={{ backgroundColor: `${STUDIO.success}20` }}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={STUDIO.success}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <Text className="flex-1" style={{ color: STUDIO.success }}>
              {successMessage}
            </Text>
          </View>
        )}

        {/* Upscaled Image */}
        {upscaledImage && (
          <>
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: STUDIO.nickelLight }}
                >
                  AI ENHANCED IMAGE
                </Text>
                <View
                  className="px-3 py-1 rounded"
                  style={{ backgroundColor: STUDIO.success }}
                >
                  <Text className="text-xs font-bold text-white">{selectedScale}x Upscaled</Text>
                </View>
              </View>
              <View
                className="rounded-lg overflow-hidden"
                style={{ backgroundColor: STUDIO.slate }}
              >
                <ExpoImage
                  source={{ uri: upscaledImage }}
                  style={{ width: "100%", aspectRatio: 1 }}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View className="gap-3 mb-6">
              {/* Save to Library */}
              <Pressable onPress={saveToLibrary}>
                {({ pressed }) => (
                  <View
                    className="py-4 px-6 rounded-lg flex-row items-center justify-center"
                    style={{
                      backgroundColor: STUDIO.success,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Ionicons name="download" size={24} color="#FFFFFF" />
                    <Text className="text-white font-bold text-lg ml-2">
                      Save to Library
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Start Over */}
              <Pressable
                onPress={() => {
                  setSelectedImage(null);
                  setUpscaledImage(null);
                  setError(null);
                  setSuccessMessage(null);
                }}
              >
                {({ pressed }) => (
                  <View
                    className="py-4 px-6 rounded-lg flex-row items-center justify-center"
                    style={{
                      backgroundColor: STUDIO.slate,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Ionicons name="refresh" size={24} color={STUDIO.amber} />
                    <Text
                      className="font-bold text-lg ml-2"
                      style={{ color: STUDIO.amber }}
                    >
                      Upscale Another Image
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </>
        )}

        {/* Info Box */}
        <View
          className="p-4 rounded-lg"
          style={{ backgroundColor: STUDIO.slate }}
        >
          <View className="flex-row items-start">
            <Ionicons
              name="sparkles"
              size={20}
              color={STUDIO.amber}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <View className="flex-1">
              <Text className="font-semibold mb-1" style={{ color: STUDIO.text }}>
                AI-Powered Enhancement
              </Text>
              <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                Uses deep learning to intelligently upscale images while enhancing details. Perfect for album covers, artwork, and photos. Free daily limit: ~10-15 images.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Generated Images Picker Modal */}
      <Modal
        visible={showImagePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowImagePicker(false)}
      >
        <View
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.95)" }}
        >
          <SafeAreaView className="flex-1" edges={["top"]}>
            <View className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between px-5 py-4 border-b" style={{ borderBottomColor: STUDIO.border }}>
                <Text className="text-xl font-bold" style={{ color: STUDIO.text }}>
                  Select Generated Image
                </Text>
                <Pressable onPress={() => setShowImagePicker(false)}>
                  {({ pressed }) => (
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Ionicons name="close" size={24} color={STUDIO.text} />
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Images Grid */}
              <ScrollView
                className="flex-1 px-5 py-4"
                showsVerticalScrollIndicator={false}
              >
                {generatedImages.length === 0 ? (
                  <View className="flex-1 items-center justify-center py-20">
                    <Ionicons name="images-outline" size={64} color={STUDIO.nickelDark} />
                    <Text className="text-center mt-4 text-base" style={{ color: STUDIO.nickelDark }}>
                      No generated images yet
                    </Text>
                    <Text className="text-center mt-2 text-sm" style={{ color: STUDIO.nickelDark }}>
                      Create images in the Image Studio first
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap">
                    {generatedImages.map((img, index) => (
                      <Pressable
                        key={index}
                        onPress={() => selectGeneratedImage(img)}
                        style={{ width: (SCREEN_WIDTH - 50) / 3, padding: 5 }}
                      >
                        {({ pressed }) => (
                          <View
                            className="rounded-lg overflow-hidden"
                            style={{
                              aspectRatio: 1,
                              opacity: pressed ? 0.7 : 1,
                              backgroundColor: STUDIO.slate,
                            }}
                          >
                            <ExpoImage
                              source={{ uri: img.url }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                            />
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
