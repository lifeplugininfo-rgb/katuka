// PCM 16-bit Little-Endian Audio Utilities for Gemini Live API

export function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return output.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Convert 24kHz 16-bit PCM buffer into AudioBuffer for Web Audio API playback
export function pcmToAudioBuffer(
  pcmBuffer: ArrayBuffer,
  audioContext: AudioContext,
  sampleRate = 24000
): AudioBuffer {
  const dataView = new DataView(pcmBuffer);
  const numSamples = Math.floor(pcmBuffer.byteLength / 2);
  const audioBuffer = audioContext.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const sample = dataView.getInt16(i * 2, true);
    channelData[i] = sample / 32768.0;
  }

  return audioBuffer;
}
