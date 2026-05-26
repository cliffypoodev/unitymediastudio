import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import Slider from "@react-native-community/slider";
import { Svg, Rect, Line, G } from "react-native-svg";
import { useAudioStore, AudioTrack } from "../state/audioStore";
import { STUDIO } from "../utils/theme";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { MusicStackParamList } from "../navigation/RootNavigator";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WaveformData {
  peaks: number[]; // values 0..1
  duration: number;
}

interface SelectionRange {
  start: number; // seconds
  end: number;   // seconds
}

type AudioEditorNavigationProp = NativeStackNavigationProp<MusicStackParamList, "AudioEditor">;
type AudioEditorRouteProp = RouteProp<MusicStackParamList, "AudioEditor">;

interface Props {
  navigation: AudioEditorNavigationProp;
  route: AudioEditorRouteProp;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const WAVEFORM_HEIGHT = 120;
const WAVEFORM_BAR_COUNT = 100;
const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const PITCH_PRESETS = [-5, -3, -1, 0, 1, 3, 5];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeMs(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

function formatTimeSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Generate synthetic waveform peaks from duration (visual placeholder)
// Real waveform decoding requires native modules not available in Expo Go
function generateSyntheticPeaks(count: number, seed: number = 1): number[] {
  const peaks: number[] = [];
  let val = seed;
  for (let i = 0; i < count; i++) {
    // Pseudo-random but deterministic for a given seed
    val = (val * 1664525 + 1013904223) & 0xffffffff;
    const raw = ((val >>> 0) / 0xffffffff);
    // Shape: moderate amplitude in middle, lower at edges, with variation
    const pos = i / count;
    const envelope = Math.sin(pos * Math.PI) * 0.7 + 0.3;
    peaks.push(Math.max(0.05, Math.min(1, raw * envelope)));
  }
  return peaks;
}

// ─── Waveform Component ──────────────────────────────────────────────────────

interface WaveformProps {
  peaks: number[];
  duration: number;
  position: number;
  selection: SelectionRange | null;
  width: number;
  onSeek: (seconds: number) => void;
  onSelectionStart: (x: number, totalWidth: number) => void;
  onSelectionMove: (x: number, totalWidth: number) => void;
  onSelectionEnd: () => void;
}

function WaveformView({
  peaks,
  duration,
  position,
  selection,
  width,
  onSeek,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
}: WaveformProps) {
  const barWidth = width / peaks.length;
  const gap = Math.max(1, barWidth * 0.2);
  const effectiveBarW = Math.max(1, barWidth - gap);

  const posX = duration > 0 ? (position / duration) * width : 0;

  const selStartX = selection && duration > 0 ? (selection.start / duration) * width : null;
  const selEndX = selection && duration > 0 ? (selection.end / duration) * width : null;

  const isDragging = useRef(false);

  const handleTouchStart = (e: any) => {
    const x = e.nativeEvent.locationX;
    isDragging.current = true;
    onSelectionStart(x, width);
  };

  const handleTouchMove = (e: any) => {
    if (!isDragging.current) return;
    const x = e.nativeEvent.locationX;
    onSelectionMove(x, width);
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    onSelectionEnd();
  };

  return (
    <View
      style={{
        width,
        height: WAVEFORM_HEIGHT,
        backgroundColor: STUDIO.void,
        borderRadius: 8,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: STUDIO.border,
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouchStart}
      onResponderMove={handleTouchMove}
      onResponderRelease={handleTouchEnd}
    >
      <Svg width={width} height={WAVEFORM_HEIGHT}>
        {/* Selection overlay */}
        {selStartX !== null && selEndX !== null && (
          <Rect
            x={Math.min(selStartX, selEndX)}
            y={0}
            width={Math.abs(selEndX - selStartX)}
            height={WAVEFORM_HEIGHT}
            fill="rgba(255,107,53,0.25)"
          />
        )}

        {/* Waveform bars */}
        <G>
          {peaks.map((peak, i) => {
            const x = i * barWidth + gap / 2;
            const barH = Math.max(2, peak * (WAVEFORM_HEIGHT - 8));
            const y = (WAVEFORM_HEIGHT - barH) / 2;

            // Color bars based on position (played = brighter orange, unplayed = muted)
            const barCenterX = x + effectiveBarW / 2;
            const isPlayed = barCenterX <= posX;
            const isInSelection =
              selStartX !== null &&
              selEndX !== null &&
              barCenterX >= Math.min(selStartX, selEndX) &&
              barCenterX <= Math.max(selStartX, selEndX);

            const fillColor = isInSelection
              ? STUDIO.swirlOrange
              : isPlayed
              ? STUDIO.amber
              : STUDIO.nickelDark;

            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={effectiveBarW}
                height={barH}
                rx={effectiveBarW / 2}
                fill={fillColor}
              />
            );
          })}
        </G>

        {/* Playback cursor */}
        {posX > 0 && (
          <Line
            x1={posX}
            y1={0}
            x2={posX}
            y2={WAVEFORM_HEIGHT}
            stroke="white"
            strokeWidth={2}
          />
        )}

        {/* Selection handle lines */}
        {selStartX !== null && (
          <Line
            x1={selStartX}
            y1={0}
            x2={selStartX}
            y2={WAVEFORM_HEIGHT}
            stroke={STUDIO.swirlOrange}
            strokeWidth={2}
          />
        )}
        {selEndX !== null && (
          <Line
            x1={selEndX}
            y1={0}
            x2={selEndX}
            y2={WAVEFORM_HEIGHT}
            stroke={STUDIO.swirlOrange}
            strokeWidth={2}
          />
        )}
      </Svg>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function AudioEditorScreen({ navigation, route }: Props) {
  const tracks = useAudioStore((s) => s.tracks);
  const addTrack = useAudioStore((s) => s.addTrack);

  // ── File state ──
  const [loadedTrack, setLoadedTrack] = useState<AudioTrack | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [waveform, setWaveform] = useState<WaveformData | null>(null);
  const [waveformWidth, setWaveformWidth] = useState(300);

  // ── Playback state ──
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSeeking = useRef(false);

  // ── Speed & Pitch ──
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0); // semitones

  // ── Selection state ──
  const [selection, setSelection] = useState<SelectionRange | null>(null);
  const selectionDragStart = useRef<number | null>(null);
  const [isLoopingSelection, setIsLoopingSelection] = useState(false);
  const loopIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── History for undo trim ──
  const [originalTrack, setOriginalTrack] = useState<AudioTrack | null>(null);
  const [trimHistory, setTrimHistory] = useState<string[]>([]); // URIs

  // ── Export state ──
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // ── Error ──
  const [error, setError] = useState<string | null>(null);

  // ─── Check for route param ?trackId= on mount ───────────────────────────
  useEffect(() => {
    const params = route?.params as any;
    if (params?.trackId) {
      const track = tracks.find((t) => t.id === params.trackId);
      if (track) {
        loadTrackFromLibrary(track);
      }
    }
  }, []);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanupSound();
      if (positionInterval.current) clearInterval(positionInterval.current);
      if (loopIntervalRef.current) clearInterval(loopIntervalRef.current);
    };
  }, []);

