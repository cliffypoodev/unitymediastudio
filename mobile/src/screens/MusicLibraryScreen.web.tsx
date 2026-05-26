import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAudioStore, AudioTrack } from "../state/audioStore";
import { STUDIO } from "../utils/theme";

export function MusicLibraryScreen() {
  const tracks = useAudioStore((s) => s.tracks);
  const removeTrack = useAudioStore((s) => s.removeTrack);
  const [selectedTrack, setSelectedTrack] = useState<AudioTrack | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setPosition(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setPosition(0);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentTrack]);

  const playInApp = (track: AudioTrack) => {
    // Stop current sound if playing
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create new audio element
    const audio = new Audio(track.uri);
    audioRef.current = audio;
    setCurrentTrack(track);
    setPosition(0);

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch((err) => {
      console.log("Play error:", err);
      window.alert("Failed to play audio. The file may not be accessible.");
    });
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.currentTime + 10, audio.duration || 0);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  };

  const onSeekChange = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setPosition(value);
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setPosition(0);
    setDuration(0);
  };

  const deleteTrack = (track: AudioTrack) => {
    if (window.confirm(`Are you sure you want to delete "${track.name}"?`)) {
      if (currentTrack?.id === track.id) {
        stopPlayback();
      }
      removeTrack(track.id);
      setSelectedTrack(null);
    }
  };

  const downloadTrack = (track: AudioTrack) => {
    const link = document.createElement("a");
    link.href = track.uri;
    link.download = `${track.name}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleTrackPress = (track: AudioTrack) => {
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

            {tracks.map((track) => (
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

                      {/* Download */}
                      <Pressable
                        onPress={() => {
                          downloadTrack(selectedTrack);
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
                            <Ionicons name="download-outline" size={24} color={STUDIO.swirlBlue} />
                            <Text
                              className="text-base font-semibold ml-3"
                              style={{ color: STUDIO.text }}
                            >
                              Download File
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
      {currentTrack && (
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
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={position}
              onChange={(e) => onSeekChange(Number(e.target.value))}
              style={{
                width: "100%",
                height: 8,
                borderRadius: 4,
                backgroundColor: STUDIO.nickelDark,
                accentColor: STUDIO.amber,
              }}
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
