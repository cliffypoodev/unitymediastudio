import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Share,
  Modal,
  Dimensions,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { generateImage, convertAspectRatioToSize } from "../api/image-generation";
import { SlimNavBar } from "../components/SlimNavBar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { STUDIO } from "../utils/theme";
import { ImageStackParamList } from "../navigation/RootNavigator";

type AspectRatio = "1:1" | "3:2" | "2:3";
type Quality = "low" | "medium" | "high";
type ModelProvider = "openai" | "google" | "nanobananapro" | "kling";
type ImageSize = "standard" | "hd" | "ultra";

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
  model: ModelProvider;
  aspectRatio: AspectRatio;
  size: ImageSize;
}

const IMAGE_HISTORY_KEY = "image_generation_history";
const PROMPT_HISTORY_KEY = "image_prompt_history";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Google Gemini image generation using Nano Banana (gemini-2.5-flash-image)
async function generateImageWithImagen(
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Google API key not configured. Please add your Google API key in the ENV tab.");
  }

  console.log("Calling Google Gemini Image API...");
  console.log("Using model: gemini-2.5-flash-image (Nano Banana)");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["Image"],
          imageConfig: {
            aspectRatio: aspectRatio === "3:2" ? "3:2" : aspectRatio === "2:3" ? "2:3" : "1:1",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.log("Google API error:", JSON.stringify(errorData));

    if (errorData?.error?.code === 403 || errorData?.error?.status === "PERMISSION_DENIED") {
      throw new Error("Google API access denied. Please check your API key permissions.");
    }
    if (errorData?.error?.code === 400) {
      const message = errorData?.error?.message || "";
      if (message.includes("safety") || message.includes("blocked")) {
        throw new Error("Image generation blocked by safety filters. Try a different prompt.");
      }
      if (message.includes("API key not valid") || message.includes("API_KEY_INVALID")) {
        throw new Error("Google API key is invalid. Please check your API key in the ENV tab.");
      }
      throw new Error("Invalid request. Please simplify your prompt and try again.");
    }
    if (errorData?.error?.code === 404) {
      throw new Error("Gemini image model not available.");
    }

    throw new Error(errorData?.error?.message || "Failed to generate image with Google.");
  }

  const data = await response.json();
  console.log("Google response received");

  const imagePart = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData);
  if (imagePart?.inlineData?.data) {
    const base64Image = imagePart.inlineData.data;
    const fileUri = FileSystem.documentDirectory + `gemini_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64Image, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  }

  throw new Error("No image generated. Try a different prompt.");
}

// Nano Banana Pro (gemini-3-pro-image-preview) - Higher quality, ~30 seconds
async function generateImageWithNanoBananaPro(
  prompt: string,
  aspectRatio: AspectRatio
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("Google API key not configured. Please add your Google API key in the ENV tab.");
  }

  console.log("Calling Nano Banana Pro API...");
  console.log("Using model: gemini-3-pro-image-preview (generation takes ~30 seconds)");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ["Image"],
          imageConfig: {
            aspectRatio: aspectRatio === "3:2" ? "16:9" : aspectRatio === "2:3" ? "9:16" : "1:1",
            imageSize: "2K",
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.log("Nano Banana Pro API error:", JSON.stringify(errorData));

    if (errorData?.error?.code === 400) {
      const message = errorData?.error?.message || "";
      if (message.includes("safety") || message.includes("blocked")) {
        throw new Error("Image generation blocked by safety filters. Try a different prompt.");
      }
      throw new Error("Invalid request. Please simplify your prompt.");
    }

    throw new Error(errorData?.error?.message || "Failed to generate image with Nano Banana Pro.");
  }

  const data = await response.json();
  console.log("Nano Banana Pro response received");

  const imagePart = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: { data: string; mimeType?: string } }) => p.inlineData);
  if (imagePart?.inlineData?.data) {
    const base64Image = imagePart.inlineData.data;
    const fileUri = FileSystem.documentDirectory + `nanobananapro_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64Image, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return fileUri;
  }

  throw new Error("No image generated. Try a different prompt.");
}