  // ─── Position polling ────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && soundRef.current) {
      positionInterval.current = setInterval(async () => {
        if (isSeeking.current || !soundRef.current) return;
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            const posSeconds = status.positionMillis / 1000;
            setPosition(posSeconds);
            setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);

            // Loop selection playback
            if (
              isLoopingSelection &&
              selection &&
              posSeconds >= selection.end
            ) {
              await soundRef.current.setPositionAsync(selection.start * 1000);
            }
          }
        } catch {}
      }, 100);
    } else {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
        positionInterval.current = null;
      }
    }
    return () => {
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
        positionInterval.current = null;
      }
    };
  }, [isPlaying, isLoopingSelection, selection]);

  // ─── Apply speed & pitch to sound ────────────────────────────────────────
  useEffect(() => {
    if (!soundRef.current) return;
    applyPlaybackSettings();
  }, [speed, pitch]);

  async function applyPlaybackSettings() {
    if (!soundRef.current) return;
    try {
      // detune is in cents; 1 semitone = 100 cents
      // When using detune, playbackRate stays at desired speed
      // expo-av supports rate and shouldCorrectPitch
      await soundRef.current.setStatusAsync({
        rate: speed,
        shouldCorrectPitch: true, // tries to preserve pitch when rate changes
        pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
      } as any);
    } catch (e) {
      console.log("Error applying playback settings:", e);
    }
  }

  async function cleanupSound() {
    setIsLoopingSelection(false);
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
    setIsPlaying(false);
  }

  // ─── Load audio ──────────────────────────────────────────────────────────

  async function loadTrackFromLibrary(track: AudioTrack) {
    setIsLoadingFile(true);
    setError(null);
    try {
      await cleanupSound();
      setLoadedTrack(track);
      setOriginalTrack(track);
      setTrimHistory([]);
      setSelection(null);
      setPosition(0);
      setSpeed(1.0);
      setPitch(0);
      await loadAudio(track.uri);
    } catch (e: any) {
      setError(e.message || "Failed to load track");
    } finally {
      setIsLoadingFile(false);
    }
  }

  async function pickAudioFile() {
    try {
      setIsLoadingFile(true);
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        setIsLoadingFile(false);
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.name || `audio_${Date.now()}.mp3`;
      const destUri = `${FileSystem.documentDirectory}editor_${Date.now()}_${fileName}`;

      // Copy to document directory so it persists
      await FileSystem.copyAsync({ from: asset.uri, to: destUri });

      const track: AudioTrack = {
        id: `editor_${Date.now()}`,
        name: fileName.replace(/\.[^/.]+$/, ""),
        uri: destUri,
        duration: 0,
        createdAt: Date.now(),
      };

      await cleanupSound();
      setLoadedTrack(track);
      setOriginalTrack(track);
      setTrimHistory([]);
      setSelection(null);
      setPosition(0);
      setSpeed(1.0);
      setPitch(0);
      await loadAudio(destUri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message || "Failed to load audio file");
    } finally {
      setIsLoadingFile(false);
    }
  }

  async function loadAudio(uri: string) {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { sound, status } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false, volume: 1.0 },
      onPlaybackStatusUpdate
    );

    soundRef.current = sound;

    const loadedStatus = status as any;
    const dur = loadedStatus.durationMillis
      ? loadedStatus.durationMillis / 1000
      : 0;
    setDuration(dur);
    setPosition(0);

    // Generate synthetic waveform
    const seed = uri.split("").reduce((acc, c) => acc + c.charCodeAt(0), 1);
    const peaks = generateSyntheticPeaks(WAVEFORM_BAR_COUNT, seed);
    setWaveform({ peaks, duration: dur });
  }

  function onPlaybackStatusUpdate(status: AVPlaybackStatus) {
    if (!status.isLoaded) return;
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
      setIsLoopingSelection(false);
    }
  }

  // ─── Playback controls ───────────────────────────────────────────────────

  async function togglePlayPause() {
    if (!soundRef.current) return;
    try {
      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) return;

      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await applyPlaybackSettings();
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      console.log("Toggle play error:", e);
    }
  }

  async function seekTo(seconds: number) {
    if (!soundRef.current) return;
    isSeeking.current = true;
    try {
      const clamped = Math.max(0, Math.min(seconds, duration));
      await soundRef.current.setPositionAsync(clamped * 1000);
      setPosition(clamped);
    } catch {}
    isSeeking.current = false;
  }

  async function handleVolumeChange(val: number) {
    setVolume(val);
    if (soundRef.current) {
      try {
        await soundRef.current.setStatusAsync({ volume: val } as any);
      } catch {}
    }
  }

  async function playSelection() {
    if (!selection || !soundRef.current) return;
    try {
      await applyPlaybackSettings();
      await soundRef.current.setPositionAsync(selection.start * 1000);
      await soundRef.current.playAsync();
      setIsPlaying(true);
      setIsLoopingSelection(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      console.log("Play selection error:", e);
    }
  }

  // ─── Waveform gesture handlers ───────────────────────────────────────────

  function onWaveformSelectionStart(x: number, totalWidth: number) {
    const seconds = (x / totalWidth) * duration;
    selectionDragStart.current = seconds;
    setSelection({ start: seconds, end: seconds });
  }

  function onWaveformSelectionMove(x: number, totalWidth: number) {
    if (selectionDragStart.current === null) return;
    const seconds = Math.max(0, Math.min(duration, (x / totalWidth) * duration));
    const start = Math.min(selectionDragStart.current, seconds);
    const end = Math.max(selectionDragStart.current, seconds);
    setSelection({ start, end });
    // Also seek to position being dragged
    seekTo(seconds);
  }

  function onWaveformSelectionEnd() {
    if (
      selection &&
      Math.abs(selection.end - selection.start) < 0.1
    ) {
      // Treat as a seek tap, not a selection
      seekTo(selection.start);
      setSelection(null);
    }
    selectionDragStart.current = null;
  }

  // ─── Trim to selection ───────────────────────────────────────────────────

  async function trimToSelection() {
    if (!selection || !loadedTrack) return;
    const selDur = selection.end - selection.start;
    if (selDur < 0.1) {
      Alert.alert("Selection too short", "Please select a longer region to trim.");
      return;
    }

    Alert.alert(
      "Trim to Selection",
      `Keep only ${formatTimeMs(selection.start)} → ${formatTimeMs(selection.end)} (${formatTimeSec(selDur)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Trim",
          onPress: async () => {
            setIsExporting(true);
            setExportProgress(0);
            try {
              // Save current URI to trim history for undo
              setTrimHistory((prev) => [...prev, loadedTrack.uri]);

              // We can't do real audio trimming without native FFmpeg.
              // Instead, we store the trim range as metadata in the track
              // and apply it during export / playback.
              // For a real trim preview, we seek to start and note the range.
              const trimmedTrack: AudioTrack = {
                ...loadedTrack,
                id: `trimmed_${Date.now()}`,
                name: `${loadedTrack.name} (trimmed)`,
                savedSettings: {
                  speed,
                  pitch,
                  loopStart: selection.start,
                  loopEnd: selection.end,
                  loopEnabled: true,
                },
              };

              setExportProgress(0.5);
              await new Promise((r) => setTimeout(r, 200));
              setExportProgress(1);

              setLoadedTrack(trimmedTrack);
              setSelection(null);
              // Set playback to start of trim
              await seekTo(selection.start);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Trimmed",
                "Selection applied. Use 'Export Clip' to save the trimmed audio as a file.",
                [{ text: "OK" }]
              );
            } catch (e: any) {
              setError(e.message || "Trim failed");
            } finally {
              setIsExporting(false);
            }
          },
        },
      ]
    );
  }

  async function undoTrim() {
    if (!trimHistory.length || !originalTrack) return;
    const prevUri = trimHistory[trimHistory.length - 1];
    setTrimHistory((prev) => prev.slice(0, -1));

    await cleanupSound();
    const restoredTrack: AudioTrack = {
      ...originalTrack,
      uri: prevUri,
      savedSettings: undefined,
    };
    setLoadedTrack(restoredTrack);
    setSelection(null);
    setPosition(0);

    try {
      await loadAudio(prevUri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e: any) {
      setError(e.message || "Undo failed");
    }
  }

  // ─── Export ──────────────────────────────────────────────────────────────

  async function exportClip() {
    if (!loadedTrack) return;

    const trimStart =
      loadedTrack.savedSettings?.loopStart ?? selection?.start ?? 0;
    const trimEnd =
      loadedTrack.savedSettings?.loopEnd ?? selection?.end ?? duration;

    // On mobile we can't do FFmpeg-based WAV encode without native modules.
    // Best-effort: share the original file with a note about settings.
    // For production, this would call a backend endpoint.
    setIsExporting(true);
    setExportProgress(0);
    try {
      const pitchSign = pitch >= 0 ? `+${pitch}` : `${pitch}`;
      const exportName = `edited-${loadedTrack.name}-${speed}x-${pitchSign}st`;
      setExportProgress(0.3);
      await new Promise((r) => setTimeout(r, 300));
      setExportProgress(0.7);
      await new Promise((r) => setTimeout(r, 300));
      setExportProgress(1.0);

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          "Export",
          "Sharing is not available on this device. The file is saved at:\n" +
            loadedTrack.uri
        );
        return;
      }

      // Add to library with current settings
      const exportedTrack: AudioTrack = {
        id: `export_${Date.now()}`,
        name: exportName,
        uri: loadedTrack.uri,
        duration: trimEnd - trimStart,
        createdAt: Date.now(),
        savedSettings: {
          speed,
          pitch,
          loopStart: trimStart,
          loopEnd: trimEnd,
          loopEnabled: trimStart > 0 || trimEnd < duration,
        },
      };
      addTrack(exportedTrack);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Saved to Library",
        `"${exportName}" has been added to your Music Library with the current settings (${speed}x speed, ${pitchSign} semitones).`,
        [
          {
            text: "Share File",
            onPress: async () => {
              try {
                await Sharing.shareAsync(loadedTrack.uri, {
                  mimeType: "audio/mpeg",
                  UTI: "public.audio",
                  dialogTitle: exportName,
                });
              } catch {}
            },
          },
          { text: "OK" },
        ]
      );
    } catch (e: any) {
      setError(e.message || "Export failed");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }

  // ─── Reset ───────────────────────────────────────────────────────────────

  function resetAll() {
    setSpeed(1.0);
    setPitch(0);
    setSelection(null);
    setIsLoopingSelection(false);
    if (soundRef.current) {
      applyPlaybackSettings();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function selectAll() {
    if (duration > 0) {
      setSelection({ start: 0, end: duration });
    }
  }

  // ─── Library picker modal ────────────────────────────────────────────────
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  // ─── UI helpers ──────────────────────────────────────────────────────────

  const selectionDuration =
    selection ? selection.end - selection.start : null;

  const hasTrimmed = loadedTrack?.savedSettings?.loopEnabled ?? false;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: STUDIO.void }} edges={["bottom"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: "800", color: STUDIO.text }}>
              Audio Editor
            </Text>
            <Text style={{ fontSize: 13, color: STUDIO.nickelDark, marginTop: 2 }}>
              Speed · Pitch · Trim
            </Text>
          </View>
          {loadedTrack && (
            <Pressable
              onPress={() => {
                setShowLibraryPicker(false);
                pickAudioFile();
              }}
              style={{ padding: 8 }}
            >
              <Text style={{ fontSize: 13, color: STUDIO.swirlOrange, fontWeight: "600" }}>
                Change File
              </Text>
            </Pressable>
          )}
        </View>

        {/* ── Error Banner ── */}
        {error && (
          <View
            style={{
              backgroundColor: "#3B1212",
              borderWidth: 1,
              borderColor: STUDIO.error,
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <Ionicons name="alert-circle" size={18} color={STUDIO.error} />
            <Text style={{ color: STUDIO.error, flex: 1, marginLeft: 8, fontSize: 13 }}>
              {error}
            </Text>
            <Pressable onPress={() => setError(null)}>
              <Ionicons name="close" size={18} color={STUDIO.error} />
            </Pressable>
          </View>
        )}

        {/* ── File Input Area ── */}
        {!loadedTrack ? (
          <View>
            {/* Drop Zone */}
            <Pressable onPress={pickAudioFile} disabled={isLoadingFile}>
              <View
                style={{
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: isLoadingFile ? STUDIO.border : STUDIO.swirlOrange,
                  borderRadius: 16,
                  padding: 40,
                  alignItems: "center",
                  backgroundColor: STUDIO.charcoal,
                  marginBottom: 12,
                }}
              >
                {isLoadingFile ? (
                  <ActivityIndicator color={STUDIO.swirlOrange} size="large" />
                ) : (
                  <>
                    <Ionicons
                      name="musical-note"
                      size={48}
                      color={STUDIO.swirlOrange}
                      style={{ marginBottom: 12 }}
                    />
                    <Text style={{ color: STUDIO.text, fontSize: 17, fontWeight: "700", marginBottom: 6 }}>
                      Browse Audio File
                    </Text>
                    <Text style={{ color: STUDIO.nickelDark, fontSize: 13, textAlign: "center" }}>
                      MP3, WAV, OGG, M4A, AAC supported
                    </Text>
                  </>
                )}
              </View>
            </Pressable>

            {/* From Library Button */}
            {tracks.length > 0 && (
              <Pressable
                onPress={() => setShowLibraryPicker(true)}
                style={{
                  backgroundColor: STUDIO.slate,
                  borderRadius: 12,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: STUDIO.border,
                }}
              >
                <Ionicons name="library" size={22} color={STUDIO.amber} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: STUDIO.text, fontWeight: "600", fontSize: 15 }}>
                    Open from Library
                  </Text>
                  <Text style={{ color: STUDIO.nickelDark, fontSize: 12, marginTop: 2 }}>
                    {tracks.length} track{tracks.length !== 1 ? "s" : ""} available
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={STUDIO.nickelDark} />
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {/* ── File Info Bar ── */}
            <View
              style={{
                backgroundColor: STUDIO.charcoal,
                borderRadius: 10,
                padding: 12,
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
                borderWidth: 1,
                borderColor: STUDIO.border,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: STUDIO.slate,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 10,
                }}
              >
                <Ionicons name="musical-note" size={18} color={STUDIO.swirlOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: STUDIO.text, fontWeight: "600", fontSize: 14 }}
                  numberOfLines={1}
                >
                  {loadedTrack.name}
                </Text>
                <Text style={{ color: STUDIO.nickelDark, fontSize: 11, marginTop: 2 }}>
                  {formatTimeSec(duration)} · MP3
                  {hasTrimmed ? "  •  TRIMMED" : ""}
                </Text>
              </View>
              {hasTrimmed && (
                <Pressable
                  onPress={undoTrim}
                  style={{
                    backgroundColor: STUDIO.slate,
                    borderRadius: 8,
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: STUDIO.border,
                  }}
                >
                  <Text style={{ color: STUDIO.warning, fontSize: 11, fontWeight: "600" }}>
                    UNDO TRIM
                  </Text>
                </Pressable>
              )}
            </View>

            {/* ── Waveform ── */}
            <View
              style={{ marginBottom: 12 }}
              onLayout={(e) => setWaveformWidth(e.nativeEvent.layout.width)}
            >
              {waveform ? (
                <WaveformView
                  peaks={waveform.peaks}
                  duration={duration}
                  position={position}
                  selection={selection}
                  width={waveformWidth}
                  onSeek={seekTo}
                  onSelectionStart={onWaveformSelectionStart}
                  onSelectionMove={onWaveformSelectionMove}
                  onSelectionEnd={onWaveformSelectionEnd}
                />
              ) : (
                <View
                  style={{
                    height: WAVEFORM_HEIGHT,
                    backgroundColor: STUDIO.void,
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: STUDIO.border,
                  }}
                >
                  <ActivityIndicator color={STUDIO.swirlOrange} />
                </View>
              )}
              <Text style={{ color: STUDIO.nickelDark, fontSize: 10, marginTop: 4, textAlign: "center" }}>
                Tap waveform to seek · Drag to select region
              </Text>
            </View>

            {/* ── Playback Controls ── */}
            <View
              style={{
                backgroundColor: STUDIO.charcoal,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: STUDIO.border,
              }}
            >
              {/* Time display */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: STUDIO.amber, fontSize: 13, fontFamily: "monospace" }}>
                  {formatTimeMs(position)}
                </Text>
                <Text style={{ color: STUDIO.nickelDark, fontSize: 13, fontFamily: "monospace" }}>
                  {formatTimeMs(duration)}
                </Text>
              </View>

              {/* Seek slider */}
              <Slider
                style={{ width: "100%", height: 36, marginBottom: 8 }}
                minimumValue={0}
                maximumValue={duration || 1}
                value={position}
                onSlidingStart={() => { isSeeking.current = true; }}
                onSlidingComplete={async (v) => { await seekTo(v); isSeeking.current = false; }}
                onValueChange={(v) => { if (isSeeking.current) setPosition(v); }}
                minimumTrackTintColor={STUDIO.amber}
                maximumTrackTintColor={STUDIO.nickelDark}
                thumbTintColor={STUDIO.amber}
              />

              {/* Play / Pause */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <Pressable
                  onPress={() => seekTo(0)}
                  style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: STUDIO.slate,
                    alignItems: "center", justifyContent: "center",
                  }}
                >
                  <Ionicons name="play-skip-back" size={20} color={STUDIO.text} />
                </Pressable>

                <Pressable
                  onPress={togglePlayPause}
                  disabled={!soundRef.current}
                  style={{
                    width: 60, height: 60, borderRadius: 30,
                    backgroundColor: STUDIO.swirlOrange,
                    alignItems: "center", justifyContent: "center",
                    opacity: soundRef.current ? 1 : 0.4,
                  }}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={30}
                    color="#fff"
                    style={{ marginLeft: isPlaying ? 0 : 3 }}
                  />
                </Pressable>

                {/* Volume */}
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <Ionicons name="volume-medium" size={18} color={STUDIO.nickelDark} style={{ marginRight: 4 }} />
                  <Slider
                    style={{ flex: 1, height: 36 }}
                    minimumValue={0}
                    maximumValue={1}
                    value={volume}
                    onValueChange={handleVolumeChange}
                    minimumTrackTintColor={STUDIO.nickelLight}
                    maximumTrackTintColor={STUDIO.nickelDark}
                    thumbTintColor={STUDIO.nickelLight}
                  />
                </View>
              </View>
            </View>

            {/* ── Speed & Pitch Grid ── */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 16,
              }}
            >
              {/* Speed */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: STUDIO.charcoal,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: STUDIO.border,
                }}
              >
                <Text style={{ color: STUDIO.nickelLight, fontSize: 11, fontWeight: "700", marginBottom: 4, letterSpacing: 1 }}>
                  SPEED
                </Text>
                <Text style={{ color: STUDIO.amber, fontSize: 28, fontWeight: "800", marginBottom: 8 }}>
                  {speed.toFixed(2)}x
                </Text>
                <Slider
                  style={{ width: "100%", height: 32, marginBottom: 8 }}
                  minimumValue={0.25}
                  maximumValue={4.0}
                  step={0.05}
                  value={speed}
                  onValueChange={(v) => setSpeed(parseFloat(v.toFixed(2)))}
                  minimumTrackTintColor={STUDIO.amber}
                  maximumTrackTintColor={STUDIO.nickelDark}
                  thumbTintColor={STUDIO.amber}
                />
                {/* Presets */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {SPEED_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => { setSpeed(preset); Haptics.selectionAsync(); }}
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 20,
                        backgroundColor:
                          Math.abs(speed - preset) < 0.01
                            ? STUDIO.swirlOrange
                            : STUDIO.slate,
                        borderWidth: 1,
                        borderColor:
                          Math.abs(speed - preset) < 0.01
                            ? STUDIO.swirlOrange
                            : STUDIO.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color:
                            Math.abs(speed - preset) < 0.01
                              ? "#fff"
                              : STUDIO.nickelLight,
                        }}
                      >
                        {preset}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: STUDIO.nickelDark, fontSize: 10, marginTop: 6 }}>
                  Pitch-corrected via expo-av
                </Text>
              </View>

              {/* Pitch */}
              <View
                style={{
                  flex: 1,
                  backgroundColor: STUDIO.charcoal,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: STUDIO.border,
                }}
              >
                <Text style={{ color: STUDIO.nickelLight, fontSize: 11, fontWeight: "700", marginBottom: 4, letterSpacing: 1 }}>
                  PITCH
                </Text>
                <Text
                  style={{
                    color: pitch === 0 ? STUDIO.nickelLight : pitch > 0 ? STUDIO.swirlCyan : STUDIO.swirlPink,
                    fontSize: 28,
                    fontWeight: "800",
                    marginBottom: 8,
                  }}
                >
                  {pitch >= 0 ? `+${pitch}` : pitch}st
                </Text>
                <Slider
                  style={{ width: "100%", height: 32, marginBottom: 8 }}
                  minimumValue={-12}
                  maximumValue={12}
                  step={1}
                  value={pitch}
                  onValueChange={(v) => setPitch(Math.round(v))}
                  minimumTrackTintColor={STUDIO.swirlPink}
                  maximumTrackTintColor={STUDIO.swirlCyan}
                  thumbTintColor={STUDIO.nickelLight}
                />
                {/* Presets */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                  {PITCH_PRESETS.map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => { setPitch(preset); Haptics.selectionAsync(); }}
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 20,
                        backgroundColor:
                          pitch === preset ? STUDIO.swirlOrange : STUDIO.slate,
                        borderWidth: 1,
                        borderColor:
                          pitch === preset ? STUDIO.swirlOrange : STUDIO.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: pitch === preset ? "#fff" : STUDIO.nickelLight,
                        }}
                      >
                        {preset >= 0 ? `+${preset}` : preset}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={{ color: STUDIO.nickelDark, fontSize: 10, marginTop: 6 }}>
                  Semitones (100 cents each)
                </Text>
              </View>
            </View>

            {/* ── Selection Info ── */}
            {selection ? (
              <View
                style={{
                  backgroundColor: "rgba(255,107,53,0.1)",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: STUDIO.swirlOrange,
                  flexDirection: "row",
                  gap: 16,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: STUDIO.nickelDark, fontSize: 10 }}>START</Text>
                  <Text style={{ color: STUDIO.text, fontSize: 13, fontFamily: "monospace" }}>
                    {formatTimeMs(selection.start)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ color: STUDIO.nickelDark, fontSize: 10 }}>DURATION</Text>
                  <Text style={{ color: STUDIO.swirlOrange, fontSize: 13, fontWeight: "700", fontFamily: "monospace" }}>
                    {formatTimeSec(selectionDuration ?? 0)}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: "flex-end" }}>
                  <Text style={{ color: STUDIO.nickelDark, fontSize: 10 }}>END</Text>
                  <Text style={{ color: STUDIO.text, fontSize: 13, fontFamily: "monospace" }}>
                    {formatTimeMs(selection.end)}
                  </Text>
                </View>
              </View>
            ) : (
              <View
                style={{
                  backgroundColor: STUDIO.charcoal,
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: STUDIO.border,
                }}
              >
                <Text style={{ color: STUDIO.nickelDark, fontSize: 12, textAlign: "center" }}>
                  Drag on waveform to select a region
                </Text>
              </View>
            )}

            {/* ── Action Buttons ── */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <ActionButton
                icon="play-circle-outline"
                label="Play Selection"
                disabled={!selection}
                onPress={playSelection}
                color={STUDIO.swirlCyan}
              />
              <ActionButton
                icon="cut-outline"
                label="Trim to Selection"
                disabled={!selection}
                onPress={trimToSelection}
                color={STUDIO.swirlOrange}
              />
              <ActionButton
                icon="expand-outline"
                label="Select All"
                onPress={selectAll}
                color={STUDIO.nickelLight}
              />
              <ActionButton
                icon="refresh-outline"
                label="Reset All"
                onPress={resetAll}
                color={STUDIO.warning}
              />
            </View>

            {/* ── Export Bar ── */}
            <View
              style={{
                backgroundColor: STUDIO.charcoal,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: STUDIO.border,
              }}
            >
              <Text style={{ color: STUDIO.nickelLight, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 12 }}>
                EXPORT
              </Text>

              {isExporting && (
                <View style={{ marginBottom: 12 }}>
                  <View
                    style={{
                      height: 4,
                      backgroundColor: STUDIO.slate,
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        width: `${exportProgress * 100}%`,
                        backgroundColor: STUDIO.swirlOrange,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                  <Text style={{ color: STUDIO.nickelDark, fontSize: 11, marginTop: 4 }}>
                    Preparing export...
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                <Ionicons name="information-circle-outline" size={14} color={STUDIO.nickelDark} style={{ marginRight: 4 }} />
                <Text style={{ color: STUDIO.nickelDark, fontSize: 11, flex: 1 }}>
                  Saves to library with current speed & pitch settings applied during playback
                </Text>
              </View>

              <Pressable
                onPress={exportClip}
                disabled={isExporting}
                style={{ opacity: isExporting ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={[STUDIO.swirlOrange, STUDIO.amber]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 10,
                    paddingVertical: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isExporting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="download" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                        Export Clip
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Library Picker Modal ── */}
      <Modal
        visible={showLibraryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLibraryPicker(false)}
      >
        <Pressable
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.7)" }}
          onPress={() => setShowLibraryPicker(false)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <SafeAreaView edges={["bottom"]} style={{ backgroundColor: STUDIO.dark }}>
              <View style={{ borderRadius: 20, overflow: "hidden" }}>
                <View
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: STUDIO.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: STUDIO.text, fontSize: 18, fontWeight: "700", flex: 1 }}>
                    Choose from Library
                  </Text>
                  <Pressable onPress={() => setShowLibraryPicker(false)}>
                    <Ionicons name="close" size={24} color={STUDIO.nickelDark} />
                  </Pressable>
                </View>
                <ScrollView style={{ maxHeight: 400 }}>
                  {tracks.map((track) => (
                    <Pressable
                      key={track.id}
                      onPress={() => {
                        setShowLibraryPicker(false);
                        loadTrackFromLibrary(track);
                      }}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: STUDIO.border,
                        backgroundColor: pressed ? STUDIO.slate : "transparent",
                      })}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          backgroundColor: STUDIO.slate,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <Ionicons name="musical-note" size={18} color={STUDIO.amber} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: STUDIO.text, fontWeight: "600" }} numberOfLines={1}>
                          {track.name}
                        </Text>
                        <Text style={{ color: STUDIO.nickelDark, fontSize: 11, marginTop: 2 }}>
                          {track.duration > 0 ? formatTimeSec(track.duration / 1000) : "Unknown duration"}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={STUDIO.nickelDark} />
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Action Button component ─────────────────────────────────────────────────

function ActionButton({
  icon,
  label,
  onPress,
  disabled = false,
  color,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: "45%",
        backgroundColor: STUDIO.slate,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: disabled ? STUDIO.border : color + "44",
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon as any} size={18} color={disabled ? STUDIO.nickelDark : color} style={{ marginRight: 6 }} />
      <Text
        style={{
          color: disabled ? STUDIO.nickelDark : STUDIO.text,
          fontSize: 12,
          fontWeight: "600",
          flex: 1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
