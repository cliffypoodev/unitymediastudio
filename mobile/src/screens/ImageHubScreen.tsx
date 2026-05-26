import React from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SlimNavBar } from "../components/SlimNavBar";
import { STUDIO } from "../utils/theme";

type ImageHubNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: ImageHubNavigationProp;
}

interface ImageTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradientColors: string[];
}

const imageTiles: ImageTile[] = [
  {
    id: "create",
    title: "Create",
    subtitle: "Generate AI images",
    icon: "sparkles",
    route: "ImageCreate",
    gradientColors: [STUDIO.swirlBlue, STUDIO.swirlCyan],
  },
  {
    id: "library",
    title: "Library",
    subtitle: "View your generated images",
    icon: "images",
    route: "ImageLibrary",
    gradientColors: [STUDIO.swirlPink, STUDIO.swirlOrange],
  },
  {
    id: "photos",
    title: "Photo Stream",
    subtitle: "View photos from your iPhone",
    icon: "albums",
    route: "PhotoStream",
    gradientColors: [STUDIO.swirlCyan, STUDIO.swirlBlue],
  },
  {
    id: "upscaler",
    title: "Upscaler",
    subtitle: "Create perfect 3000x3000px album covers",
    icon: "resize",
    route: "ImageUpscaler",
    gradientColors: [STUDIO.swirlPink, STUDIO.swirlBlue],
  },
];

export function ImageHubScreen({ navigation }: Props) {
  const renderTile = (tile: ImageTile) => (
    <Pressable
      key={tile.id}
      onPress={() => navigation.navigate(tile.route)}
      className="mb-4"
    >
      {({ pressed }) => (
        <LinearGradient
          colors={tile.gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 16,
            padding: 20,
            opacity: pressed ? 0.8 : 1,
          }}
        >
          <View className="flex-row items-center">
            <View
              className="w-14 h-14 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
            >
              <Ionicons name={tile.icon} size={28} color="#FFFFFF" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold mb-1">
                {tile.title}
              </Text>
              <Text className="text-white/80 text-sm">{tile.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </View>
        </LinearGradient>
      )}
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: STUDIO.void }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: STUDIO.text }}
        >
          Image Studio
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Create and manage your AI-generated images
        </Text>

        {imageTiles.map(renderTile)}
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
            onPress: async () => {
              // Try opening Gemini with various URL schemes
              const schemes = [
                "gemini://",
                "googlegemini://",
                "com.google.gemini://",
                "google-gemini://",
                "googleapp://robin"
              ];

              for (const scheme of schemes) {
                try {
                  await Linking.openURL(scheme);
                  break; // If successful, stop trying other schemes
                } catch (error) {
                  // Continue to next scheme if this one fails
                  continue;
                }
              }
            },
            label: "Open Gemini"
          }
        ]}
      />
    </View>
  );
}
