function floatTo16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return pcm;
}

export async function audioBufferToMp3(audioBuffer) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const sampleRate = audioBuffer.sampleRate;
  const channels = audioBuffer.numberOfChannels > 1 ? 2 : 1;
  const encoder = new Mp3Encoder(channels, sampleRate, 128);
  const left = floatTo16(audioBuffer.getChannelData(0));
  const right = channels === 2 ? floatTo16(audioBuffer.getChannelData(1)) : null;
  const blockSize = 1152;
  const parts = [];

  for (let offset = 0; offset < left.length; offset += blockSize) {
    const leftBlock = left.subarray(offset, offset + blockSize);
    const mp3 = right
      ? encoder.encodeBuffer(leftBlock, right.subarray(offset, offset + blockSize))
      : encoder.encodeBuffer(leftBlock);
    if (mp3.length > 0) parts.push(mp3);
  }

  const end = encoder.flush();
  if (end.length > 0) parts.push(end);
  return new Blob(parts, { type: 'audio/mpeg' });
}

export function buildPeaks(audioBuffer, bars = 96) {
  const channel = audioBuffer.getChannelData(0);
  const size = Math.max(1, Math.floor(channel.length / bars));
  const peaks = [];
  for (let bar = 0; bar < bars; bar += 1) {
    let peak = 0;
    const start = bar * size;
    const end = Math.min(channel.length, start + size);
    for (let index = start; index < end; index += 1) {
      peak = Math.max(peak, Math.abs(channel[index]));
    }
    peaks.push(peak);
  }
  const loudest = Math.max(...peaks, 0.01);
  return peaks.map((peak) => peak / loudest);
}
