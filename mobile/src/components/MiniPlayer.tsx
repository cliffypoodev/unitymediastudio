import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useAudioStore, AudioTrack } from "../state/audioStore";
import { STUDIO } from "../utils/theme";

// Map old TWILIGHT names to STUDIO for compatibility
const TWILIGHT = {
  void: STUDIO.void,
  dark: STUDIO.dark,
  shadow: STUDIO.charcoal,
  dusk: STUDIO.slate,
  purple: STUDIO.border,
  gold: STUDIO.amber,
  amber: STUDIO.woodLight,
  cyan: STUDIO.swirlCyan,
  wolf: STUDIO.nickelDark,
  fur: STUDIO.nickelLight,
};

interface MiniPlayerProps {
  track: AudioTrack;
  onClose: () => void;
  bottomInset?: number;
}

export function MiniPlayer({ track, onClose, bottomInset = 0 }: MiniPlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [duration, setDuration] = useState(track.duration || 0);
  const [isLoaded, setIsLoaded] = useState(false);

  const progress = useSharedValue(0);
  const scale = useSharedValue(1);

  const formatTime = (ms: number) => {
    if (!ms || isNaN(ms)) return "0:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Convert semitones to rate
  const semitonesToRate = (semitones: number): number => {
    return Math.pow(2, semitones / 12);
  };

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    setCurrentPosition(status.positionMillis);
    setIsPlaying(status.isPlaying);

    if (status.durationMillis) {
      setDuration(status.durationMillis);
      progress.value = status.positionMillis / status.durationMillis;
    }

    // Handle loop if enabled
    if (track.savedSettings?.loopEnabled && track.savedSettings.loopEnd !== null) {
      if (status.positionMillis >= track.savedSettings.loopEnd) {
        soundRef.current?.setPositionAsync(track.savedSettings.loopStart || 0);
      }
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setCurrentPosition(0);
      progress.value = 0;
    }
  }, [track.savedSettings, progress]);

  useEffect(() => {
    loadAudio();
    return () => {
      unloadAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.uri, track.savedSettings]);

  const loadAudio = async () => {
    try {
      await unloadAudio();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;

      if (status.isLoaded) {
        setDuration(status.durationMillis || track.duration || 0);
        setIsLoaded(true);

        // Apply saved settings if available
        if (track.savedSettings) {
          const { speed, pitch } = track.savedSettings;
          if (speed !== 1.0 || pitch !== 0) {
            const pitchRate = pitch !== 0 ? semitonesToRate(pitch) : 1;
            const combinedRate = speed * pitchRate;
            const clampedRate = Math.max(0.25, Math.min(2.0, combinedRate));
            await sound.setRateAsync(clampedRate, pitch === 0);
          }

          // Seek to loop start if set
          if (track.savedSettings.loopStart !== null) {
            await sound.setPositionAsync(track.savedSettings.loopStart);
          }
        }
      }
    } catch (error) {
      console.log("Error loading audio:", error);
    }
  };

  const unloadAudio = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsLoaded(false);
    setIsPlaying(false);
    setCurrentPosition(0);
  };

  const togglePlayPause = async () => {
    if (!soundRef.current || !isLoaded) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, {}, () => {
      scale.value = withSpring(1);
    });

    if (isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      if (currentPosition >= duration - 100) {
        await soundRef.current.setPositionAsync(track.savedSettings?.loopStart || 0);
      }
      await soundRef.current.playAsync();
    }
  };

  const handleSkipBack = async () => {
    if (!soundRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPosition = Math.max(0, currentPosition - 10000);
    await soundRef.current.setPositionAsync(newPosition);
  };

  const handleSkipForward = async () => {
    if (!soundRef.current) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPosition = Math.min(duration, currentPosition + 10000);
    await soundRef.current.setPositionAsync(newPosition);
  };

  const handleClose = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await unloadAudio();
    onClose();
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${interpolate(progress.value, [0, 1], [0, 100])}%`,
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: bottomInset + 8,
        backgroundColor: TWILIGHT.dusk,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: TWILIGHT.purple,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        overflow: "hidden",
      }}
    >
      {/* Progress bar */}
      <View
        style={{
          height: 3,
          backgroundColor: TWILIGHT.shadow,
          width: "100%",
        }}
      >
        <Animated.View
          style={[
            {
              height: "100%",
              backgroundColor: TWILIGHT.gold,
            },
            progressStyle,
          ]}
        />
      </View>

      <View className="flex-row items-center p-3">
        {/* Track info */}
        <View className="flex-1 mr-3">
          <Text
            className="font-semibold text-sm"
            style={{ color: "#fff" }}
            numberOfLines={1}
          >
            {track.name}
          </Text>
          <View className="flex-row items-center mt-0.5">
            <Text className="text-xs" style={{ color: TWILIGHT.fur }}>
              {formatTime(currentPosition)} / {formatTime(duration)}
            </Text>
            {track.savedSettings && (track.savedSettings.speed !== 1.0 || track.savedSettings.pitch !== 0) && (
              <View
                className="ml-2 px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "rgba(78, 205, 196, 0.2)" }}
              >
                <Text className="text-[10px]" style={{ color: TWILIGHT.cyan }}>
                  {track.savedSettings.speed !== 1.0 && `${track.savedSettings.speed.toFixed(1)}x`}
                  {track.savedSettings.speed !== 1.0 && track.savedSettings.pitch !== 0 && " "}
                  {track.savedSettings.pitch !== 0 && `${track.savedSettings.pitch > 0 ? "+" : ""}${track.savedSettings.pitch}st`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Controls */}
        <View className="flex-row items-center">
          <Pressable
            onPress={handleSkipBack}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="play-back" size={20} color={TWILIGHT.fur} />
          </Pressable>

          <Animated.View style={playButtonStyle}>
            <Pressable
              onPress={togglePlayPause}
              disabled={!isLoaded}
              className="w-12 h-12 rounded-full items-center justify-center mx-1"
              style={{
                backgroundColor: TWILIGHT.gold,
                opacity: isLoaded ? 1 : 0.5,
              }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color={TWILIGHT.void}
                style={{ marginLeft: isPlaying ? 0 : 2 }}
              />
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={handleSkipForward}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="play-forward" size={20} color={TWILIGHT.fur} />
          </Pressable>

          <Pressable
            onPress={handleClose}
            className="w-10 h-10 items-center justify-center ml-1"
          >
            <Ionicons name="close" size={22} color={TWILIGHT.fur} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
