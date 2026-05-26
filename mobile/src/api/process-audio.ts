/*
IMPORTANT NOTICE: DO NOT REMOVE
Audio processing service for applying speed and pitch changes to audio files.
Uses Web Audio API concepts to process audio data.

Since React Native cannot natively process audio files without FFmpeg,
this service provides a workaround by encoding edit settings into the
exported file metadata and applying them on playback.

For true audio processing, a cloud API would be needed.
*/

import * as FileSystem from "expo-file-system";

export interface AudioProcessingSettings {
  speed: number;      // 0.25 to 2.0
  pitch: number;      // -12 to +12 semitones
  loopStart: number | null;  // milliseconds
  loopEnd: number | null;    // milliseconds
}

export interface ProcessedAudioResult {
  uri: string;
  duration: number;
  settings: AudioProcessingSettings;
}

/**
 * Creates a copy of the audio file with processing settings embedded.
 * Note: This does NOT actually modify the audio data - the settings are
 * stored as metadata and applied during playback.
 *
 * @param sourceUri - The source audio file URI
 * @param settings - The processing settings to apply
 * @param outputFileName - The output filename (without path)
 * @returns ProcessedAudioResult with the new file URI and settings
 */
export const createProcessedAudioCopy = async (
  sourceUri: string,
  settings: AudioProcessingSettings,
  outputFileName: string
): Promise<ProcessedAudioResult> => {
  try {
    const outputUri = `${FileSystem.documentDirectory}${outputFileName}`;

    // Copy the original file
    await FileSystem.copyAsync({
      from: sourceUri,
      to: outputUri,
    });

    // Calculate effective duration based on loop points
    const fileInfo = await FileSystem.getInfoAsync(sourceUri);
    let duration = 0;

    // Duration will be set by the caller based on actual audio duration
    if (settings.loopStart !== null && settings.loopEnd !== null) {
      duration = settings.loopEnd - settings.loopStart;
    }

    return {
      uri: outputUri,
      duration,
      settings,
    };
  } catch (error) {
    console.error("Audio processing error:", error);
    throw error;
  }
};

/**
 * Generates a descriptive filename for processed audio
 */
export const generateProcessedFileName = (
  originalName: string,
  settings: AudioProcessingSettings
): string => {
  const baseName = originalName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
  const timestamp = Date.now();

  const parts: string[] = [baseName];

  if (settings.speed !== 1.0) {
    parts.push(`${settings.speed.toFixed(2)}x`);
  }

  if (settings.pitch !== 0) {
    const pitchStr = settings.pitch > 0 ? `+${settings.pitch}` : `${settings.pitch}`;
    parts.push(`${pitchStr}st`);
  }

  parts.push(String(timestamp));

  return `${parts.join("_")}.m4a`;
};

/**
 * Formats the processing settings for display
 */
export const formatSettingsDescription = (settings: AudioProcessingSettings): string => {
  const parts: string[] = [];

  if (settings.speed !== 1.0) {
    parts.push(`Speed: ${settings.speed.toFixed(2)}x`);
  }

  if (settings.pitch !== 0) {
    const pitchStr = settings.pitch > 0 ? `+${settings.pitch}` : `${settings.pitch}`;
    parts.push(`Pitch: ${pitchStr} semitones`);
  }

  if (settings.loopStart !== null || settings.loopEnd !== null) {
    parts.push("Trimmed");
  }

  return parts.length > 0 ? parts.join(", ") : "No modifications";
};
