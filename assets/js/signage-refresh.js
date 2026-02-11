/**
 * WM Digital Signage - Auto-Refresh
 * Polls the REST API for content changes and reloads when updates are detected.
 */

(function () {
    'use strict';

    const POLL_INTERVAL = 30000; // Check every 30 seconds
    let currentHash = null;

    /**
     * Fetch the content hash from the REST API.
     */
    async function fetchContentHash() {
        try {
            const url = (wmDigiSettings.restUrl || '/wp-json/wm-digisign/v1') + '/content-hash';

            // Abort if request takes longer than 5 seconds
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(url, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('HTTP ' + response.status);

            const data = await response.json();
            return data.hash;
        } catch (err) {
            console.warn('[Signage Refresh] Failed to fetch content hash:', err.message);
            return null;
        }
    }

    /**
     * Reload the page with a smooth fade-out transition.
     */
    function reloadWithFade() {
        const app = document.getElementById('signage-app');
        if (app) {
            app.style.transition = 'opacity 0.5s ease';
            app.style.opacity = '0';
        }
        setTimeout(function () {
            location.reload();
        }, 500);
    }

    /**
     * Poll for content changes.
     */
    async function pollForChanges() {
        const newHash = await fetchContentHash();

        if (newHash === null) {
            // API error — skip this cycle
            return;
        }

        if (currentHash === null) {
            // First run — store the initial hash, no reload
            currentHash = newHash;
            return;
        }

        if (newHash !== currentHash) {
            console.log('[Signage Refresh] Content changed, reloading...');
            reloadWithFade();
            return; // Don't continue polling, page will reload
        }
    }

    // Start polling after page is ready
    document.addEventListener('DOMContentLoaded', function () {
        // Initial hash fetch (1 second delay to let page settle)
        setTimeout(function () {
            pollForChanges();
            // Then poll at regular intervals
            setInterval(pollForChanges, POLL_INTERVAL);
        }, 1000);
    });
})();
