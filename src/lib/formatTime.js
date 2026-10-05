export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00.0';

  const totalTenths = Math.floor(seconds * 10 + 1e-6);
  const tenths = totalTenths % 10;
  const totalSeconds = Math.floor(totalTenths / 10);
  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const secText = `${String(secs).padStart(2, '0')}.${tenths}`;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${secText}`;
  }
  return `${mins}:${secText}`;
}

export function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

  const total = Math.floor(seconds + 1e-6);
  const secs = total % 60;
  const mins = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const clock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

export function formatRate(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value)) return '1×';
  const text = Number.isInteger(value) ? String(value) : String(value);
  return `${text}×`;
}
