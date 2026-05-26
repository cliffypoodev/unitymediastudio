import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import { VideoView, useVideoPlayer } from "expo-video";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { STUDIO } from "../utils/theme";
import { videoEditor, VideoClip as APIVideoClip } from "../api/video-editing";
import { safeHaptics, ImpactFeedbackStyle, NotificationFeedbackType, isWeb, triggerHapticLight, triggerHapticMedium } from "../utils/platform";
import { pickVideo, requestMediaPermission, showPermissionDeniedAlert } from "../utils/mediaPicker";
import { SequentialVideoPlayer } from "../components/SequentialVideoPlayer";
import { processForInAppPlayback, exportSequentialClips, showInAppPlaybackInfo } from "../utils/videoProcessor";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PROJECTS_KEY = "movie_maker_projects";
const CLIP_WIDTH = 120;
const CLIP_HEIGHT = 80;

interface VideoClip {
  id: string;
  uri: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  transition?: "fade" | "dissolve" | "wipe" | "none";
  thumbnail?: string;
  order: number;
}

interface MovieProject {
  id: string;
  name: string;
  clips: VideoClip[];
  createdAt: number;
  updatedAt: number;
}

export function MovieMakerScreen() {
  const [projects, setProjects] = useState<MovieProject[]>([]);
  const [currentProject, setCurrentProject] = useState<MovieProject | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [previewClipUri, setPreviewClipUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState(0);
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Video player for preview
  const player = useVideoPlayer(previewClipUri || "", (player) => {
    player.loop = true;
  });

  useEffect(() => {
    loadProjects();
    requestPermissions();
  }, []);

  useEffect(() => {
    if (previewClipUri && player) {
      player.replaceAsync(previewClipUri).then(() => {
        player.play();
      }).catch(err => {
        console.log("Error loading preview:", err);
      });
    }
  }, [previewClipUri]);

  const requestPermissions = async () => {
    await requestMediaPermission();
  };

  const loadProjects = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROJECTS_KEY);
      if (stored) {
        const projectList = JSON.parse(stored) as MovieProject[];
        setProjects(projectList);
      }
    } catch (err) {
      console.log("Error loading projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const saveProjects = async (updatedProjects: MovieProject[]) => {
    try {
      await AsyncStorage.setItem(PROJECTS_KEY, JSON.stringify(updatedProjects));
      setProjects(updatedProjects);
    } catch (err) {
      Alert.alert("Error", "Failed to save projects");
    }
  };

  const createNewProject = () => {
    if (!newProjectName.trim()) {
      Alert.alert("Error", "Please enter a project name");
      return;
    }

    const newProject: MovieProject = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      clips: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updatedProjects = [newProject, ...projects];
    saveProjects(updatedProjects);
    setCurrentProject(newProject);
    setNewProjectName("");
    setShowNewProjectModal(false);
    safeHaptics.notificationAsync(NotificationFeedbackType.Success);
  };

  const generateVideoThumbnail = async (videoUri: string): Promise<string | undefined> => {
    try {
      // For now, we'll use a placeholder. In production, you'd use expo-video-thumbnails
      // import { VideoThumbnails } from 'expo-video-thumbnails';
      // const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000 });
      // return uri;
      return undefined;
    } catch (err) {
      console.log("Error generating thumbnail:", err);
      return undefined;
    }
  };

  const addVideoToProject = async () => {
    if (!currentProject) {
      Alert.alert("Error", "Please select or create a project first");
      return;
    }

    try {
      const result = await pickVideo();

      if (result) {
        const thumbnail = await generateVideoThumbnail(result.uri);

        const newClip: VideoClip = {
          id: Date.now().toString(),
          uri: result.uri,
          duration: result.duration || 0,
          trimStart: 0,
          trimEnd: result.duration || 0,
          transition: "none",
          thumbnail,
          order: currentProject.clips.length,
        };

        const updatedProject = {
          ...currentProject,
          clips: [...currentProject.clips, newClip],
          updatedAt: Date.now(),
        };

        const updatedProjects = projects.map(p =>
          p.id === currentProject.id ? updatedProject : p
        );

        saveProjects(updatedProjects);
        setCurrentProject(updatedProject);
        safeHaptics.notificationAsync(NotificationFeedbackType.Success);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to add video");
    }
  };

  const removeClip = (clipId: string) => {
    if (!currentProject) return;

    Alert.alert(
      "Remove Clip",
      "Are you sure you want to remove this clip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updatedClips = currentProject.clips
              .filter(c => c.id !== clipId)
              .map((c, index) => ({ ...c, order: index }));

            const updatedProject = {
              ...currentProject,
              clips: updatedClips,
              updatedAt: Date.now(),
            };

            const updatedProjects = projects.map(p =>
              p.id === currentProject.id ? updatedProject : p
            );

            saveProjects(updatedProjects);
            setCurrentProject(updatedProject);
            setSelectedClipId(null);
            safeHaptics.notificationAsync(NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const reorderClips = (fromIndex: number, toIndex: number) => {
    if (!currentProject) return;

    const clips = [...currentProject.clips];
    const [movedClip] = clips.splice(fromIndex, 1);
    clips.splice(toIndex, 0, movedClip);

    // Update order for all clips
    const updatedClips = clips.map((clip, index) => ({ ...clip, order: index }));

    const updatedProject = {
      ...currentProject,
      clips: updatedClips,
      updatedAt: Date.now(),
    };

    const updatedProjects = projects.map(p =>
      p.id === currentProject.id ? updatedProject : p
    );

    saveProjects(updatedProjects);
    setCurrentProject(updatedProject);
  };

  const setTransition = (clipId: string, transition: VideoClip["transition"]) => {
    if (!currentProject) return;

    const updatedClips = currentProject.clips.map(clip =>
      clip.id === clipId ? { ...clip, transition } : clip
    );

    const updatedProject = {
      ...currentProject,
      clips: updatedClips,
      updatedAt: Date.now(),
    };

    const updatedProjects = projects.map(p =>
      p.id === currentProject.id ? updatedProject : p
    );

    saveProjects(updatedProjects);
    setCurrentProject(updatedProject);
    safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
  };

  const testJSON2VideoAPI = async () => {
    try {
      setLoading(true);
      const methods = await videoEditor.getAvailableMethods();

      if (methods.includes("json2video")) {
        Alert.alert(
          "API Test Successful! ✅",
          "Your JSON2Video API key is properly configured and working!\n\n" +
          "Available rendering methods:\n" +
          methods.map(m => `• ${m}`).join("\n") + "\n\n" +
          "You can now create videos with professional transitions and stitching."
        );
      } else {
        Alert.alert(
          "API Not Configured",
          "JSON2Video API key not found or invalid.\n\n" +
          "Available methods:\n" +
          methods.map(m => `• ${m}`).join("\n") + "\n\n" +
          "To enable cloud video stitching:\n" +
          "1. Go to ENV tab in Vibecode\n" +
          "2. Add EXPO_PUBLIC_JSON2VIDEO_API_KEY\n" +
          "3. Get your key from json2video.com"
        );
      }
    } catch (err) {
      Alert.alert(
        "API Test Failed",
        `Error testing API:\n${(err as Error).message}\n\n` +
        "Please check:\n" +
        "• API key is correctly set in ENV tab\n" +
        "• You have an active JSON2Video account\n" +
        "• Your internet connection is working"
      );
    } finally {
      setLoading(false);
    }
  };

  const createVideo = async () => {
    if (!currentProject || currentProject.clips.length === 0) {
      Alert.alert("Error", "Please add at least one video clip to create your video");
      return;
    }

    // Sort clips by order
    const sortedClips = [...currentProject.clips].sort((a, b) => a.order - b.order);

    // Show options: In-App Player (recommended) vs Export
    Alert.alert(
      "Create Video",
      "Choose how you want to create your video:",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Export Files",
          style: "default",
          onPress: () => exportVideoFiles(sortedClips),
        },
        {
          text: "Play In-App ⭐",
          style: "default",
          onPress: () => playInApp(sortedClips),
        },
      ]
    );
  };

  const playInApp = async (sortedClips: VideoClip[]) => {
    if (!currentProject) return;

    setCreating(true);
    setCreateProgress(0);

    try {
      // Process for in-app playback
      const result = await processForInAppPlayback(
        sortedClips.map(clip => ({
          id: clip.id,
          uri: clip.uri,
          duration: clip.duration,
          trimStart: clip.trimStart,
          trimEnd: clip.trimEnd,
          transition: clip.transition,
        })),
        currentProject.name
      );

      setCreateProgress(100);

      // Show the video player
      setShowVideoPlayer(true);
      safeHaptics.notificationAsync(NotificationFeedbackType.Success);

      // Show info after a brief delay
      setTimeout(() => {
        showInAppPlaybackInfo(result.clipCount, currentProject.name, result.totalDuration);
      }, 500);
    } catch (err) {
      Alert.alert("Error", `Failed to prepare video: ${(err as Error).message}`);
    } finally {
      setCreating(false);
      setCreateProgress(0);
    }
  };

  const exportVideoFiles = async (sortedClips: VideoClip[]) => {
    if (!currentProject) return;

    Alert.alert(
      "Export Video Files",
      `This will export ${sortedClips.length} video clips to your library with sequential naming.\n\n` +
      `You can then manually edit them in iMovie, CapCut, or other video editing apps.\n\n` +
      `Prefer the "Play In-App" option for seamless playback with transitions!`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: async () => {
            setCreating(true);
            setCreateProgress(0);

            try {
              const result = await exportSequentialClips(
                sortedClips.map(clip => ({
                  id: clip.id,
                  uri: clip.uri,
                  duration: clip.duration,
                  trimStart: clip.trimStart,
                  trimEnd: clip.trimEnd,
                  transition: clip.transition,
                })),
                currentProject.name,
                (progress) => setCreateProgress(progress)
              );

              setCreateProgress(100);

              Alert.alert(
                "Export Complete! ✅",
                `${result.clipCount} clips have been saved to your library:\n\n` +
                `• ${currentProject.name}_clip_01.mp4\n` +
                `• ${currentProject.name}_clip_02.mp4\n` +
                `• ${currentProject.name}_clip_03.mp4\n` +
                `${result.clipCount > 3 ? `• ... (${result.clipCount - 3} more)\n` : ""}\n` +
                `\n💡 Tip: Use "Play In-App" instead for seamless viewing!`
              );
            } catch (err) {
              Alert.alert("Error", `Failed to export: ${(err as Error).message}`);
            } finally {
              setCreating(false);
              setCreateProgress(0);
            }
          },
        },
      ]
    );
  };

  const oldCreateVideoWithAPI = async () => {
    if (!currentProject || currentProject.clips.length === 0) {
      Alert.alert("Error", "Please add at least one video clip to create your video");
      return;
    }

    setCreating(true);
    setCreateProgress(0);

    try {
      // Sort clips by order
      const sortedClips = [...currentProject.clips].sort((a, b) => a.order - b.order);

      // Convert to API format
      const apiClips: APIVideoClip[] = sortedClips.map(clip => ({
        id: clip.id,
        uri: clip.uri,
        duration: clip.duration,
        trimStart: clip.trimStart,
        trimEnd: clip.trimEnd,
        transition: clip.transition,
        volume: 1.0,
      }));

      // Check available methods
      const methods = await videoEditor.getAvailableMethods();
      console.log("Available rendering methods:", methods);

      // Show info about rendering method
      if (methods.includes("json2video")) {
        // Use cloud API
        Alert.alert(
          "Creating Video",
          `Using JSON2Video cloud API to stitch ${sortedClips.length} clips with transitions.\n\nThis may take a few minutes...`,
          [
            { text: "Cancel", style: "cancel", onPress: () => setCreating(false) },
            {
              text: "Create",
              onPress: async () => {
                try {
                  const result = await videoEditor.stitchVideos(apiClips, {
                    quality: "high",
                    onProgress: (progress) => {
                      setCreateProgress(progress);
                    },
                  });

                  setCreateProgress(100);

                  // Check if it actually used JSON2Video or fell back to local
                  if (result.method === "json2video") {
                    // Download the rendered video from cloud
                    const filename = `${FileSystem.documentDirectory}${currentProject.name}_final.mp4`;
                    const download = await FileSystem.downloadAsync(result.url, filename);

                    // Save to media library
                    await MediaLibrary.createAssetAsync(download.uri);

                    Alert.alert(
                      "Success! 🎉",
                      `Your video has been created and saved to your library!\n\n` +
                      `Method: ${result.method}\n` +
                      `Clips: ${sortedClips.length}\n` +
                      `Transitions: ${sortedClips.filter(c => c.transition && c.transition !== "none").length}`
                    );
                  } else {
                    // Fell back to local method
                    Alert.alert(
                      "Local Export",
                      `${result.message}\n\n` +
                      `The JSON2Video API requires videos to be uploaded to a cloud storage service first.\n\n` +
                      `Clips have been exported in sequence to your library.\n\n` +
                      `To use automatic stitching with transitions, upload your videos to a cloud storage service and use public URLs.`
                    );
                  }
                } catch (err) {
                  Alert.alert("Error", `Failed to create video: ${(err as Error).message}`);
                } finally {
                  setCreating(false);
                  setCreateProgress(0);
                }
              },
            },
          ]
        );
      } else if (methods.includes("capcut")) {
        // Use local CapCut API
        Alert.alert(
          "Creating Video",
          `Using CapCut API to create project with ${sortedClips.length} clips.\n\nThe project will be created and you can render it in CapCut.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => setCreating(false) },
            {
              text: "Create",
              onPress: async () => {
                try {
                  const result = await videoEditor.stitchVideos(apiClips, {
                    onProgress: (progress) => setCreateProgress(progress),
                  });

                  Alert.alert(
                    "Project Created!",
                    `${result.message}\n\nProject path: ${result.url}\n\nOpen this in CapCut to render your final video.`
                  );
                } catch (err) {
                  Alert.alert("Error", `Failed to create project: ${(err as Error).message}`);
                } finally {
                  setCreating(false);
                  setCreateProgress(0);
                }
              },
            },
          ]
        );
      } else {
        // Fallback: Save clips in order
        Alert.alert(
          "Video Creation",
          `Your project "${currentProject.name}" contains ${sortedClips.length} clips.\n\n` +
          `🎬 ADVANCED EDITING OPTIONS:\n\n` +
          `1. JSON2Video Cloud API\n` +
          `   • Professional video stitching\n` +
          `   • Smooth transitions\n` +
          `   • High-quality rendering\n` +
          `   • Add API key in ENV tab\n\n` +
          `2. CapCut API (Local)\n` +
          `   • Install from GitHub\n` +
          `   • Full editing capabilities\n` +
          `   • Run server locally\n\n` +
          `3. Export Clips (Current)\n` +
          `   • Save numbered clips\n` +
          `   • Manual editing required\n` +
          `   • No automatic transitions\n\n` +
          `Would you like to export clips for manual editing?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Export Clips",
              onPress: async () => {
                try {
                  for (let i = 0; i < sortedClips.length; i++) {
                    const clip = sortedClips[i];
                    setCreateProgress(Math.round(((i + 1) / sortedClips.length) * 100));

                    // Copy to cache with numbered filename
                    const filename = `${FileSystem.cacheDirectory}${currentProject.name}_clip_${String(i + 1).padStart(2, "0")}.mp4`;

                    await FileSystem.copyAsync({
                      from: clip.uri,
                      to: filename,
                    });

                    await MediaLibrary.createAssetAsync(filename);

                    // Small delay to show progress
                    await new Promise(resolve => setTimeout(resolve, 300));
                  }

                  setCreateProgress(100);

                  Alert.alert(
                    "Clips Exported",
                    `Saved ${sortedClips.length} clips to your library!\n\n` +
                    `Clips are numbered in sequence:\n` +
                    `${currentProject.name}_clip_01.mp4\n` +
                    `${currentProject.name}_clip_02.mp4\n` +
                    `etc.\n\n` +
                    `Transitions: ${sortedClips.map((c, i) => i < sortedClips.length - 1 ? c.transition : "").filter(t => t && t !== "none").join(", ") || "none"}\n\n` +
                    `💡 For automatic stitching with transitions, add JSON2Video API key in ENV tab.`
                  );
                } catch (err) {
                  Alert.alert("Error", "Failed to export clips: " + (err as Error).message);
                } finally {
                  setCreating(false);
                  setCreateProgress(0);
                }
              },
            },
          ]
        );
        setCreating(false);
        setCreateProgress(0);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to create video: " + (err as Error).message);
      setCreating(false);
      setCreateProgress(0);
    }
  };

  const deleteProject = (projectId: string) => {
    Alert.alert(
      "Delete Project",
      "Are you sure you want to delete this project?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedProjects = projects.filter(p => p.id !== projectId);
            saveProjects(updatedProjects);
            if (currentProject?.id === projectId) {
              setCurrentProject(null);
            }
            safeHaptics.notificationAsync(NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const TimelineClip = ({ clip, index }: { clip: VideoClip; index: number }) => {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const startX = useSharedValue(0);
    const isDragging = useSharedValue(false);

    const gesture = Gesture.Pan()
      .onStart(() => {
        isDragging.value = true;
        scale.value = withSpring(1.1);
        startX.value = translateX.value;
        runOnJS(setDraggingClipId)(clip.id);
        runOnJS(triggerHapticMedium)();
      })
      .onUpdate((event) => {
        translateX.value = startX.value + event.translationX;
        translateY.value = event.translationY;
      })
      .onEnd(() => {
        isDragging.value = false;
        scale.value = withSpring(1);

        // Calculate new position
        const movedBy = Math.round(translateX.value / (CLIP_WIDTH + 12));
        const newIndex = Math.max(0, Math.min(index + movedBy, (currentProject?.clips.length || 1) - 1));

        if (newIndex !== index) {
          runOnJS(reorderClips)(index, newIndex);
        }

        // Reset position
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        runOnJS(setDraggingClipId)(null);
        runOnJS(triggerHapticLight)();
      })
      .minDistance(10); // Require 10px of movement before gesture activates

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: draggingClipId === clip.id ? 1000 : 1,
    }));

    const isSelected = selectedClipId === clip.id;

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedStyle]}>
          <Pressable
            onPress={() => {
              setSelectedClipId(clip.id);
              setPreviewClipUri(clip.uri);
              safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
            }}
          >
            <View
              style={{
                width: CLIP_WIDTH,
                height: CLIP_HEIGHT,
                borderRadius: 8,
                backgroundColor: STUDIO.slate,
                borderWidth: isSelected ? 3 : 0,
                borderColor: STUDIO.amber,
                overflow: "hidden",
                marginRight: 12,
              }}
            >
              {/* Thumbnail or placeholder */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: STUDIO.charcoal,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="film" size={32} color={STUDIO.nickelDark} />
              </View>

              {/* Clip info overlay */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(0,0,0,0.7)",
                  padding: 4,
                }}
              >
                <Text
                  style={{
                    color: STUDIO.text,
                    fontSize: 10,
                    fontWeight: "600",
                  }}
                  numberOfLines={1}
                >
                  Clip {index + 1}
                </Text>
                <Text
                  style={{
                    color: STUDIO.nickelDark,
                    fontSize: 9,
                  }}
                >
                  {(clip.duration / 1000).toFixed(1)}s
                </Text>
              </View>

              {/* Order badge */}
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  left: 4,
                  backgroundColor: STUDIO.amber,
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: STUDIO.void,
                    fontSize: 12,
                    fontWeight: "bold",
                  }}
                >
                  {index + 1}
                </Text>
              </View>

              {/* Remove button */}
              <Pressable
                onPress={() => removeClip(clip.id)}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  backgroundColor: STUDIO.error,
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </Pressable>
            </View>

            {/* Transition indicator */}
            {index < (currentProject?.clips.length || 0) - 1 && clip.transition !== "none" && (
              <View
                style={{
                  position: "absolute",
                  right: -6,
                  top: "50%",
                  marginTop: -12,
                  backgroundColor: STUDIO.swirlBlue,
                  borderRadius: 12,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: 8,
                    fontWeight: "bold",
                  }}
                >
                  {clip.transition?.toUpperCase()}
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }}>
        <View className="flex-1 items-center justify-center">
          <Text style={{ color: STUDIO.nickelDark }}>Loading projects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Project list view
  if (!currentProject) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text
            className="text-3xl font-bold mb-2"
            style={{ color: STUDIO.text }}
          >
            Movie Maker
          </Text>
          <Text className="text-base mb-6" style={{ color: STUDIO.nickelDark }}>
            Create and edit video projects with drag-and-drop timeline
          </Text>

          {/* New Project Button */}
          <Pressable onPress={() => setShowNewProjectModal(true)} className="mb-6">
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
                <View className="flex-row items-center justify-center">
                  <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                  <Text className="text-white font-bold text-lg ml-2">
                    New Project
                  </Text>
                </View>
              </LinearGradient>
            )}
          </Pressable>

          {/* Test API Button */}
          <Pressable onPress={testJSON2VideoAPI} className="mb-6">
            {({ pressed }) => (
              <View
                className="rounded-lg p-4 border-2"
                style={{
                  borderColor: STUDIO.amber,
                  backgroundColor: pressed ? STUDIO.dark : "transparent",
                  opacity: pressed ? 0.7 : 1,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Ionicons name="flask-outline" size={20} color={STUDIO.amber} />
                  <Text className="font-semibold text-base ml-2" style={{ color: STUDIO.amber }}>
                    Test JSON2Video API
                  </Text>
                </View>
              </View>
            )}
          </Pressable>

          {/* Projects List */}
          {projects.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="film-outline" size={64} color={STUDIO.nickelDark} />
              <Text
                className="text-lg font-semibold mt-4"
                style={{ color: STUDIO.text }}
              >
                No Projects Yet
              </Text>
              <Text className="text-sm mt-2" style={{ color: STUDIO.nickelDark }}>
                Create your first movie project
              </Text>
            </View>
          ) : (
            <View>
              <Text
                className="text-sm font-semibold mb-3"
                style={{ color: STUDIO.nickelLight }}
              >
                YOUR PROJECTS
              </Text>
              {projects.map((project) => (
                <Pressable
                  key={project.id}
                  onPress={() => {
                    setCurrentProject(project);
                    safeHaptics.impactAsync(ImpactFeedbackStyle.Medium);
                  }}
                  className="mb-3"
                >
                  {({ pressed }) => (
                    <View
                      className="rounded-lg p-4"
                      style={{
                        backgroundColor: STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text
                            className="text-lg font-semibold mb-1"
                            style={{ color: STUDIO.text }}
                          >
                            {project.name}
                          </Text>
                          <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                            {project.clips.length} clips • {new Date(project.updatedAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              deleteProject(project.id);
                            }}
                            hitSlop={10}
                          >
                            <Ionicons name="trash-outline" size={20} color={STUDIO.error} />
                          </Pressable>
                          <Ionicons name="chevron-forward" size={24} color={STUDIO.amber} />
                        </View>
                      </View>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          )}

          {/* Info Card */}
          <View
            className="p-4 rounded-lg mt-6"
            style={{ backgroundColor: STUDIO.slate }}
          >
            <View className="flex-row items-start">
              <Ionicons
                name="information-circle"
                size={20}
                color={STUDIO.amber}
                style={{ marginRight: 8, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="font-semibold mb-1"
                  style={{ color: STUDIO.text }}
                >
                  Professional Timeline Editor
                </Text>
                <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                  • Drag and drop clips to reorder{"\n"}
                  • Add videos from your library{"\n"}
                  • Set transitions between clips{"\n"}
                  • Preview individual clips{"\n"}
                  • Create your final video
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* New Project Modal */}
        <Modal
          visible={showNewProjectModal}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setShowNewProjectModal(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }}>
            <View
              className="flex-1 p-6"
              style={{ backgroundColor: STUDIO.void }}
            >
              <Text
                className="text-2xl font-bold mb-6"
                style={{ color: STUDIO.text }}
              >
                New Project
              </Text>

              <Text
                className="text-sm font-semibold mb-2"
                style={{ color: STUDIO.nickelLight }}
              >
                PROJECT NAME
              </Text>
              <TextInput
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="Enter project name..."
                placeholderTextColor={STUDIO.nickelDark}
                className="p-4 rounded-lg text-base mb-6"
                style={{
                  backgroundColor: STUDIO.slate,
                  color: STUDIO.text,
                }}
                autoFocus
              />

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setShowNewProjectModal(false);
                    setNewProjectName("");
                  }}
                  className="flex-1"
                >
                  {({ pressed }) => (
                    <View
                      className="py-3 rounded-lg items-center"
                      style={{
                        backgroundColor: STUDIO.slate,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Text className="font-semibold" style={{ color: STUDIO.text }}>
                        Cancel
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable onPress={createNewProject} className="flex-1">
                  {({ pressed }) => (
                    <View
                      className="py-3 rounded-lg items-center"
                      style={{
                        backgroundColor: STUDIO.amber,
                        opacity: pressed ? 0.7 : 1,
                      }}
                    >
                      <Text className="font-semibold" style={{ color: STUDIO.void }}>
                        Create
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // Project editor view with timeline
  const sortedClips = [...currentProject.clips].sort((a, b) => a.order - b.order);
  const selectedClip = sortedClips.find(c => c.id === selectedClipId);
  const selectedIndex = sortedClips.findIndex(c => c.id === selectedClipId);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["top", "bottom"]}>
        {/* Header */}
        <View
          className="px-4 py-4 flex-row items-center justify-between"
          style={{ backgroundColor: STUDIO.dark }}
        >
          <Pressable
            onPress={() => setCurrentProject(null)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {({ pressed }) => (
              <View
                className="flex-row items-center"
                style={{ opacity: pressed ? 0.7 : 1 }}
              >
                <Ionicons name="arrow-back" size={28} color={STUDIO.amber} />
                <Text className="text-lg font-bold ml-3" style={{ color: STUDIO.text }}>
                  {currentProject.name}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable onPress={createVideo} disabled={creating}>
            {({ pressed }) => (
              <View
                className="px-4 py-2 rounded-lg flex-row items-center"
                style={{
                  backgroundColor: creating ? STUDIO.nickelDark : STUDIO.success,
                  opacity: pressed || creating ? 0.7 : 1,
                }}
              >
                {creating ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text className="font-semibold ml-2" style={{ color: "#FFFFFF" }}>
                      {createProgress}%
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text className="font-semibold ml-2" style={{ color: "#FFFFFF" }}>
                      Create
                    </Text>
                  </>
                )}
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Preview Section */}
          {previewClipUri && (
            <View className="mb-6">
              <Text
                className="text-sm font-semibold mb-3"
                style={{ color: STUDIO.nickelLight }}
              >
                PREVIEW
              </Text>
              <View className="rounded-lg overflow-hidden" style={{ height: 250, backgroundColor: STUDIO.charcoal }}>
                <VideoView
                  player={player}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  allowsFullscreen
                  allowsPictureInPicture
                  nativeControls
                />
              </View>
            </View>
          )}

          {/* Timeline Section */}
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-3">
              <Text
                className="text-sm font-semibold"
                style={{ color: STUDIO.nickelLight }}
              >
                TIMELINE ({sortedClips.length} clips)
              </Text>
              <Pressable onPress={addVideoToProject}>
                {({ pressed }) => (
                  <View
                    className="flex-row items-center px-3 py-1 rounded-lg"
                    style={{
                      backgroundColor: STUDIO.amber,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Ionicons name="add" size={16} color={STUDIO.void} />
                    <Text className="text-xs font-semibold ml-1" style={{ color: STUDIO.void }}>
                      Add Clip
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>

            {sortedClips.length === 0 ? (
              <Pressable onPress={addVideoToProject}>
                {({ pressed }) => (
                  <View
                    className="py-12 rounded-lg items-center justify-center border-2 border-dashed"
                    style={{
                      backgroundColor: pressed ? STUDIO.dark : STUDIO.slate,
                      borderColor: STUDIO.amber,
                      opacity: pressed ? 0.7 : 1,
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={48} color={STUDIO.amber} />
                    <Text className="text-base font-semibold mt-3" style={{ color: STUDIO.text }}>
                      Add Your First Clip
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: STUDIO.nickelDark }}>
                      Tap to select videos from your library
                    </Text>
                  </View>
                )}
              </Pressable>
            ) : (
              <View>
                {/* Timeline hint */}
                <View className="mb-3 p-3 rounded-lg" style={{ backgroundColor: STUDIO.dark }}>
                  <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                    💡 Press and drag clips to reorder • Tap to preview and edit
                  </Text>
                </View>

                {/* Horizontal scrollable timeline */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                  style={{
                    backgroundColor: STUDIO.dark,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  {sortedClips.map((clip, index) => (
                    <TimelineClip key={clip.id} clip={clip} index={index} />
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Clip Settings */}
          {selectedClip && selectedIndex >= 0 && (
            <View className="mb-6 p-4 rounded-lg" style={{ backgroundColor: STUDIO.dark }}>
              <Text
                className="text-sm font-semibold mb-3"
                style={{ color: STUDIO.nickelLight }}
              >
                CLIP {selectedIndex + 1} SETTINGS
              </Text>

              <View className="mb-3">
                <Text className="text-xs font-medium mb-2" style={{ color: STUDIO.nickelDark }}>
                  Duration: {(selectedClip.duration / 1000).toFixed(1)}s
                </Text>
              </View>

              {/* Transition Selector - only show if not the last clip */}
              {selectedIndex < sortedClips.length - 1 && (
                <View>
                  <Text className="text-xs font-medium mb-2" style={{ color: STUDIO.nickelDark }}>
                    Transition to next clip:
                  </Text>
                  <View className="flex-row gap-2">
                    {["none", "fade", "dissolve", "wipe"].map((t) => {
                      const isActive = selectedClip.transition === t;
                      return (
                        <Pressable
                          key={t}
                          onPress={() => setTransition(selectedClip.id, t as any)}
                          className="flex-1"
                        >
                          {({ pressed }) => (
                            <View
                              className="py-2 rounded items-center"
                              style={{
                                backgroundColor: isActive ? STUDIO.amber : STUDIO.slate,
                                opacity: pressed ? 0.7 : 1,
                              }}
                            >
                              <Text
                                className="text-xs font-semibold capitalize"
                                style={{
                                  color: isActive ? STUDIO.void : STUDIO.text,
                                }}
                              >
                                {t}
                              </Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Info Card */}
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
                <Text
                  className="font-semibold mb-1"
                  style={{ color: STUDIO.text }}
                >
                  How to Use
                </Text>
                <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                  1. Add videos from your library{"\n"}
                  2. Drag clips to reorder in timeline{"\n"}
                  3. Tap clips to preview and edit{"\n"}
                  4. Set transitions between clips{"\n"}
                  5. Tap &ldquo;Create&rdquo; to generate your video
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sequential Video Player Modal */}
        {showVideoPlayer && currentProject && (
          <Modal
            visible={showVideoPlayer}
            animationType="slide"
            presentationStyle="fullScreen"
          >
            <SequentialVideoPlayer
              clips={sortedClips.map(clip => ({
                id: clip.id,
                uri: clip.uri,
                duration: clip.duration,
                trimStart: clip.trimStart,
                trimEnd: clip.trimEnd,
                transition: clip.transition,
              }))}
              projectName={currentProject.name}
              onClose={() => setShowVideoPlayer(false)}
              autoPlay={true}
            />
          </Modal>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
