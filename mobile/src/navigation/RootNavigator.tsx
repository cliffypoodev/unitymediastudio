import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { TitleScreen } from "../screens/TitleScreen";
import { MusicHubScreen } from "../screens/MusicHubScreen";
import { DownloadScreen } from "../screens/DownloadScreen";
import { LyricsScreen } from "../screens/LyricsScreen";
import { SunoScreen } from "../screens/SunoScreen";
import { DistroKidScreen } from "../screens/DistroKidScreen";
import { MusicLibraryScreen } from "../screens/MusicLibraryScreen";
import { AudioEditorScreen } from "../screens/AudioEditorScreen";
import { ImageHubScreen } from "../screens/ImageHubScreen";
import { ImageCreateScreen } from "../screens/ImageCreateScreen";
import { ImageLibraryScreen } from "../screens/ImageLibraryScreen";
import { ImageUpscalerScreen } from "../screens/ImageUpscalerScreen";
import { PhotoStreamScreen } from "../screens/PhotoStreamScreen";
import { VideoHubScreen } from "../screens/VideoHubScreen";
import { VideoCreateScreen } from "../screens/VideoCreateScreen";
import { VideoLibraryScreen } from "../screens/VideoLibraryScreen";
import { PhotosVideosScreen } from "../screens/PhotosVideosScreen";
import { MovieMakerScreen } from "../screens/MovieMakerScreen";
import { WritingScreen } from "../screens/WritingScreen";
import { BookAssistantScreen } from "../screens/BookAssistantScreen";
import { NotesScreen } from "../screens/NotesScreen";
import { CustomTabBar } from "../components/CustomTabBar";
import { STUDIO } from "../utils/theme";

// Music Stack Param List
export type MusicStackParamList = {
  MusicHub: undefined;
  YTDownload: undefined;
  MusicLibrary: undefined;
  Lyrics: undefined;
  Suno: undefined;
  DistroKid: undefined;
  AudioEditor: { trackId?: string } | undefined;
};

// Image Stack Param List
export type ImageStackParamList = {
  ImageHub: undefined;
  ImageCreate: { prompt?: string } | undefined;
  ImageLibrary: undefined;
  PhotoStream: undefined;
  ImageUpscaler: undefined;
};

// Video Stack Param List
export type VideoStackParamList = {
  VideoHub: undefined;
  VideoCreate: { prompt?: string } | undefined;
  VideoLibrary: undefined;
  PhotosVideos: undefined;
  MovieMaker: undefined;
};

// Writing Stack Param List
export type WritingStackParamList = {
  WritingHub: undefined;
  BookAssistant: undefined;
  Notes: undefined;
};

// Main Tab Param List
export type MainTabParamList = {
  Music: undefined;
  Images: undefined;
  Video: undefined;
  Writing: undefined;
};

const MusicStack = createNativeStackNavigator<MusicStackParamList>();
const ImageStack = createNativeStackNavigator<ImageStackParamList>();
const VideoStack = createNativeStackNavigator<VideoStackParamList>();
const WritingStack = createNativeStackNavigator<WritingStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Music Stack Navigator
function MusicStackNavigator() {
  return (
    <MusicStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: STUDIO.dark,
        },
        headerTintColor: STUDIO.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
        },
        headerBackground: () => (
          <LinearGradient
            colors={[STUDIO.charcoal, STUDIO.dark] as any}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
      }}
    >
      <MusicStack.Screen
        name="MusicHub"
        component={MusicHubScreen}
        options={{ title: "Music Studio" }}
      />
      <MusicStack.Screen
        name="YTDownload"
        component={DownloadScreen}
        options={{ headerShown: false }}
      />
      <MusicStack.Screen
        name="MusicLibrary"
        component={MusicLibraryScreen}
        options={{ title: "Music Library" }}
      />
      <MusicStack.Screen
        name="Lyrics"
        component={LyricsScreen}
        options={{ title: "Lyrics" }}
      />
      <MusicStack.Screen
        name="Suno"
        component={SunoScreen}
        options={{ headerShown: false }}
      />
      <MusicStack.Screen
        name="DistroKid"
        component={DistroKidScreen}
        options={{ headerShown: false }}
      />
    </MusicStack.Navigator>
  );
}