// Kling AI Image Generation
async function generateImageWithKling(
  prompt: string,
  aspectRatio: AspectRatio,
  sourceImage?: string
): Promise<string> {
  const accessKey = process.env.EXPO_PUBLIC_VIBECODE_KLING_ACCESS_KEY;
  const secretKey = process.env.EXPO_PUBLIC_VIBECODE_KLING_SECRET_KEY;

  if (!accessKey || !secretKey) {
    throw new Error(
      "Kling API keys not configured.\n\n" +
      "Please add both keys in the ENV tab:\n" +
      "- EXPO_PUBLIC_VIBECODE_KLING_ACCESS_KEY (your Access Key)\n" +
      "- EXPO_PUBLIC_VIBECODE_KLING_SECRET_KEY (your Secret Key)"
    );
  }

  console.log("Calling Kling Image API...");
  console.log("Using Kling AI for image generation");
  console.log("Access Key (first 10 chars):", accessKey?.substring(0, 10) + "...");

  // Generate JWT token for authentication
  const { generateKlingJWT } = await import("../api/kling-auth");
  const jwtToken = await generateKlingJWT(accessKey, secretKey);
  console.log("JWT token generated for Kling API");

  // Map aspect ratio to Kling format
  const aspectRatioMap = {
    "1:1": "1:1",
    "3:2": "16:9",
    "2:3": "9:16",
  };

  const requestBody: any = {
    model: "kolors",
    prompt: prompt,
    aspect_ratio: aspectRatioMap[aspectRatio],
    n: 1,
  };

  // Add source image if provided for image-to-image generation
  if (sourceImage) {
    try {
      const base64Image = await FileSystem.readAsStringAsync(sourceImage, {
        encoding: FileSystem.EncodingType.Base64,
      });
      requestBody.image = base64Image;
      console.log("Source image added to Kling request for image-to-image generation");
    } catch (imgErr) {
      console.log("Error reading source image:", imgErr);
      throw new Error("Failed to process source image: " + (imgErr as Error).message);
    }
  }

  console.log("Kling image request body:", JSON.stringify({
    ...requestBody,
    image: requestBody.image ? "[BASE64_DATA_OMITTED]" : undefined,
  }));

  const response = await fetch(
    "https://api.klingai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwtToken}`,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
      console.log("Kling API error:", JSON.stringify(errorData));
    } catch (jsonError) {
      console.log("Kling API error (no JSON):", response.status, response.statusText);
      throw new Error(`Kling API error: ${response.status} ${response.statusText}\n\nThe API returned an error without details. Please check:\n1. Your API keys are correct\n2. Your account has sufficient balance\n3. Try again in a few moments`);
    }

    // Handle specific error codes
    if (errorData?.code === 1102) {
      const actualMessage = errorData?.message || "Unknown error";
      throw new Error(
        `Kling API Error (Code 1102)\n\n` +
        `Message: ${actualMessage}\n\n` +
        `This error may indicate:\n` +
        `1. Image generation feature not enabled on your account\n` +
        `2. Insufficient credits/balance for image generation\n` +
        `3. API key permissions issue\n\n` +
        `Please check your Kling account settings at klingai.com to:\n` +
        `- Verify image generation is enabled\n` +
        `- Check your API usage quotas\n` +
        `- Ensure your API keys have image generation permissions`
      );
    }

    if (errorData?.error?.code === 403 || errorData?.code === 1000) {
      throw new Error("Kling API access denied. Please check your API key permissions.");
    }
    if (errorData?.error?.code === 400) {
      const message = errorData?.error?.message || "";
      if (message.includes("safety") || message.includes("blocked")) {
        throw new Error("Image generation blocked by safety filters. Try a different prompt.");
      }
      throw new Error("Invalid request. Please simplify your prompt and try again.");
    }

    throw new Error(errorData?.message || errorData?.error?.message || "Failed to generate image with Kling.");
  }

  let data: any = {};
  try {
    data = await response.json();
    console.log("Kling response received:", JSON.stringify(data).substring(0, 200));
  } catch (jsonError) {
    console.log("Failed to parse Kling success response");
    throw new Error("Failed to parse response from Kling. Please try again.");
  }

  // Kling uses a task-based system - get the task ID
  const taskId = data.data?.task_id;
  if (!taskId) {
    console.log("No task ID in response:", JSON.stringify(data));
    throw new Error("Failed to start image generation. No task ID received.");
  }

  console.log("Kling task started:", taskId);
  console.log("Polling for completion (this may take 20-60 seconds)...");

  // Poll for task completion
  let pollAttempts = 0;
  const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
  let imageUrl: string | null = null;

  while (pollAttempts < maxAttempts) {
    // Wait 2 seconds between polls
    await new Promise(resolve => setTimeout(resolve, 2000));
    pollAttempts++;

    console.log(`Polling attempt ${pollAttempts}/${maxAttempts}...`);

    const statusResponse = await fetch(
      `https://api.klingai.com/v1/images/generations/${taskId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${jwtToken}`,
        },
      }
    );

    if (!statusResponse.ok) {
      console.log("Status check failed:", statusResponse.status);
      continue; // Keep trying
    }

    const statusData = await statusResponse.json();
    console.log("Task status:", statusData.data?.task_status);

    // Check task status
    if (statusData.data?.task_status === "succeed") {
      // Task completed successfully
      imageUrl = statusData.data?.task_result?.images?.[0]?.url;
      if (imageUrl) {
        console.log("Image generation completed!");
        break;
      }
    } else if (statusData.data?.task_status === "failed") {
      throw new Error("Image generation failed. Please try again with a different prompt.");
    }
    // Otherwise keep polling (status is probably "processing")
  }

  if (!imageUrl) {
    throw new Error("Image generation timed out. Please try again.");
  }

  // Download and save locally
  const fileUri = FileSystem.documentDirectory + `kling_${Date.now()}.png`;
  const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
  if (downloadResult.status === 200) {
    return fileUri;
  }
  // Fallback to URL if download fails
  return imageUrl;
}

// Upscale image using the same model (re-generate with enhanced prompt)
async function upscaleImage(
  originalPrompt: string,
  aspectRatio: AspectRatio,
  model: ModelProvider
): Promise<string> {
  const enhancedPrompt = `${originalPrompt}, ultra high resolution, extremely detailed, sharp focus, 8K quality`;

  switch (model) {
    case "google":
      return generateImageWithImagen(enhancedPrompt, aspectRatio);
    case "nanobananapro":
      return generateImageWithNanoBananaPro(enhancedPrompt, aspectRatio);
    case "kling":
      return generateImageWithKling(enhancedPrompt, aspectRatio);
    default:
      const size = convertAspectRatioToSize(aspectRatio);
      return generateImage(enhancedPrompt, {
        size,
        quality: "high",
        format: "png",
      });
  }
}

