/**
 * Sequential Video Player
 *
 * Plays multiple video clips in sequence with smooth transitions
 * This provides the experience of a "stitched" video without needing FFmpeg
 */
import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, Dimensions, ActivityIndicator } from "react-native";
import { VideoView, useVideoPlayer, VideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { safeHaptics, ImpactFeedbackStyle } from "../utils/platform";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface VideoClip {
  id: string;
  uri: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  transition?: "fade" | "dissolve" | "wipe" | "slide" | "none";
}

interface SequentialVideoPlayerProps {
  clips: VideoClip[];
  projectName: string;
  onClose: () => void;
  autoPlay?: boolean;
}

export function SequentialVideoPlayer({
  clips,
  projectName,
  onClose,
  autoPlay = true,
}: SequentialVideoPlayerProps) {
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [totalPlaybackTime, setTotalPlaybackTime] = useState(0);

  // Opacity for fade transitions
  const opacity = useSharedValue(1);

  // Current clip
  const currentClip = clips[currentClipIndex];

  // Video players - we need two for smooth transitions
  const currentPlayer = useVideoPlayer(currentClip?.uri || "", (player) => {
    player.loop = false;
    if (autoPlay) {
      player.play();
    }
  });

  const nextPlayer = useVideoPlayer("", (player) => {
    player.loop = false;
    player.pause();
  });

  // Track playback position
  const playbackCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Calculate total duration
    const total = clips.reduce((sum, clip) => {
      const clipDuration = clip.trimEnd - clip.trimStart;
      return sum + clipDuration;
    }, 0);
    setTotalPlaybackTime(total);

    return () => {
      if (playbackCheckInterval.current) {
        clearInterval(playbackCheckInterval.current);
      }
    };
  }, [clips]);

  useEffect(() => {
    if (!currentClip) return;

    // Load current clip
    currentPlayer.replaceAsync(currentClip.uri).then(() => {
      setLoading(false);
      if (autoPlay) {
        currentPlayer.play();
        setIsPlaying(true);
      }
    }).catch(err => {
      console.error("Error loading clip:", err);
      setLoading(false);
    });

    // Preload next clip if available
    if (currentClipIndex < clips.length - 1) {
      const nextClip = clips[currentClipIndex + 1];
      nextPlayer.replaceAsync(nextClip.uri).catch(err => {
        console.error("Error preloading next clip:", err);
      });
    }

    // Monitor playback and trigger transition at the right time
    playbackCheckInterval.current = setInterval(() => {
      if (currentPlayer.playing && !isTransitioning) {
        const currentTime = currentPlayer.currentTime * 1000; // Convert to ms
        const clipDuration = currentClip.trimEnd - currentClip.trimStart;
        const transitionDuration = 500; // 500ms transition

        // Start transition 500ms before clip ends
        if (currentTime >= clipDuration - transitionDuration) {
          advanceToNextClip();
        }
      }
    }, 100);

    return () => {
      if (playbackCheckInterval.current) {
        clearInterval(playbackCheckInterval.current);
      }
    };
  }, [currentClipIndex, currentClip]);

  const advanceToNextClip = () => {
    if (isTransitioning) return;
    if (currentClipIndex >= clips.length - 1) {
      // End of playlist
      setIsPlaying(false);
      return;
    }

    setIsTransitioning(true);
    const transition = currentClip.transition || "fade";

    // Perform transition animation
    if (transition === "fade" || transition === "dissolve") {
      opacity.value = withTiming(0, {
        duration: 500,
        easing: Easing.ease,
      });

      setTimeout(() => {
        setCurrentClipIndex(prev => prev + 1);
        opacity.value = withTiming(1, {
          duration: 500,
          easing: Easing.ease,
        });
        setIsTransitioning(false);
      }, 500);
    } else {
      // No transition or unsupported - just jump to next
      setCurrentClipIndex(prev => prev + 1);
      setIsTransitioning(false);
    }

    safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      currentPlayer.pause();
    } else {
      currentPlayer.play();
    }
    setIsPlaying(!isPlaying);
    safeHaptics.impactAsync(ImpactFeedbackStyle.Medium);
  };

  const goToPreviousClip = () => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex(prev => prev - 1);
      setIsPlaying(true);
      safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  const goToNextClip = () => {
    if (currentClipIndex < clips.length - 1) {
      advanceToNextClip();
    }
  };

  const restart = () => {
    setCurrentClipIndex(0);
    setIsPlaying(true);
    safeHaptics.impactAsync(ImpactFeedbackStyle.Medium);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getCurrentProgress = () => {
    if (!currentPlayer || !currentClip) return 0;
    const currentTime = currentPlayer.currentTime * 1000;
    const clipDuration = currentClip.trimEnd - currentClip.trimStart;
    return (currentTime / clipDuration) * 100;
  };

  return (
    <View className="flex-1 bg-black">
      {/* Video Player */}
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        <VideoView
          player={currentPlayer}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          contentFit="contain"
          nativeControls={false}
        />
      </Animated.View>

      {/* Loading Indicator */}
      {loading && (
        <View className="absolute inset-0 items-center justify-center bg-black/50">
          <ActivityIndicator size="large" color="#fff" />
          <Text className="text-white mt-4 text-base">Loading video...</Text>
        </View>
      )}

      {/* Top Bar - Project Info & Close */}
      <View className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent px-4 pt-12 pb-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">{projectName}</Text>
            <Text className="text-white/70 text-sm mt-1">
              Clip {currentClipIndex + 1} of {clips.length}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 items-center justify-center bg-white/20 rounded-full"
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* Bottom Controls */}
      <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-6">
        {/* Progress Bar */}
        <View className="h-1 bg-white/30 rounded-full mb-6">
          <View
            className="h-full bg-white rounded-full"
            style={{ width: `${getCurrentProgress()}%` }}
          />
        </View>

        {/* Control Buttons */}
        <View className="flex-row items-center justify-between">
          {/* Previous Clip */}
          <Pressable
            onPress={goToPreviousClip}
            disabled={currentClipIndex === 0}
            className={`w-12 h-12 items-center justify-center rounded-full ${
              currentClipIndex === 0 ? "opacity-30" : "opacity-100"
            }`}
          >
            <Ionicons name="play-skip-back" size={28} color="#fff" />
          </Pressable>

          {/* Restart */}
          <Pressable
            onPress={restart}
            className="w-12 h-12 items-center justify-center rounded-full"
          >
            <Ionicons name="refresh" size={28} color="#fff" />
          </Pressable>

          {/* Play/Pause */}
          <Pressable
            onPress={togglePlayPause}
            className="w-16 h-16 items-center justify-center bg-white rounded-full"
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#000"
            />
          </Pressable>

          {/* Info */}
          <Pressable
            onPress={() => {
              // Could show clip details modal
              safeHaptics.impactAsync(ImpactFeedbackStyle.Light);
            }}
            className="w-12 h-12 items-center justify-center rounded-full"
          >
            <Ionicons name="information-circle-outline" size={28} color="#fff" />
          </Pressable>

          {/* Next Clip */}
          <Pressable
            onPress={goToNextClip}
            disabled={currentClipIndex === clips.length - 1}
            className={`w-12 h-12 items-center justify-center rounded-full ${
              currentClipIndex === clips.length - 1 ? "opacity-30" : "opacity-100"
            }`}
          >
            <Ionicons name="play-skip-forward" size={28} color="#fff" />
          </Pressable>
        </View>

        {/* Clip Duration Info */}
        <View className="flex-row items-center justify-center mt-4">
          <Text className="text-white/70 text-sm">
            Duration: {Math.round((currentClip?.trimEnd - currentClip?.trimStart) / 1000)}s
          </Text>
          {currentClip?.transition && currentClip.transition !== "none" && (
            <Text className="text-white/70 text-sm ml-4">
              • {currentClip.transition} transition
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
