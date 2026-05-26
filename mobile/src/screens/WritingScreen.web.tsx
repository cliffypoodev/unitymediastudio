import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { STUDIO } from "../utils/theme";

type WritingHubNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: WritingHubNavigationProp;
}

interface WritingTile {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route?: string;
  webView?: {
    url: string;
    title: string;
  };
  gradientColors: string[];
}

const writingTiles: WritingTile[] = [
  {
    id: "book",
    title: "Book Assistant",
    subtitle: "Scholarly AI writing companion",
    icon: "book",
    route: "BookAssistant",
    gradientColors: [STUDIO.swirlBlue, STUDIO.swirlCyan],
  },
  {
    id: "notes",
    title: "Notes",
    subtitle: "Quick notes with tags and search",
    icon: "document-text",
    route: "Notes",
    gradientColors: [STUDIO.swirlPink, STUDIO.swirlOrange],
  },
  {
    id: "googledocs",
    title: "Google Docs",
    subtitle: "Create and edit documents online",
    icon: "document",
    webView: {
      url: "https://docs.google.com/",
      title: "Google Docs",
    },
    gradientColors: [STUDIO.swirlCyan, STUDIO.swirlBlue],
  },
];

export function WritingScreen({ navigation }: Props) {
  const handleTilePress = (tile: WritingTile) => {
    if (tile.route) {
      navigation.navigate(tile.route);
    } else if (tile.webView) {
      // Open external web views in new tab instead of iframe
      window.open(tile.webView.url, "_blank");
    }
  };

  const renderTile = (tile: WritingTile) => (
    <Pressable key={tile.id} onPress={() => handleTilePress(tile)} className="mb-4">
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
              <Text className="text-white text-xl font-bold mb-1">{tile.title}</Text>
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
        <Text className="text-3xl font-bold mb-2" style={{ color: STUDIO.text }}>
          Writing Studio
        </Text>
        <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
          Develop books, take notes, and create with AI
        </Text>

        {writingTiles.map(renderTile)}
      </ScrollView>
    </View>
  );
}
