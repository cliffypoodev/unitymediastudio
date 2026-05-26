import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { STUDIO } from "../utils/theme";

type MusicHubNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: MusicHubNavigationProp;
}

interface MusicTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  gradientColors: string[];
}

const musicTiles: MusicTile[] = [
  {
    id: "yt",
    title: "Search YT",
    subtitle: "Download audio from YouTube",
    icon: "logo-youtube",
    route: "YTDownload",
    gradientColors: ["#FF0000", "#CC0000"],
  },
  {
    id: "library",
    title: "Library",
    subtitle: "View downloaded audio files",
    icon: "musical-note",
    route: "MusicLibrary",
    gradientColors: [STUDIO.swirlCyan, STUDIO.swirlBlue],
  },
  {
    id: "lyrics",
    title: "Lyrics",
    subtitle: "Search and generate lyrics",
    icon: "document-text",
    route: "Lyrics",
    gradientColors: [STUDIO.amber, "#D97706"],
  },
  {
    id: "suno",
    title: "Suno",
    subtitle: "Create music with AI",
    icon: "musical-notes",
    route: "Suno",
    gradientColors: ["#8B5CF6", "#6D28D9"],
  },
  {
    id: "distrokid",
    title: "DistroKid",
    subtitle: "Distribute your music",
    icon: "rocket",
    route: "DistroKid",
    gradientColors: [STUDIO.wood, STUDIO.woodDark],
  },
];

export function MusicHubScreen({ navigation }: Props) {
  const renderTile = (tile: MusicTile) => (
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
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: STUDIO.text }}
        >
          Music Studio
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Create, edit, and distribute your music
        </Text>

        {musicTiles.map(renderTile)}
      </ScrollView>
    </SafeAreaView>
  );
}
