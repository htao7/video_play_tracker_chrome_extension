// Video Play Tracker - Popup Script
// Add current page URL to track videos

document.addEventListener('DOMContentLoaded', function () {
    const historyList = document.getElementById('historyList');
    const countElement = document.getElementById('count');
    const clearBtn = document.getElementById('clearBtn');
    const startTrackingBtn = document.getElementById('startTrackingBtn');

    // Format timestamp to relative time
    function formatTimestamp(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    }

    // Render history
    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyList.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p>No videos tracked yet.<br>Click "Start Tracking" to begin!</p>
        </div>
      `;
            countElement.textContent = '0 videos tracked';
            return;
        }

        countElement.textContent = `${history.length} video${history.length !== 1 ? 's' : ''} tracked`;

        historyList.innerHTML = history.map((item, index) => `
      <div class="history-item">
        <button class="remove-btn" data-index="${index}" title="Remove this entry">×</button>
        <div class="hostname">${item.hostname || new URL(item.url).hostname}</div>
        <div class="item-title" title="${item.title}">${item.title}</div>
        <div class="item-details">
          <div class="time-info">
            <span>⏱️ ${item.formattedTime}</span>
            <span>📅 ${formatTimestamp(item.timestamp)}</span>
          </div>
        </div>
        <a href="${item.url}" class="item-link" target="_blank" data-url="${item.url}">
          Open Video →
        </a>
      </div>
    `).join('');

        // Add click handlers for links
        const links = historyList.querySelectorAll('.item-link');
        links.forEach(link => {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const url = this.getAttribute('data-url');
                chrome.tabs.create({ url: url });
            });
        });

        // Add click handlers for remove buttons
        const removeButtons = historyList.querySelectorAll('.remove-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', function (e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                removeHistoryItem(index);
            });
        });
    }

    // Remove individual history item
    function removeHistoryItem(index) {
        chrome.storage.local.get(['videoHistory', 'trackedURLs'], function (result) {
            const history = result.videoHistory || [];
            let trackedURLs = result.trackedURLs || [];

            // Get the URL being removed
            const removedURL = history[index]?.url;

            // Remove from history
            history.splice(index, 1);

            // Also remove from tracked URLs
            if (removedURL) {
                trackedURLs = trackedURLs.filter(url => url !== removedURL);
            }

            // Save both
            chrome.storage.local.set({
                videoHistory: history,
                trackedURLs: trackedURLs
            }, function () {
                renderHistory(history);
            });
        });
    }

    // Start tracking current page
    startTrackingBtn.addEventListener('click', function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0] && tabs[0].url) {
                const url = tabs[0].url;
                chrome.storage.local.get(['trackedURLs', 'videoHistory'], function (result) {
                    let urls = result.trackedURLs || [];
                    let history = result.videoHistory || [];

                    if (!urls.includes(url)) {
                        urls.push(url);

                        // Create an immediate history entry so it shows up right away
                        const initialEntry = {
                            url: url,
                            title: tabs[0].title || new URL(url).hostname,
                            currentTime: 0,
                            duration: 0,
                            formattedTime: '0:00',
                            timestamp: Date.now(),
                            hostname: new URL(url).hostname
                        };

                        // Add to history
                        history.unshift(initialEntry);

                        // Save both
                        chrome.storage.local.set({
                            trackedURLs: urls,
                            videoHistory: history
                        }, function () {
                            // Show feedback
                            startTrackingBtn.textContent = 'Tracking Started!';
                            setTimeout(() => {
                                startTrackingBtn.textContent = 'Start Tracking';
                            }, 2000);
                        });
                    }
                });
            }
        });
    });

    // Load history
    function loadHistory() {
        chrome.storage.local.get(['videoHistory'], function (result) {
            renderHistory(result.videoHistory || []);
        });
    }

    // Clear history
    clearBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all video history? This will stop tracking all URLs.')) {
            chrome.storage.local.set({
                videoHistory: [],
                trackedURLs: []
            }, function () {
                loadHistory();
            });
        }
    });

    // Initial load
    loadHistory();

    // Listen for storage changes
    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (namespace === 'local' && changes.videoHistory) {
            renderHistory(changes.videoHistory.newValue || []);
        }
    });
});