// Image Stack Navigator
function ImageStackNavigator() {
  return (
    <ImageStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: STUDIO.dark,
        },
        headerTintColor: STUDIO.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
        },
        headerBackground: () => (
          <LinearGradient
            colors={[STUDIO.charcoal, STUDIO.dark] as any}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
      }}
    >
      <ImageStack.Screen
        name="ImageHub"
        component={ImageHubScreen}
        options={{ title: "Image Studio" }}
      />
      <ImageStack.Screen
        name="ImageCreate"
        component={ImageCreateScreen}
        options={{ title: "Create Image" }}
      />
      <ImageStack.Screen
        name="ImageLibrary"
        component={ImageLibraryScreen}
        options={{ title: "Image Library" }}
      />
      <ImageStack.Screen
        name="PhotoStream"
        component={PhotoStreamScreen}
        options={{ title: "Photo Stream" }}
      />
      <ImageStack.Screen
        name="ImageUpscaler"
        component={ImageUpscalerScreen}
        options={{ title: "Album Cover Upscaler" }}
      />
    </ImageStack.Navigator>
  );
}

// Video Stack Navigator
function VideoStackNavigator() {
  return (
    <VideoStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: STUDIO.dark,
        },
        headerTintColor: STUDIO.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
        },
        headerBackground: () => (
          <LinearGradient
            colors={[STUDIO.charcoal, STUDIO.dark] as any}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
      }}
    >
      <VideoStack.Screen
        name="VideoHub"
        component={VideoHubScreen}
        options={{ title: "Video Studio" }}
      />
      <VideoStack.Screen
        name="VideoCreate"
        component={VideoCreateScreen}
        options={{ title: "Create Video" }}
      />
      <VideoStack.Screen
        name="VideoLibrary"
        component={VideoLibraryScreen}
        options={{ title: "Video Library" }}
      />
      <VideoStack.Screen
        name="PhotosVideos"
        component={PhotosVideosScreen}
        options={{ title: "Videos" }}
      />
      <VideoStack.Screen
        name="MovieMaker"
        component={MovieMakerScreen}
        options={{ title: "Movie Maker" }}
      />
    </VideoStack.Navigator>
  );
}

// Writing Stack Navigator
function WritingStackNavigator() {
  return (
    <WritingStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: STUDIO.dark,
        },
        headerTintColor: STUDIO.text,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 16,
        },
        headerBackground: () => (
          <LinearGradient
            colors={[STUDIO.charcoal, STUDIO.dark] as any}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        ),
      }}
    >
      <WritingStack.Screen
        name="WritingHub"
        component={WritingScreen}
        options={{ title: "Writing Studio" }}
      />
      <WritingStack.Screen
        name="BookAssistant"
        component={BookAssistantScreen}
        options={{ headerShown: false }}
      />
      <WritingStack.Screen
        name="Notes"
        component={NotesScreen}
        options={{ headerShown: false }}
      />
    </WritingStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      detachInactiveScreens={false}
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        tabBarStyle: {
          backgroundColor: STUDIO.dark,
          borderTopColor: STUDIO.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 24,
          height: 88,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: STUDIO.amber,
        tabBarInactiveTintColor: STUDIO.nickelDark,
        tabBarLabelStyle: {
          fontWeight: "600",
          letterSpacing: 0.5,
          fontSize: 11,
          marginBottom: 4,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Music"
        component={MusicStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Images"
        component={ImageStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="image" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Video"
        component={VideoStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="videocam" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Writing"
        component={WritingStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
export function RootNavigator() {
  const [showTitle, setShowTitle] = useState(true);

  if (showTitle) {
    return <TitleScreen onStart={() => setShowTitle(false)} />;
  }

  return <MainTabs />;
}
