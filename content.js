// Video Play Tracker - Content Script
// Tracks video playback with manual user activation

(function () {
    'use strict';

    const trackedVideos = new Set();
    let saveTimeout = null;
    let isTrackingEnabled = false;

    // Check if tracking is enabled for this URL
    function checkTrackingStatus() {
        // If we're in an iframe, try to use the parent's URL (via referrer)
        // Otherwise use current URL
        let currentURL = window.location.href;
        if (window.self !== window.top && document.referrer) {
            currentURL = document.referrer;
        }

        chrome.storage.local.get(['trackedURLs', 'videoHistory'], function (result) {
            const trackedURLs = result.trackedURLs || [];
            const videoHistory = result.videoHistory || [];

            // Enable tracking if exact URL is in trackedURLs OR if it has a history entry
            const inTrackedList = trackedURLs.includes(currentURL);
            const hasHistoryEntry = videoHistory.some(item => item.url === currentURL);

            isTrackingEnabled = inTrackedList || hasHistoryEntry;
            console.log('Tracking status for', currentURL, ':', isTrackingEnabled);
        });
    }

    // Initialize tracking status
    checkTrackingStatus();

    // Format time in seconds to HH:MM:SS or MM:SS
    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Save video playback data
    function saveVideoData(video) {
        if (!isTrackingEnabled || !video || video.duration === 0 || isNaN(video.currentTime)) {
            return;
        }

        // Don't save if video has barely started (prevents overwriting existing records)
        if (video.currentTime < 2) {
            return;
        }

        // If we're in an iframe, use the parent's URL (via referrer)
        let url = window.location.href;
        let title = document.title;

        if (window.self !== window.top && document.referrer) {
            url = document.referrer;
            // When in iframe, use hostname from parent URL instead of iframe title
            try {
                title = new URL(url).hostname;
            } catch (e) {
                title = 'Video';
            }
        }

        const data = {
            url: url,
            title: title || window.location.hostname,
            currentTime: Math.floor(video.currentTime),
            duration: Math.floor(video.duration),
            formattedTime: formatTime(video.currentTime),
            timestamp: Date.now(),
            hostname: new URL(url).hostname
        };

        chrome.storage.local.get(['videoHistory'], function (result) {
            const history = result.videoHistory || [];

            // Find existing entry for this URL
            const existingIndex = history.findIndex(item => item.url === data.url);

            if (existingIndex >= 0) {
                // Update existing entry but preserve the original title
                const existingTitle = history[existingIndex].title;
                history[existingIndex] = {
                    ...data,
                    title: existingTitle || data.title  // Keep original title
                };
            } else {
                // Add new entry
                history.unshift(data);
            }

            // Keep only last 100 entries
            const trimmedHistory = history.slice(0, 100);

            chrome.storage.local.set({ videoHistory: trimmedHistory }, function () {
                console.log('Video playback saved:', data);
            });
        });
    }

    // Debounced save function
    function debouncedSave(video) {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => saveVideoData(video), 1000);
    }

    // Track a video element
    function trackVideo(video) {
        if (trackedVideos.has(video)) {
            return;
        }

        trackedVideos.add(video);
        console.log('Monitoring video:', video);

        // Save on time update (debounced) - only if tracking is enabled
        video.addEventListener('timeupdate', function () {
            if (video.currentTime > 0 && isTrackingEnabled) {
                debouncedSave(video);
            }
        });

        // Save on pause
        video.addEventListener('pause', function () {
            if (isTrackingEnabled) {
                saveVideoData(video);
            }
        });

        // Save on seeking
        video.addEventListener('seeked', function () {
            if (isTrackingEnabled) {
                saveVideoData(video);
            }
        });
    }

    // Find and monitor all video elements
    function findVideos() {
        const videos = document.querySelectorAll('video');
        videos.forEach(trackVideo);
    }

    // Observe DOM for dynamically added videos
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (node.tagName === 'VIDEO') {
                    trackVideo(node);
                } else if (node.querySelectorAll) {
                    const videos = node.querySelectorAll('video');
                    videos.forEach(trackVideo);
                }
            });
        });
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Initial scan
    findVideos();

    // Save before page unload (only if tracking enabled)
    window.addEventListener('beforeunload', function () {
        if (isTrackingEnabled) {
            trackedVideos.forEach(video => {
                if (video.currentTime > 0) {
                    saveVideoData(video);
                }
            });
        }
    });

    // Also save on visibility change (tab switch)
    document.addEventListener('visibilitychange', function () {
        if (document.hidden && isTrackingEnabled) {
            trackedVideos.forEach(video => {
                if (video.currentTime > 0) {
                    saveVideoData(video);
                }
            });
        }
    });

    // Listen for storage changes (in case user enables/disables from popup)
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (namespace === 'local' && (changes.trackedURLs || changes.videoHistory)) {
            checkTrackingStatus();
        }
    });

})();
