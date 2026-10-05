import { useEffect, useRef, useState } from 'react';
import { audioBufferToMp3, buildPeaks } from './encodeMp3.js';

function preferredMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function decodeBlob(blob) {
  const context = new AudioContext();
  try {
    const bytes = await blob.arrayBuffer();
    return await context.decodeAudioData(bytes.slice(0));
  } finally {
    await context.close();
  }
}

export function useSentenceRecorder(sentenceId) {
  const [recording, setRecording] = useState(false);
  const [takes, setTakes] = useState({});
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioRef = useRef(null);

  const take = sentenceId ? takes[sentenceId] ?? null : null;

  useEffect(() => () => {
    audioRef.current?.pause();
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function start() {
    if (!sentenceId || recording) return;
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('這個瀏覽器不能錄音。');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      const recordedFor = sentenceId;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        stopStream();
        setRecording(false);
        try {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          const buffer = await decodeBlob(blob);
          const url = URL.createObjectURL(blob);
          setTakes((current) => {
            const previous = current[recordedFor];
            if (previous?.url) URL.revokeObjectURL(previous.url);
            return {
              ...current,
              [recordedFor]: {
                url,
                buffer,
                peaks: buildPeaks(buffer),
                duration: buffer.duration,
              },
            };
          });
        } catch {
          setError('錄音已停下，但無法讀取音訊。');
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      stopStream();
      setRecording(false);
      setError('無法使用麥克風。請允許瀏覽器錄音。');
    }
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  }

  function play() {
    if (!take?.url) return;
    audioRef.current?.pause();
    const audio = new Audio(take.url);
    audioRef.current = audio;
    audio.onended = () => setPlaying(false);
    audio.onerror = () => setPlaying(false);
    setPlaying(true);
    audio.play().catch(() => setPlaying(false));
  }

  async function download() {
    if (!take?.buffer) return;
    const mp3 = await audioBufferToMp3(take.buffer);
    const url = URL.createObjectURL(mp3);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shadowing.mp3';
    link.click();
    URL.revokeObjectURL(url);
  }

  return {
    recording,
    playing,
    error,
    take,
    start,
    stop,
    play,
    rerecord: start,
    download,
  };
}