// Zoomable Image Component for preview modal
interface ZoomableImageProps {
  uri: string;
  prompt: string;
  model: ModelProvider;
  size: ImageSize;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function ZoomableImage({ uri, prompt, model, size }: ZoomableImageProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Reset zoom when uri changes
  useEffect(() => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    setIsZoomed(false);
  }, [uri, scale, translateX, translateY]);

  const handleDoubleTap = useCallback(() => {
    if (isZoomed) {
      scale.value = withSpring(1);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      setIsZoomed(false);
    } else {
      scale.value = withSpring(2.5);
      setIsZoomed(true);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isZoomed, scale, translateX, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View className="flex-1 justify-center items-center">
      <Pressable onPress={handleDoubleTap}>
        <Animated.View style={animatedStyle}>
          <Image
            source={{ uri }}
            style={{
              width: SCREEN_WIDTH - 32,
              height: SCREEN_WIDTH - 32,
            }}
            contentFit="contain"
            transition={200}
          />
        </Animated.View>
      </Pressable>

      {/* Info overlay at bottom */}
      <View className="absolute bottom-8 left-4 right-4">
        <Text className="text-center text-sm mb-2" style={{ color: "#fff" }} numberOfLines={3}>
          {prompt}
        </Text>
        <View className="flex-row justify-center">
          <View
            className="px-2 py-1 rounded-md mr-2"
            style={{
              backgroundColor:
                model === "google"
                  ? "rgba(78, 205, 196, 0.2)"
                  : model === "nanobananapro"
                  ? "rgba(42, 157, 143, 0.2)"
                  : model === "kling"
                  ? "rgba(231, 127, 55, 0.2)"
                  : "rgba(212, 168, 75, 0.2)",
            }}
          >
            <Text
              className="text-xs font-medium"
              style={{
                color:
                  model === "google"
                    ? TWILIGHT.cyan
                    : model === "nanobananapro"
                    ? TWILIGHT.teal
                    : model === "kling"
                    ? TWILIGHT.midna
                    : TWILIGHT.gold,
              }}
            >
              {model === "google"
                ? "Nano Banana"
                : model === "nanobananapro"
                ? "Banana Pro"
                : model === "kling"
                ? "Kling AI"
                : "OpenAI"}
            </Text>
          </View>
          <View
            className="px-2 py-1 rounded-md"
            style={{ backgroundColor: "rgba(78, 205, 196, 0.2)" }}
          >
            <Text className="text-xs font-medium" style={{ color: TWILIGHT.cyan }}>
              {size === "ultra" ? "Ultra" : size === "hd" ? "HD" : "Standard"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ImageCreateScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<ImageStackParamList, "ImageCreate">>();
  const [prompt, setPrompt] = useState(route.params?.prompt || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedAspect, setSelectedAspect] = useState<AspectRatio>("1:1");
  const [selectedQuality, setSelectedQuality] = useState<Quality>("high");
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("openai");
  const [selectedSize, setSelectedSize] = useState<ImageSize>("standard");
  const [savingImage, setSavingImage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [upscalingImage, setUpscalingImage] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const [savedPromptHistory, setSavedPromptHistory] = useState<string[]>([]);
  const [sourceImage, setSourceImage] = useState<string | null>(null);

  // Get unique prompts from current session and saved history
  const uniquePrompts = React.useMemo(() => {
    const seen = new Set<string>();
    const currentPrompts = generatedImages
      .map((img) => img.prompt.replace(" (upscaled)", ""))
      .filter((p) => {
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      });

    // Add saved prompts that aren't already in current session
    const allPrompts = [...currentPrompts];
    for (const p of savedPromptHistory) {
      if (!seen.has(p)) {
        seen.add(p);
        allPrompts.push(p);
      }
    }

    return allPrompts.slice(0, 15);
  }, [generatedImages, savedPromptHistory]);

  const loadPromptHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROMPT_HISTORY_KEY);
      if (stored) {
        const prompts = JSON.parse(stored) as string[];
        setSavedPromptHistory(prompts.slice(0, 20));
      }
    } catch (err) {
      console.log("Error loading prompt history:", err);
    }
  };

  const savePromptToHistory = async (newPrompt: string) => {
    try {
      const cleanPrompt = newPrompt.replace(" (upscaled)", "").trim();
      if (!cleanPrompt) return;

      // Add to beginning, remove duplicates, limit to 20
      const updated = [cleanPrompt, ...savedPromptHistory.filter(p => p !== cleanPrompt)].slice(0, 20);
      setSavedPromptHistory(updated);
      await AsyncStorage.setItem(PROMPT_HISTORY_KEY, JSON.stringify(updated));
    } catch (err) {
      console.log("Error saving prompt history:", err);
    }
  };

  const loadImageHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem(IMAGE_HISTORY_KEY);
      console.log("[ImageHistory] Loading from storage...");
      console.log("[ImageHistory] Stored data exists:", !!stored);
      if (stored) {
        const history = JSON.parse(stored) as GeneratedImage[];
        console.log("[ImageHistory] Parsed history count:", history.length);
        // Only load non-base64 images (URLs) to avoid storage issues
        const validHistory = history.filter(img => !img.url.startsWith("data:") || img.url.length < 100000);
        console.log("[ImageHistory] Valid history count:", validHistory.length);
        if (validHistory.length > 0) {
          console.log("[ImageHistory] First image URL prefix:", validHistory[0].url.substring(0, 50));
        }
        setGeneratedImages(validHistory.slice(0, 20)); // Limit to 20 images
      } else {
        console.log("[ImageHistory] No stored history found");
      }
    } catch (err) {
      console.log("[ImageHistory] Error loading:", err);
    }
  };

