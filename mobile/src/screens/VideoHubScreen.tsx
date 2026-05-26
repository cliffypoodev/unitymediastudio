import React from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SlimNavBar } from "../components/SlimNavBar";
import { STUDIO } from "../utils/theme";

type VideoHubNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: VideoHubNavigationProp;
}

interface VideoTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradientColors: string[];
}

const videoTiles: VideoTile[] = [
  {
    id: "create",
    title: "Create",
    subtitle: "Generate AI videos",
    icon: "videocam",
    route: "VideoCreate",
    gradientColors: ["#8B5CF6", "#6D28D9"],
  },
  {
    id: "library",
    title: "Library",
    subtitle: "View your generated videos",
    icon: "film",
    route: "VideoLibrary",
    gradientColors: [STUDIO.swirlOrange, STUDIO.swirlYellow],
  },
  {
    id: "photos",
    title: "Videos",
    subtitle: "View videos from your iPhone",
    icon: "videocam-outline",
    route: "PhotosVideos",
    gradientColors: [STUDIO.swirlBlue, STUDIO.swirlPink],
  },
  {
    id: "moviemaker",
    title: "Movie Maker",
    subtitle: "Edit and stitch videos together",
    icon: "cut",
    route: "MovieMaker",
    gradientColors: [STUDIO.swirlCyan, STUDIO.swirlBlue],
  },
];

export function VideoHubScreen({ navigation }: Props) {
  const renderTile = (tile: VideoTile) => (
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
          Video Studio
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Create and manage your AI-generated videos
        </Text>

        {videoTiles.map(renderTile)}
      </ScrollView>

      {/* Slim Navigation Bar with Sora and Gemini Launchers */}
      <SlimNavBar
        extraButtons={[
          {
            icon: "film-outline",
            onPress: () => {
              // Open Sora website
              Linking.openURL("https://sora.com").catch(() => console.log("Could not open Sora"));
            },
            label: "Open Sora"
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
