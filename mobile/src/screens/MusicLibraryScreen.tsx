import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import Slider from "@react-native-community/slider";
import { useAudioStore, AudioTrack } from "../state/audioStore";
import { STUDIO } from "../utils/theme";

export function MusicLibraryScreen() {
  const tracks = useAudioStore((s) => s.tracks);
  const removeTrack = useAudioStore((s) => s.removeTrack);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Update position tracking
  useEffect(() => {
    if (isPlaying && sound && !isSeeking) {
      positionUpdateInterval.current = setInterval(async () => {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          setPosition(status.positionMillis / 1000);
          setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
        }
      }, 100);
    } else {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
        positionUpdateInterval.current = null;
      }
    }

    return () => {
      if (positionUpdateInterval.current) {
        clearInterval(positionUpdateInterval.current);
      }
    };
  }, [isPlaying, sound, isSeeking]);

  const playInApp = async (track: AudioTrack) => {
    try {
      // Stop current sound if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(track.uri);
      console.log("File info:", fileInfo);

      if (!fileInfo.exists) {
        Alert.alert("Error", "Audio file not found");
        return;
      }

      console.log("Loading audio from:", track.uri);

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        }
      );

      setSound(newSound);
      setIsPlaying(true);
      setCurrentTrack(track);
      setPosition(0);

      // Get initial duration
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }
    } catch (err: any) {
      console.log("Play error:", err);
      Alert.alert("Error", `Failed to play audio: ${err.message || "Unknown error"}`);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    } catch (err) {
      console.log("Toggle play/pause error:", err);
    }
  };

  const skipForward = async () => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.min(
          status.positionMillis + 10000,
          status.durationMillis || 0
        );
        await sound.setPositionAsync(newPosition);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.log("Skip forward error:", err);
    }
  };

  const skipBackward = async () => {
    if (!sound) return;
    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        const newPosition = Math.max(status.positionMillis - 10000, 0);
        await sound.setPositionAsync(newPosition);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err) {
      console.log("Skip backward error:", err);
    }
  };

  const onSeekStart = () => {
    setIsSeeking(true);
  };

  const onSeekComplete = async (value: number) => {
    if (!sound) return;
    try {
      await sound.setPositionAsync(value * 1000);
      setPosition(value);
      setIsSeeking(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.log("Seek error:", err);
      setIsSeeking(false);
    }
  };

  const stopPlayback = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setCurrentTrack(null);
      setPosition(0);
      setDuration(0);
    }
  };

  const openInOtherApp = async (track: AudioTrack) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log("Opening file:", track.uri);

      // Try using UTI for proper audio file handling on iOS
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }

      // On iOS, this should show the share sheet with "Open in..." options
      await Sharing.shareAsync(track.uri, {
        UTI: "public.audio",
        mimeType: "audio/mpeg",
      });

      console.log("Share dialog opened");
    } catch (err: any) {
      console.log("Share error:", err);
      Alert.alert("Error", `Failed to open: ${err.message || err}`);
    }
  };

  const deleteTrack = async (track: AudioTrack) => {
    Alert.alert(
      "Delete Audio",
      `Are you sure you want to delete "${track.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Stop playback if this track is playing
              if (sound) {
                await stopPlayback();
              }

              // Delete file
              await FileSystem.deleteAsync(track.uri, { idempotent: true });

              // Remove from store
              removeTrack(track.id);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSelectedTrack(null);
            } catch (err) {
              Alert.alert("Error", "Failed to delete audio file");
              console.log("Delete error:", err);
            }
          },
        },
      ]
    );
  };

  const handleTrackPress = (track: AudioTrack) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTrack(track);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["bottom"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {tracks.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Ionicons name="musical-notes-outline" size={64} color={STUDIO.nickelDark} />
            <Text
              className="text-lg font-semibold mt-4"
              style={{ color: STUDIO.text }}
            >
              No Audio Files
            </Text>
            <Text className="text-sm mt-2" style={{ color: STUDIO.nickelDark }}>
              Download audio from YouTube to get started
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-sm font-semibold mb-4" style={{ color: STUDIO.nickelLight }}>
              {tracks.length} {tracks.length === 1 ? "FILE" : "FILES"}
            </Text>

            {tracks.map((track, index) => (
              <Pressable
                key={track.id}
                onPress={() => handleTrackPress(track)}
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
                    <View className="flex-row items-center">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: STUDIO.charcoal }}
                      >
                        <Ionicons name="musical-note" size={20} color={STUDIO.amber} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-base font-semibold mb-1"
                          style={{ color: STUDIO.text }}
                          numberOfLines={1}
                        >
                          {track.name}
                        </Text>
                        <Text className="text-xs" style={{ color: STUDIO.nickelDark }}>
                          {formatDate(track.createdAt)} • {formatDuration(track.duration)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={STUDIO.nickelDark} />
                    </View>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Track Options Modal */}
      <Modal
        visible={!!selectedTrack}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedTrack(null)}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onPress={() => setSelectedTrack(null)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={["bottom"]}>
              <View
                className="rounded-t-3xl p-6"
                style={{ backgroundColor: STUDIO.dark }}
              >
                {selectedTrack && (
                  <>
                    {/* Track Info */}
                    <View className="mb-6">
                      <Text
                        className="text-xl font-bold mb-2"
                        style={{ color: STUDIO.text }}
                        numberOfLines={2}
                      >
                        {selectedTrack.name}
                      </Text>
                      <Text className="text-sm" style={{ color: STUDIO.nickelDark }}>
                        {formatDate(selectedTrack.createdAt)} • {formatDuration(selectedTrack.duration)}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="gap-3">
                      {/* Play in App */}
                      <Pressable
                        onPress={() => {
                          playInApp(selectedTrack);
                          setSelectedTrack(null);
                        }}
                      >
                        {({ pressed }) => (
                          <View
                            className="flex-row items-center p-4 rounded-lg"
                            style={{
                              backgroundColor: STUDIO.slate,
                              opacity: pressed ? 0.7 : 1,
                            }}
                          >
                            <Ionicons name="play-circle" size={24} color={STUDIO.amber} />
                            <Text
                              className="text-base font-semibold ml-3"
                              style={{ color: STUDIO.text }}
                            >
                              Play in App
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      {/* Open in Other App */}
                      <Pressable
                        onPress={async () => {
                          const track = selectedTrack;
                          setSelectedTrack(null); // Close modal first
                          // Wait a moment for modal to close
                          setTimeout(() => {
                            if (track) openInOtherApp(track);
                          }, 300);
                        }}
                      >
                        {({ pressed }) => (
                          <View
                            className="flex-row items-center p-4 rounded-lg"
                            style={{
                              backgroundColor: STUDIO.slate,
                              opacity: pressed ? 0.7 : 1,
                            }}
                          >
                            <Ionicons name="share-outline" size={24} color={STUDIO.swirlBlue} />
                            <Text
                              className="text-base font-semibold ml-3"
                              style={{ color: STUDIO.text }}
                            >
                              Open in Other App
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      {/* Delete */}
                      <Pressable onPress={() => deleteTrack(selectedTrack)}>
                        {({ pressed }) => (
                          <View
                            className="flex-row items-center p-4 rounded-lg"
                            style={{
                              backgroundColor: STUDIO.slate,
                              opacity: pressed ? 0.7 : 1,
                            }}
                          >
                            <Ionicons name="trash" size={24} color={STUDIO.error} />
                            <Text
                              className="text-base font-semibold ml-3"
                              style={{ color: STUDIO.error }}
                            >
                              Delete
                            </Text>
                          </View>
                        )}
                      </Pressable>

                      {/* Cancel */}
                      <Pressable onPress={() => setSelectedTrack(null)}>
                        {({ pressed }) => (
                          <View
                            className="flex-row items-center p-4 rounded-lg justify-center"
                            style={{
                              backgroundColor: STUDIO.charcoal,
                              opacity: pressed ? 0.7 : 1,
                            }}
                          >
                            <Text
                              className="text-base font-semibold"
                              style={{ color: STUDIO.text }}
                            >
                              Cancel
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Now Playing Bar */}
      {sound && currentTrack && (
        <View
          className="border-t"
          style={{
            backgroundColor: STUDIO.dark,
            borderTopColor: STUDIO.border,
            paddingTop: 12,
            paddingBottom: 24,
            paddingHorizontal: 16,
          }}
        >
          {/* Track Info */}
          <View className="flex-row items-center mb-3">
            <View
              className="w-10 h-10 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: STUDIO.charcoal }}
            >
              <Ionicons name="musical-note" size={20} color={STUDIO.amber} />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-semibold"
                style={{ color: STUDIO.text }}
                numberOfLines={1}
              >
                {currentTrack.name}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: STUDIO.nickelDark }}>
                Now Playing
              </Text>
            </View>
            <Pressable onPress={stopPlayback}>
              {({ pressed }) => (
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: STUDIO.slate,
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Ionicons name="close" size={18} color={STUDIO.text} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Progress Bar */}
          <View className="mb-2">
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={duration}
              value={isSeeking ? position : position}
              onSlidingStart={onSeekStart}
              onSlidingComplete={onSeekComplete}
              onValueChange={(value) => {
                if (isSeeking) {
                  setPosition(value);
                }
              }}
              minimumTrackTintColor={STUDIO.amber}
              maximumTrackTintColor={STUDIO.nickelDark}
              thumbTintColor={STUDIO.amber}
            />
          </View>

          {/* Time Display */}
          <View className="flex-row justify-between mb-3 px-1">
            <Text className="text-xs" style={{ color: STUDIO.nickelLight }}>
              {formatTime(position)}
            </Text>
            <Text className="text-xs" style={{ color: STUDIO.nickelLight }}>
              {formatTime(duration)}
            </Text>
          </View>

          {/* Playback Controls */}
          <View className="flex-row items-center justify-center gap-6">
            {/* Skip Backward */}
            <Pressable onPress={skipBackward}>
              {({ pressed }) => (
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: STUDIO.slate,
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Ionicons name="play-back" size={20} color={STUDIO.text} />
                </View>
              )}
            </Pressable>

            {/* Play/Pause */}
            <Pressable onPress={togglePlayPause}>
              {({ pressed }) => (
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: STUDIO.amber,
                    opacity: pressed ? 0.8 : 1,
                  }}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={28}
                    color={STUDIO.void}
                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                  />
                </View>
              )}
            </Pressable>

            {/* Skip Forward */}
            <Pressable onPress={skipForward}>
              {({ pressed }) => (
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: STUDIO.slate,
                    opacity: pressed ? 0.7 : 1,
                  }}
                >
                  <Ionicons name="play-forward" size={20} color={STUDIO.text} />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
