const MIN_CUE_SECONDS = 0.4;

export function parseTranscript(raw) {
  let data;
  try {
    data = JSON.parse(String(raw ?? '').trim());
  } catch {
    throw new Error('這不是有效的 JSON。');
  }

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('請貼上一個字幕陣列，每一句要有 start、end、text。');
  }

  return data.map((item, index) => {
    const start = Number(item?.start);
    const end = Number(item?.end);
    const text = typeof item?.text === 'string' ? item.text.trim() : '';
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
      throw new Error(`第 ${index + 1} 句的時間不正確。`);
    }
    if (end - start < MIN_CUE_SECONDS) {
      throw new Error(`第 ${index + 1} 句至少需要 ${MIN_CUE_SECONDS} 秒。`);
    }
    if (!text) {
      throw new Error(`第 ${index + 1} 句沒有文字。`);
    }
    return {
      id: `cue-${index}-${start}`,
      start,
      end,
      text,
    };
  });
}
