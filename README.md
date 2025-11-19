# Video Play Tracker

A Chrome extension that tracks video playback positions across websites.

## Features

- 🎯 **Manual Tracking Activation** - Click "Start Tracking" to track videos on any page
- ⏱️ **Automatic Position Saving** - Saves playback time every ~1 second while playing
- 📍 **Resume Where You Left Off** - Returns to exact playback position when revisiting
- 🔄 **Multi-Tab Support** - Tracks multiple videos simultaneously across different tabs
- 💾 **Persistent Storage** - Keeps history of last 100 tracked videos
- 🎬 **Background Playback** - Continues tracking even when tab is in background
- ❌ **Easy Management** - Remove individual entries or clear all history

## Installation

1. Clone this repository or download the files
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension folder
6. The extension icon will appear in your toolbar

## Usage

1. **Start Tracking**: Navigate to a video page and click the extension icon, then click "Start Tracking"
2. **Watch Videos**: The extension automatically saves your playback position
3. **View History**: Click the extension icon to see all tracked videos with their timestamps
4. **Resume Playback**: Click "Open Video →" to return to any saved position
5. **Remove Entries**: Click the × button to stop tracking and remove a video
6. **Clear All**: Click "Clear History" to remove all tracked videos

## How It Works

- Detects HTML5 `<video>` elements on web pages
- Tracks playback time via `timeupdate`, `pause`, and `seeked` events
- Saves position immediately when:
  - Video is paused
  - User seeks to different time
  - Tab is closed or switched
  - Page is navigated away
- Stores data locally using Chrome's storage API
- Each URL maintains its own independent playback record

## Privacy

- All data is stored locally on your device
- No data is sent to external servers
- No tracking or analytics
- Open source code for full transparency

## License

MIT License - Feel free to use and modify as needed!
