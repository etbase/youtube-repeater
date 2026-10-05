const API_SRC = 'https://www.youtube.com/iframe_api';

let apiPromise = null;

function failPromise(error) {
  apiPromise = null;
  return Promise.reject(error);
}

export function loadYouTubeIframeAPI() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube IFrame API 需要在瀏覽器中載入。'));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  const promise = new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('YouTube 播放器載入逾時，請檢查網路後再試。'));
    }, 20000);

    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeoutId);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube 播放器無法使用。'));
    };

    const existing = document.querySelector('script[data-youtube-iframe-api]');
    if (existing) return;

    const script = document.createElement('script');
    script.src = API_SRC;
    script.async = true;
    script.dataset.youtubeIframeApi = 'true';
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      reject(new Error('無法載入 YouTube 播放器，請檢查網路連線。'));
    };
    document.head.appendChild(script);
  });

  apiPromise = promise.catch((error) => failPromise(error));
  return apiPromise;
}