  const saveImageHistory = useCallback(async () => {
    try {
      // Only save URL-based images (not base64 to avoid storage limits)
      const toSave = generatedImages
        .filter(img => !img.url.startsWith("data:"))
        .slice(0, 20);
      console.log("[ImageHistory] Saving", toSave.length, "images to storage");
      if (toSave.length > 0) {
        console.log("[ImageHistory] First image URL type:", toSave[0].url.substring(0, 30));
      }
      await AsyncStorage.setItem(IMAGE_HISTORY_KEY, JSON.stringify(toSave));
      console.log("[ImageHistory] Save complete");
    } catch (err) {
      console.log("[ImageHistory] Error saving:", err);
    }
  }, [generatedImages]);

  // Load image and prompt history on mount
  useEffect(() => {
    loadImageHistory();
    loadPromptHistory();
  }, []);

  // Save image history whenever it changes
  useEffect(() => {
    if (generatedImages.length > 0) {
      console.log("[ImageHistory] Triggering save from useEffect, count:", generatedImages.length);
      saveImageHistory();
    }
  }, [generatedImages, saveImageHistory]);

  const aspectRatios: { value: AspectRatio; label: string }[] = [
    { value: "1:1", label: "Square" },
    { value: "3:2", label: "Landscape" },
    { value: "2:3", label: "Portrait" },
  ];

  const qualityOptions: { value: Quality; label: string }[] = [
    { value: "low", label: "Fast" },
    { value: "medium", label: "Balanced" },
    { value: "high", label: "Best" },
  ];

