// Audio Processing Utilities
// Uses Web Audio API for processing, Tauri for file system access

import { invoke } from '@tauri-apps/api/core';

/**
 * Check if running in Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Cut audio segment using Web Audio API
 * Returns the cut audio as a Blob
 */
export async function cutAudioSegment(
  audioData: ArrayBuffer,
  startTime: number,
  endTime: number
): Promise<Blob> {
  const audioContext = new AudioContext();
  
  const audioBuffer = await audioContext.decodeAudioData(audioData.slice(0));
  
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(startTime * sampleRate);
  const endSample = Math.floor(endTime * sampleRate);
  const segmentLength = endSample - startSample;
  
  const segmentBuffer = audioContext.createBuffer(
    audioBuffer.numberOfChannels,
    segmentLength,
    sampleRate
  );
  
  for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
    const sourceData = audioBuffer.getChannelData(channel);
    const targetData = segmentBuffer.getChannelData(channel);
    for (let i = 0; i < segmentLength; i++) {
      targetData[i] = sourceData[startSample + i];
    }
  }
  
  const wavBlob = audioBufferToWav(segmentBuffer);
  
  await audioContext.close();
  
  return wavBlob;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  const offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + (i * numChannels + channel) * bytesPerSample, intSample, true);
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}


/**
 * Save file using Tauri's Rust backend
 */
export async function saveFileToPath(data: Uint8Array, filePath: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('שמירה לנתיב זמינה רק באפליקציה');
  }
  
  await invoke('write_file', {
    path: filePath,
    data: Array.from(data)
  });
}

/**
 * Save file - either to original path or trigger download
 */
export async function saveFile(blob: Blob, fileName: string, originalPath?: string): Promise<void> {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  if (isTauri() && originalPath) {
    // Save to original file path
    await saveFileToPath(data, originalPath);
    return;
  }
  
  // Browser fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Create ringtone from audio data
 */
export async function createRingtone(
  audioData: ArrayBuffer,
  startTime: number,
  endTime: number,
  fileName: string
): Promise<void> {
  const ringtoneBlob = await cutAudioSegment(audioData, startTime, endTime);
  await saveFile(ringtoneBlob, fileName);
}

/**
 * Write ID3 tags to MP3 file and return new file with tags
 */
export async function writeId3Tags(
  audioData: ArrayBuffer,
  tags: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
    year?: string;
    comment?: string;
  }
): Promise<Blob> {
  const module = await import('browser-id3-writer');
  // Handle different export formats
  const ID3Writer = module.default || module.ID3Writer || module;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const WriterClass = typeof ID3Writer === 'function' ? ID3Writer : (ID3Writer as any).default;
  const writer = new WriterClass(audioData);
  
  if (tags.title) writer.setFrame('TIT2', tags.title);
  if (tags.artist) writer.setFrame('TPE1', [tags.artist]);
  if (tags.album) writer.setFrame('TALB', tags.album);
  if (tags.genre) writer.setFrame('TCON', [tags.genre]);
  if (tags.year) writer.setFrame('TYER', tags.year);
  if (tags.comment) writer.setFrame('COMM', { description: '', text: tags.comment, language: 'heb' });
  
  writer.addTag();
  
  return writer.getBlob();
}

/**
 * Update MP3 file with new ID3 tags and save to original path
 */
export async function updateAndSaveWithTags(
  audioData: ArrayBuffer,
  tags: {
    title?: string;
    artist?: string;
    album?: string;
    genre?: string;
  },
  fileName: string,
  originalPath?: string
): Promise<void> {
  const taggedBlob = await writeId3Tags(audioData, tags);
  await saveFile(taggedBlob, fileName, originalPath);
}
