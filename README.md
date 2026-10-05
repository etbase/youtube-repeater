# YouTube Language Repeater

用 YouTube 影片練習語言跟讀、復讀與 Shadowing。第一版是純前端應用，影片透過 YouTube IFrame Player API 播放，不會下載或另外儲存。

## 開發

```bash
npm install
npm run dev
```

開啟終端機顯示的本機網址，貼上 YouTube 影片連結即可練習。

```bash
npm test
npm run build
```

## 第一版功能

- 解析 YouTube 網址並載入影片
- 播放、暫停、前進與後退 5 秒
- 播放速度：0.5×、0.75×、0.85×、1×、1.25×
- A–B 循環，以及 1、3、5、10、無限次
- 一句一停：播完 A–B 後暫停，等待 1–5 秒再重播

字幕、錄音、波形、音高與會員功能尚未加入。相關介面預留在 `src/features/`，之後可以各加一個資料夾，不必改動播放器核心。

## GitHub Pages

正式部署時把站點路徑傳給建置：

```bash
VITE_PAGES_BASE=/youtube-repeater/ npm run build
```

若使用 `username.github.io` 這類根網域，維持預設的 `/` 即可。