  const sizeOptions: { value: ImageSize; label: string; desc: string }[] = [
    { value: "standard", label: "Standard", desc: "1024px" },
    { value: "hd", label: "HD", desc: "1536px" },
    { value: "ultra", label: "Ultra", desc: "2048px" },
  ];

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setError("Permission to access media library is required to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSourceImage(result.assets[0].uri);
        await Haptics.selectionAsync();
      }
    } catch (err) {
      console.log("Error picking image:", err);
      setError("Failed to pick image. Please try again.");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    Keyboard.dismiss();
    setIsGenerating(true);
    setError(null);

    try {
      let imageUrl: string;

      switch (selectedModel) {
        case "google":
          console.log("Generating image with Nano Banana:", prompt);
          imageUrl = await generateImageWithImagen(prompt, selectedAspect);
          break;
        case "nanobananapro":
          console.log("Generating image with Nano Banana Pro:", prompt);
          imageUrl = await generateImageWithNanoBananaPro(prompt, selectedAspect);
          break;
        case "kling":
          console.log("Generating image with Kling AI:", prompt);
          imageUrl = await generateImageWithKling(prompt, selectedAspect, sourceImage || undefined);
          break;
        default:
          const size = convertAspectRatioToSize(selectedAspect);
          console.log("Generating image with GPT-image-1:", prompt);
          console.log("Size:", size, "Quality:", selectedQuality);
          imageUrl = await generateImage(prompt, {
            size,
            quality: selectedQuality,
            format: "png",
          });
      }

      console.log("Image generated:", imageUrl.substring(0, 100));

      const newImage: GeneratedImage = {
        url: imageUrl,
        prompt: prompt.trim(),
        createdAt: Date.now(),
        model: selectedModel,
        aspectRatio: selectedAspect,
        size: selectedSize,
      };

      setGeneratedImages((prev) => [newImage, ...prev]);
      await savePromptToHistory(prompt.trim());
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.log("Image generation error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate image. Please try again."
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImage = async (imageUrl: string) => {
    setSavingImage(imageUrl);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setError("Permission to access media library is required to save images.");
        setSavingImage(null);
        return;
      }

      let fileUri = imageUrl;

      // If it's an HTTP URL, download it first
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        const filename = `generated_${Date.now()}.png`;
        const downloadPath = FileSystem.documentDirectory + filename;

        console.log("[SaveImage] Downloading from URL:", imageUrl.substring(0, 50));
        const downloadResult = await FileSystem.downloadAsync(imageUrl, downloadPath);

        if (downloadResult.status !== 200) {
          throw new Error("Download failed");
        }
        fileUri = downloadResult.uri;
      } else if (imageUrl.startsWith("file://")) {
        // Local file - check if it exists
        console.log("[SaveImage] Using local file:", imageUrl.substring(0, 50));
        const fileInfo = await FileSystem.getInfoAsync(imageUrl);
        if (!fileInfo.exists) {
          throw new Error("Image file no longer exists");
        }
        fileUri = imageUrl;
      } else {
        throw new Error("Unsupported image format");
      }

      console.log("[SaveImage] Saving to library:", fileUri.substring(0, 50));
      await MediaLibrary.saveToLibraryAsync(fileUri);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    } catch (err) {
      console.log("[SaveImage] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to save image. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingImage(null);
    }
  };

  const handleShareImage = async (imageUrl: string) => {
    try {
      await Share.share({
        url: imageUrl,
        message: Platform.OS === "android" ? imageUrl : undefined,
      });
    } catch (err) {
      console.log("Share error:", err);
    }
  };

  const handleDeleteImage = (createdAt: number) => {
    setGeneratedImages((prev) => prev.filter((img) => img.createdAt !== createdAt));
  };

  const handleUpscaleImage = async (image: GeneratedImage) => {
    setUpscalingImage(image.createdAt);
    setError(null);

    try {
      console.log("Upscaling image with prompt:", image.prompt);
      const upscaledUrl = await upscaleImage(image.prompt, image.aspectRatio, image.model);

      const upscaledImage: GeneratedImage = {
        url: upscaledUrl,
        prompt: `${image.prompt} (upscaled)`,
        createdAt: Date.now(),
        model: image.model,
        aspectRatio: image.aspectRatio,
        size: "ultra",
      };

      setGeneratedImages((prev) => [upscaledImage, ...prev]);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.log("Upscale error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upscale image. Please try again."
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setUpscalingImage(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <LinearGradient
        colors={[TWILIGHT.void, TWILIGHT.dark, TWILIGHT.shadow]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-5 pt-4">
            {/* Prompt Input */}
            <View className="mb-3">
              <Text className="text-sm font-semibold mb-2" style={{ color: TWILIGHT.gold }}>
                Describe your vision
              </Text>
              <TextInput
                className="rounded-xl p-4 text-base min-h-[100px]"
                style={{
                  backgroundColor: TWILIGHT.dusk,
                  borderWidth: 1,
                  borderColor: TWILIGHT.purple,
                  color: "#fff",
                }}
                placeholder="A mystical twilight realm with floating particles..."
                placeholderTextColor={TWILIGHT.wolf}
                value={prompt}
                onChangeText={setPrompt}
                multiline
                textAlignVertical="top"
                editable={!isGenerating}
              />
            </View>

            {/* Prompt History Section */}
            {uniquePrompts.length > 0 && (
              <View className="mb-5">
                <Pressable
                  onPress={() => {
                    setShowPromptHistory(!showPromptHistory);
                    Haptics.selectionAsync();
                  }}
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color={TWILIGHT.fur} />
                    <Text className="text-sm ml-2" style={{ color: TWILIGHT.fur }}>
                      Prompt History ({uniquePrompts.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={showPromptHistory ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={TWILIGHT.fur}
                  />
                </Pressable>

                {showPromptHistory && (
                  <View
                    className="rounded-xl mt-2 overflow-hidden"
                    style={{
                      backgroundColor: TWILIGHT.dusk,
                      borderWidth: 1,
                      borderColor: TWILIGHT.purple,
                    }}
                  >
                    {uniquePrompts.map((historyPrompt, index) => (
                      <Pressable
                        key={`${historyPrompt}-${index}`}
                        onPress={() => {
                          setPrompt(historyPrompt);
                          setShowPromptHistory(false);
                          Haptics.selectionAsync();
                        }}
                        disabled={isGenerating}
                        className="flex-row items-center p-3"
                        style={{
                          borderBottomWidth: index < uniquePrompts.length - 1 ? 1 : 0,
                          borderBottomColor: TWILIGHT.purple,
                        }}
                      >
                        <View className="flex-1 mr-2">
                          <Text
                            className="text-sm"
                            style={{ color: "#fff" }}
                            numberOfLines={2}
                          >
                            {historyPrompt}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward-outline" size={16} color={TWILIGHT.gold} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Aspect Ratio */}
            <View className="mb-5">
              <Text className="text-sm font-semibold mb-2" style={{ color: TWILIGHT.gold }}>
                Aspect Ratio
              </Text>
              <View className="flex-row">
                {aspectRatios.map((ratio, index) => (
                  <Pressable
                    key={ratio.value}
                    onPress={() => {
                      setSelectedAspect(ratio.value);
                      Haptics.selectionAsync();
                    }}
                    disabled={isGenerating}
                    className="flex-1 py-3 rounded-xl items-center"
                    style={{
                      backgroundColor: selectedAspect === ratio.value ? TWILIGHT.gold : TWILIGHT.dusk,
                      borderWidth: 1,
                      borderColor: TWILIGHT.purple,
                      marginRight: index < aspectRatios.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text
                      className="font-semibold"
                      style={{
                        color: selectedAspect === ratio.value ? TWILIGHT.void : TWILIGHT.fur,
                      }}
                    >
                      {ratio.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Model Selection */}
            <View className="mb-5">
              <Text className="text-sm font-semibold mb-2" style={{ color: TWILIGHT.gold }}>
                AI Model
              </Text>
              {/* Row 1: OpenAI and Nano Banana */}
              <View className="flex-row mb-2">
                <Pressable
                  onPress={() => {
                    setSelectedModel("openai");
                    Haptics.selectionAsync();
                  }}
                  disabled={isGenerating}
                  className="flex-1 py-3 mr-2 rounded-xl items-center"
                  style={{
                    backgroundColor: selectedModel === "openai" ? TWILIGHT.gold : TWILIGHT.dusk,
                    borderWidth: 1,
                    borderColor: TWILIGHT.purple,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: selectedModel === "openai" ? TWILIGHT.void : TWILIGHT.fur }}
                  >
                    OpenAI
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: selectedModel === "openai" ? TWILIGHT.dark : TWILIGHT.wolf }}
                  >
                    GPT-Image
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedModel("google");
                    Haptics.selectionAsync();
                  }}
                  disabled={isGenerating}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: selectedModel === "google" ? TWILIGHT.cyan : TWILIGHT.dusk,
                    borderWidth: 1,
                    borderColor: TWILIGHT.purple,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: selectedModel === "google" ? TWILIGHT.void : TWILIGHT.fur }}
                  >
                    Nano Banana
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: selectedModel === "google" ? TWILIGHT.dark : TWILIGHT.wolf }}
                  >
                    Fast
                  </Text>
                </Pressable>
              </View>
              {/* Row 2: Nano Banana Pro and Kling */}
              <View className="flex-row">
                <Pressable
                  onPress={() => {
                    setSelectedModel("nanobananapro");
                    Haptics.selectionAsync();
                  }}
                  disabled={isGenerating}
                  className="flex-1 py-3 mr-2 rounded-xl items-center"
                  style={{
                    backgroundColor: selectedModel === "nanobananapro" ? TWILIGHT.teal : TWILIGHT.dusk,
                    borderWidth: 1,
                    borderColor: TWILIGHT.purple,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: selectedModel === "nanobananapro" ? TWILIGHT.void : TWILIGHT.fur }}
                  >
                    Banana Pro
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: selectedModel === "nanobananapro" ? TWILIGHT.dark : TWILIGHT.wolf }}
                  >
                    HD ~30s
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setSelectedModel("kling");
                    Haptics.selectionAsync();
                  }}
                  disabled={isGenerating}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: selectedModel === "kling" ? TWILIGHT.midna : TWILIGHT.dusk,
                    borderWidth: 1,
                    borderColor: TWILIGHT.purple,
                  }}
                >
                  <Text
                    className="font-semibold"
                    style={{ color: selectedModel === "kling" ? TWILIGHT.void : TWILIGHT.fur }}
                  >
                    Kling AI
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ color: selectedModel === "kling" ? TWILIGHT.dark : TWILIGHT.wolf }}
                  >
                    High Quality
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Quality - only show for OpenAI */}
            {selectedModel === "openai" && (
              <View className="mb-5">
                <Text className="text-sm font-semibold mb-2" style={{ color: TWILIGHT.gold }}>
                  Power Level
                </Text>
                <View className="flex-row">
                  {qualityOptions.map((quality, index) => (
                    <Pressable
                      key={quality.value}
                      onPress={() => {
                        setSelectedQuality(quality.value);
                        Haptics.selectionAsync();
                      }}
                      disabled={isGenerating}
                      className="flex-1 py-3 rounded-xl items-center"
                      style={{
                        backgroundColor: selectedQuality === quality.value ? TWILIGHT.amber : TWILIGHT.dusk,
                        borderWidth: 1,
                        borderColor: TWILIGHT.purple,
                        marginRight: index < qualityOptions.length - 1 ? 8 : 0,
                      }}
                    >
                      <Text
                        className="font-semibold"
                        style={{
                          color: selectedQuality === quality.value ? TWILIGHT.void : TWILIGHT.fur,
                        }}
                      >
                        {quality.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Size Selection */}
            <View className="mb-5">
              <Text className="text-sm font-semibold mb-2" style={{ color: TWILIGHT.gold }}>
                Quality
              </Text>
              <View className="flex-row">
                {sizeOptions.map((size, index) => (
                  <Pressable
                    key={size.value}
                    onPress={() => {
                      setSelectedSize(size.value);
                      Haptics.selectionAsync();
                    }}
                    disabled={isGenerating}
                    className="flex-1 py-3 rounded-xl items-center"
                    style={{
                      backgroundColor: selectedSize === size.value ? TWILIGHT.cyan : TWILIGHT.dusk,
                      borderWidth: 1,
                      borderColor: TWILIGHT.purple,
                      marginRight: index < sizeOptions.length - 1 ? 8 : 0,
                    }}
                  >
                    <Text
                      className="font-semibold"
                      style={{
                        color: selectedSize === size.value ? TWILIGHT.void : TWILIGHT.fur,
                      }}
                    >
                      {size.label}
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{
                        color: selectedSize === size.value ? TWILIGHT.dark : TWILIGHT.wolf,
                      }}
                    >
                      {size.desc}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Source Image Upload - Only for Kling */}
            {selectedModel === "kling" && (
              <View className="mb-5">
                <Text className="text-sm font-semibold mb-2" style={{ color: TWILIGHT.gold }}>
                  Source Image (Optional)
                </Text>
                <Text className="text-xs mb-3" style={{ color: TWILIGHT.wolf }}>
                  Upload an image to generate variations or transform it based on your prompt
                </Text>
                {sourceImage ? (
                  <View className="rounded-xl overflow-hidden mb-2" style={{ backgroundColor: TWILIGHT.dusk, borderWidth: 1, borderColor: TWILIGHT.purple }}>
                    <Image
                      source={{ uri: sourceImage }}
                      style={{ width: "100%", height: 200 }}
                      contentFit="cover"
                    />
                    <View className="absolute top-2 right-2">
                      <Pressable
                        onPress={() => setSourceImage(null)}
                        className="rounded-full p-2"
                        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
                      >
                        <Ionicons name="close" size={20} color="#FFFFFF" />
                      </Pressable>
                    </View>
                    <View className="p-3" style={{ backgroundColor: TWILIGHT.shadow }}>
                      <Text className="text-xs" style={{ color: TWILIGHT.amber }}>
                        Image-to-Image Mode Active
                      </Text>
                      <Text className="text-xs mt-1" style={{ color: TWILIGHT.wolf }}>
                        Kling will transform this image based on your prompt
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={pickImage}>
                    {({ pressed }) => (
                      <View
                        className="py-8 rounded-xl items-center justify-center border-2 border-dashed"
                        style={{
                          borderColor: TWILIGHT.purple,
                          backgroundColor: pressed ? TWILIGHT.shadow : TWILIGHT.dusk,
                        }}
                      >
                        <Ionicons name="image-outline" size={40} color={TWILIGHT.fur} />
                        <Text className="text-sm font-semibold mt-2" style={{ color: TWILIGHT.fur }}>
                          Upload Image
                        </Text>
                        <Text className="text-xs mt-1" style={{ color: TWILIGHT.wolf }}>
                          For image-to-image generation
                        </Text>
                      </View>
                    )}
                  </Pressable>
                )}
              </View>
            )}

            {/* Generate Button */}
            <Pressable
              onPress={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="py-4 rounded-xl items-center flex-row justify-center mb-5"
              style={{
                backgroundColor: isGenerating || !prompt.trim() ? TWILIGHT.dusk : TWILIGHT.gold,
              }}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator color={TWILIGHT.void} size="small" />
                  <Text className="font-bold ml-2" style={{ color: TWILIGHT.void }}>
                    Channeling magic...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color={TWILIGHT.void} />
                  <Text className="font-bold ml-2" style={{ color: TWILIGHT.void }}>
                    Generate Image
                  </Text>
                </>
              )}
            </Pressable>

            {/* Error */}
            {error && (
              <View
                className="rounded-xl p-4 mb-5"
                style={{
                  backgroundColor: "rgba(220, 47, 2, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(220, 47, 2, 0.3)",
                }}
              >
                <Text className="text-sm" style={{ color: "#ff6b6b" }}>{error}</Text>
              </View>
            )}

            {/* Saved Message */}
            {savedMessage && (
              <View
                className="rounded-xl p-4 mb-5"
                style={{
                  backgroundColor: "rgba(78, 205, 196, 0.15)",
                  borderWidth: 1,
                  borderColor: "rgba(78, 205, 196, 0.3)",
                }}
              >
                <Text className="text-sm text-center" style={{ color: TWILIGHT.cyan }}>
                  Image saved to your library!
                </Text>
              </View>
            )}

            {/* Generated Images */}
            {generatedImages.length > 0 && (
              <View className="mb-6">
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-sm font-semibold" style={{ color: TWILIGHT.gold }}>
                    Generated Images ({generatedImages.length})
                  </Text>
                </View>
                {generatedImages.map((image) => {
                  const aspectRatioValue =
                    image.aspectRatio === "2:3"
                      ? 2 / 3
                      : image.aspectRatio === "3:2"
                      ? 3 / 2
                      : 1;

                  return (
                    <View
                      key={image.createdAt}
                      className="rounded-xl overflow-hidden mb-4"
                      style={{
                        backgroundColor: TWILIGHT.dusk,
                        borderWidth: 1,
                        borderColor: TWILIGHT.purple,
                      }}
                    >
                      <Pressable onPress={() => setPreviewImage(image)}>
                        <Image
                          source={{ uri: image.url }}
                          style={{
                            width: "100%",
                            aspectRatio: aspectRatioValue,
                          }}
                          contentFit="cover"
                          transition={300}
                        />
                        {/* Tap to preview overlay */}
                        <View
                          className="absolute bottom-2 right-2 rounded-full px-3 py-1.5 flex-row items-center"
                          style={{ backgroundColor: "rgba(10, 8, 18, 0.8)" }}
                        >
                          <Ionicons name="expand-outline" size={14} color={TWILIGHT.gold} />
                          <Text className="text-xs ml-1" style={{ color: TWILIGHT.gold }}>Preview</Text>
                        </View>
                      </Pressable>
                      <View className="p-4">
                        <View className="flex-row items-center mb-2">
                          <View
                            className="px-2 py-1 rounded-md mr-2"
                            style={{
                              backgroundColor:
                                image.model === "google"
                                  ? "rgba(78, 205, 196, 0.2)"
                                  : image.model === "nanobananapro"
                                  ? "rgba(42, 157, 143, 0.2)"
                                  : image.model === "kling"
                                  ? "rgba(231, 127, 55, 0.2)"
                                  : "rgba(212, 168, 75, 0.2)",
                            }}
                          >
                            <Text
                              className="text-xs font-medium"
                              style={{
                                color:
                                  image.model === "google"
                                    ? TWILIGHT.cyan
                                    : image.model === "nanobananapro"
                                    ? TWILIGHT.teal
                                    : image.model === "kling"
                                    ? TWILIGHT.midna
                                    : TWILIGHT.gold,
                              }}
                            >
                              {image.model === "google"
                                ? "Nano Banana"
                                : image.model === "nanobananapro"
                                ? "Banana Pro"
                                : image.model === "kling"
                                ? "Kling AI"
                                : "OpenAI"}
                            </Text>
                          </View>
                          <View
                            className="px-2 py-1 rounded-md"
                            style={{ backgroundColor: "rgba(78, 205, 196, 0.2)" }}
                          >
                            <Text className="text-xs font-medium" style={{ color: TWILIGHT.cyan }}>
                              {image.size === "ultra" ? "Ultra" : image.size === "hd" ? "HD" : "Standard"}
                            </Text>
                          </View>
                        </View>
                        <Text
                          className="text-sm mb-3"
                          style={{ color: TWILIGHT.fur }}
                          numberOfLines={2}
                        >
                          {image.prompt}
                        </Text>
                        {/* Action buttons row 1 */}
                        <View className="flex-row mb-2">
                          <Pressable
                            onPress={() => handleSaveImage(image.url)}
                            disabled={savingImage === image.url}
                            className="flex-1 rounded-lg py-2.5 mr-2 items-center flex-row justify-center"
                            style={{ backgroundColor: TWILIGHT.shadow }}
                          >
                            {savingImage === image.url ? (
                              <ActivityIndicator color={TWILIGHT.gold} size="small" />
                            ) : (
                              <>
                                <Ionicons name="download-outline" size={18} color={TWILIGHT.gold} />
                                <Text className="font-medium ml-1.5" style={{ color: TWILIGHT.gold }}>
                                  Save
                                </Text>
                              </>
                            )}
                          </Pressable>
                          <Pressable
                            onPress={() => handleShareImage(image.url)}
                            className="flex-1 rounded-lg py-2.5 mr-2 items-center flex-row justify-center"
                            style={{ backgroundColor: TWILIGHT.shadow }}
                          >
                            <Ionicons name="share-outline" size={18} color={TWILIGHT.fur} />
                            <Text className="font-medium ml-1.5" style={{ color: TWILIGHT.fur }}>
                              Share
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteImage(image.createdAt)}
                            className="rounded-lg py-2.5 px-4 items-center justify-center"
                            style={{ backgroundColor: TWILIGHT.shadow }}
                          >
                            <Ionicons name="trash-outline" size={18} color="#ff6b6b" />
                          </Pressable>
                        </View>
                        {/* Reuse Prompt button */}
                        <Pressable
                          onPress={() => {
                            setPrompt(image.prompt.replace(" (upscaled)", ""));
                            Haptics.selectionAsync();
                          }}
                          disabled={isGenerating}
                          className="rounded-lg py-2.5 mb-2 items-center flex-row justify-center"
                          style={{ backgroundColor: "rgba(212, 168, 75, 0.2)" }}
                        >
                          <Ionicons name="refresh-outline" size={18} color={TWILIGHT.gold} />
                          <Text className="font-medium ml-1.5" style={{ color: TWILIGHT.gold }}>
                            Reuse Prompt
                          </Text>
                        </Pressable>
                        {/* Upscale button */}
                        {image.size !== "ultra" && (
                          <Pressable
                            onPress={() => handleUpscaleImage(image)}
                            disabled={upscalingImage === image.createdAt}
                            className="rounded-lg py-2.5 items-center flex-row justify-center"
                            style={{ backgroundColor: "rgba(78, 205, 196, 0.2)" }}
                          >
                            {upscalingImage === image.createdAt ? (
                              <>
                                <ActivityIndicator color={TWILIGHT.cyan} size="small" />
                                <Text className="font-medium ml-2" style={{ color: TWILIGHT.cyan }}>
                                  Enhancing...
                                </Text>
                              </>
                            ) : (
                              <>
                                <Ionicons name="resize-outline" size={18} color={TWILIGHT.cyan} />
                                <Text className="font-medium ml-1.5" style={{ color: TWILIGHT.cyan }}>
                                  Enhance Power
                                </Text>
                              </>
                            )}
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Clear All button at bottom right */}
                {generatedImages.length > 1 && (
                  <View className="flex-row justify-end">
                    <Pressable
                      onPress={() => setGeneratedImages([])}
                      className="px-4 py-2 rounded-lg"
                      style={{ backgroundColor: "rgba(255, 107, 107, 0.15)" }}
                    >
                      <Text className="text-sm font-medium" style={{ color: "#ff6b6b" }}>Clear All</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* Tips */}
            {generatedImages.length === 0 && !isGenerating && (
              <View
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: TWILIGHT.dusk,
                  borderWidth: 1,
                  borderColor: TWILIGHT.purple,
                }}
              >
                <View className="flex-row items-center mb-2">
                  <Ionicons name="sparkles" size={16} color={TWILIGHT.cyan} />
                  <Text className="text-sm font-semibold ml-2" style={{ color: TWILIGHT.cyan }}>
                    Tip
                  </Text>
                </View>
                <Text className="text-xs leading-5" style={{ color: TWILIGHT.fur }}>
                  Tips for better images:{"\n"}
                  {"\u2022"} Be specific about what you want to see{"\n"}
                  {"\u2022"} Include style, lighting, and mood{"\n"}
                  {"\u2022"} Mention colors and composition{"\n"}
                  {"\u2022"} Use higher quality for detailed images
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Slim Navigation Bar with ChatGPT and Gemini Launchers */}
        <SlimNavBar
          extraButtons={[
            {
              icon: "chatbubble-ellipses-outline",
              onPress: () => Linking.openURL("chatgpt://").catch(() => console.log("Could not open ChatGPT app")),
              label: "Open ChatGPT"
            },
            {
              icon: "diamond-outline",
              onPress: () => {
                // Open Gemini using Google app deep link
                Linking.openURL("googleapp://robin").catch(() => console.log("Could not open Gemini"));
              },
              label: "Open Gemini"
            }
          ]}
        />

        {/* Image Preview Modal */}
        <Modal
          visible={previewImage !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImage(null)}
        >
          <View style={{ flex: 1, backgroundColor: TWILIGHT.void }}>
            <View
              className="flex-row justify-between items-center px-4 py-2"
              style={{ paddingTop: insets.top + 8 }}
            >
              <Pressable onPress={() => setPreviewImage(null)} className="p-2">
                <Ionicons name="close" size={28} color={TWILIGHT.gold} />
              </Pressable>
              <Text className="text-xs" style={{ color: TWILIGHT.fur }}>
                Tap image to zoom
              </Text>
              <View className="flex-row">
                {previewImage && (
                  <>
                    <Pressable
                      onPress={() => handleSaveImage(previewImage.url)}
                      className="p-2 mr-2"
                    >
                      <Ionicons name="download-outline" size={24} color={TWILIGHT.gold} />
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
              <ZoomableImage
                uri={previewImage.url}
                prompt={previewImage.prompt}
                model={previewImage.model}
                size={previewImage.size}
              />
            )}
          </View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}
