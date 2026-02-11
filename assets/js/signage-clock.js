/**
 * WM Digital Signage — Prayer Engine State Machine
 * =================================================
 *
 * States: NORMAL → APPROACHING → ADZAN → IQAMAH → SHOLAT → NORMAL
 *
 * Sunrise (Terbit) exception: NORMAL → APPROACHING → NORMAL
 * (no adzan/iqamah/sholat for sunrise)
 */

document.addEventListener('DOMContentLoaded', function () {
    updateClock();
    setInterval(updateClock, 1000);
    initPrayerTimes();
});

// ===================================================================
// Clock & Date
// ===================================================================

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-time').textContent = `${hours}:${minutes}`;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    document.getElementById('clock-date').textContent = dateStr;
}

// ===================================================================
// Constants & Config
// ===================================================================

var prayTimes = new PrayTimes(wmDigiSettings.method || 'KEMENAG');

const PRAYER_LIST = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const DISPLAY_NAMES = {
    'Fajr': 'Subuh', 'Sunrise': 'Terbit', 'Dhuhr': 'Dzuhur',
    'Asr': 'Ashar', 'Maghrib': 'Maghrib', 'Isha': 'Isya'
};
const PRAYER_ICONS = {
    'Fajr': 'icofont-night', 'Sunrise': 'icofont-hill-sunny',
    'Dhuhr': 'icofont-full-sunny', 'Asr': 'icofont-hill-sunny',
    'Maghrib': 'icofont-sun-set', 'Isha': 'icofont-full-night'
};

// States
const STATE = {
    NORMAL: 'NORMAL',
    APPROACHING: 'APPROACHING',
    ADZAN: 'ADZAN',
    IQAMAH: 'IQAMAH',
    SHOLAT: 'SHOLAT'
};

// ===================================================================
// Global State
// ===================================================================

window.prayerData = {
    times: null,
    lat: null,
    lng: null,
    timezone: null,
    lastCalculatedDate: null
};

window.prayerEngine = {
    state: STATE.NORMAL,
    currentPrayer: null,     // The prayer this engine cycle is handling
    stateEnteredAt: null,    // Timestamp when current state was entered
    config: {
        approaching_mins: parseInt(wmDigiSettings.approaching_mins) || 10,
        adzan_duration: parseInt(wmDigiSettings.adzan_duration) || 2,
        iqamah_duration: parseInt(wmDigiSettings.iqamah_duration) || 10,
        sholat_duration: parseInt(wmDigiSettings.sholat_duration) || 15
    }
};

window.nextPrayerTarget = null;

// ===================================================================
// Init & Fetch Prayer Times
// ===================================================================

function initPrayerTimes() {
    const cityId = wmDigiSettings.city_id;
    const apiUrl = `https://idsholat.net/wp-json/wp/v2/posts/${cityId}`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error("API Network response was not ok");
            return response.json();
        })
        .then(data => {
            if (data.lat) {
                const coords = data.lat.split(',');
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                const timezone = parseFloat(data.zone);
                window.prayerData.lat = lat;
                window.prayerData.lng = lng;
                window.prayerData.timezone = timezone;
                calculateSchedule(lat, lng, timezone);
            } else {
                useFallbackCoords();
            }
        })
        .catch(err => {
            console.error("Failed to fetch city data:", err);
            useFallbackCoords();
        });
}

function useFallbackCoords() {
    window.prayerData.lat = -6.2088;
    window.prayerData.lng = 106.8456;
    window.prayerData.timezone = 7;
    calculateSchedule(-6.2088, 106.8456, 7);
}

function calculateSchedule(lat, lng, timezone) {
    if (!prayTimes) return;

    const date = new Date();
    const times = prayTimes.getTimes(date, [lat, lng], timezone);

    window.prayerData.times = times;
    window.prayerData.lastCalculatedDate = date.toDateString();

    renderPrayerList(times);
    findAndSetNextPrayer(new Date());

    // Start the engine tick (1 Hz)
    if (window._engineInterval) clearInterval(window._engineInterval);
    engineTick(new Date()); // immediate first tick
    window._engineInterval = setInterval(function () {
        engineTick(new Date());
    }, 1000);
}

function recalculateForNewDay() {
    const { lat, lng, timezone } = window.prayerData;
    if (lat == null) return;

    const today = new Date();
    const times = prayTimes.getTimes(today, [lat, lng], timezone);

    window.prayerData.times = times;
    window.prayerData.lastCalculatedDate = today.toDateString();

    renderPrayerList(times);
    findAndSetNextPrayer(today);
}

// ===================================================================
// Prayer List Rendering
// ===================================================================

function renderPrayerList(times) {
    const container = document.getElementById('prayer-list');
    if (!container) return;

    container.innerHTML = '';
    PRAYER_LIST.forEach(name => {
        const timeVal = times[name.toLowerCase()];
        const iconClass = PRAYER_ICONS[name] || 'icofont-clock-time';

        const el = document.createElement('div');
        el.className = 'prayer-item';
        el.dataset.name = name;
        el.innerHTML = `
            <div class="prayer-label">
                <i class="prayer-icon ${iconClass}"></i>
                <span class="prayer-name">${DISPLAY_NAMES[name]}</span>
            </div>
            <span class="prayer-time">${timeVal}</span>
        `;
        container.appendChild(el);
    });
}

// ===================================================================
// Next Prayer Logic
// ===================================================================

function timeToMins(tStr) {
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
}

function findAndSetNextPrayer(now) {
    const times = window.prayerData.times;
    if (!times) return;

    const currentMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    let nextPrayerName = null;
    let nextPrayerTime = null;
    let isTomorrow = false;

    for (const name of PRAYER_LIST) {
        const pTime = times[name.toLowerCase()];
        const pMins = timeToMins(pTime);
        if (pMins > currentMins) {
            nextPrayerName = name;
            nextPrayerTime = pTime;
            break;
        }
    }

    if (!nextPrayerName) {
        nextPrayerName = 'Fajr';
        nextPrayerTime = times.fajr;
        isTomorrow = true;
    }

    // Update active highlight
    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('active'));
    const nextEl = document.querySelector(`.prayer-item[data-name="${nextPrayerName}"]`);
    if (nextEl) nextEl.classList.add('active');

    window.nextPrayerTarget = {
        name: nextPrayerName,
        time: nextPrayerTime,
        isTomorrow: isTomorrow
    };

    const elName = document.getElementById('next-prayer-name');
    if (elName) elName.textContent = DISPLAY_NAMES[nextPrayerName] || nextPrayerName;
}

// ===================================================================
// ENGINE TICK — The Heart of the State Machine (runs every second)
// ===================================================================

function engineTick(now) {
    // Midnight rollover
    if (window.prayerData.lastCalculatedDate &&
        now.toDateString() !== window.prayerData.lastCalculatedDate) {
        recalculateForNewDay();
        enterState(STATE.NORMAL, now);
        return;
    }

    if (!window.nextPrayerTarget) return;

    const engine = window.prayerEngine;
    const config = engine.config;

    // Calculate diff to next prayer in milliseconds
    const targetTimeStr = window.nextPrayerTarget.time;
    const [tH, tM] = targetTimeStr.split(':').map(Number);
    let targetDate = new Date(now);
    targetDate.setHours(tH, tM, 0, 0);
    if (window.nextPrayerTarget.isTomorrow) {
        targetDate.setDate(targetDate.getDate() + 1);
    }
    const diffMs = targetDate - now;
    const diffMins = diffMs / 60000;

    // Calculate how long we've been in the current state
    const stateElapsedMs = engine.stateEnteredAt ? (now - engine.stateEnteredAt) : 0;
    const stateElapsedMins = stateElapsedMs / 60000;

    const isSunrise = window.nextPrayerTarget.name === 'Sunrise';

    // ── State transitions ──
    switch (engine.state) {

        case STATE.NORMAL:
            // Transition to APPROACHING when within threshold
            if (diffMins > 0 && diffMins <= config.approaching_mins) {
                enterState(STATE.APPROACHING, now);
            }
            // Prayer time reached while in NORMAL (edge case: skipped APPROACHING)
            else if (diffMs <= 0) {
                if (isSunrise) {
                    findAndSetNextPrayer(now);
                    // Stay NORMAL
                } else {
                    enterState(STATE.ADZAN, now);
                }
            }
            break;

        case STATE.APPROACHING:
            // Prayer time reached → transition
            if (diffMs <= 0) {
                if (isSunrise) {
                    // Sunrise: go back to normal, find next prayer
                    findAndSetNextPrayer(now);
                    enterState(STATE.NORMAL, now);
                } else {
                    enterState(STATE.ADZAN, now);
                }
            }
            break;

        case STATE.ADZAN:
            // After adzan_duration, transition to IQAMAH
            if (stateElapsedMins >= config.adzan_duration) {
                enterState(STATE.IQAMAH, now);
            }
            break;

        case STATE.IQAMAH:
            // After iqamah_duration, transition to SHOLAT
            if (stateElapsedMins >= config.iqamah_duration) {
                enterState(STATE.SHOLAT, now);
            }
            break;

        case STATE.SHOLAT:
            // After sholat_duration, back to NORMAL
            if (stateElapsedMins >= config.sholat_duration) {
                findAndSetNextPrayer(now);
                enterState(STATE.NORMAL, now);
            }
            break;
    }

    // ── Update UI for current state ──
    updateStateUI(now, diffMs, stateElapsedMs);
}

// ===================================================================
// State Entry — Side Effects
// ===================================================================

function enterState(newState, now) {
    const engine = window.prayerEngine;
    const oldState = engine.state;

    engine.state = newState;
    engine.stateEnteredAt = now;

    // If entering ADZAN, record which prayer triggered it
    if (newState === STATE.ADZAN) {
        engine.currentPrayer = window.nextPrayerTarget ? window.nextPrayerTarget.name : null;
        // Advance to next prayer for the countdown sidebar
        findAndSetNextPrayer(now);
    }

    // Hide all overlays first
    hideAllOverlays();

    // State-specific enter actions
    switch (newState) {
        case STATE.NORMAL:
            if (window.signageSlider) window.signageSlider.resume();
            document.getElementById('signage-app').style.opacity = '1';
            break;

        case STATE.APPROACHING:
            showOverlay('approaching');
            break;

        case STATE.ADZAN:
            showOverlay('adzan');
            if (window.signageSlider) window.signageSlider.pause();
            playBeep();
            // Set the prayer name on the adzan overlay
            var adzanNameEl = document.getElementById('adzan-prayer-name');
            if (adzanNameEl) {
                var pName = engine.currentPrayer;
                adzanNameEl.textContent = DISPLAY_NAMES[pName] || pName || '';
            }
            break;

        case STATE.IQAMAH:
            showOverlay('iqamah');
            break;

        case STATE.SHOLAT:
            showOverlay('sholat');
            break;
    }
}

// ===================================================================
// State UI Updates (called every second)
// ===================================================================

function updateStateUI(now, diffMs, stateElapsedMs) {
    const engine = window.prayerEngine;
    const config = engine.config;

    switch (engine.state) {

        case STATE.NORMAL:
        case STATE.APPROACHING:
            // Update sidebar countdown
            updateSidebarCountdown(diffMs);

            // Approaching overlay countdown
            if (engine.state === STATE.APPROACHING) {
                var approachEl = document.getElementById('approaching-countdown');
                if (approachEl && diffMs > 0) {
                    approachEl.textContent = formatCountdown(diffMs);
                }
                var approachNameEl = document.getElementById('approaching-prayer-name');
                if (approachNameEl && window.nextPrayerTarget) {
                    approachNameEl.textContent = DISPLAY_NAMES[window.nextPrayerTarget.name] || '';
                }
            }
            break;

        case STATE.ADZAN:
            // Pulsing animation handled by CSS
            // Update elapsed timer on overlay
            var adzanTimerEl = document.getElementById('adzan-timer');
            if (adzanTimerEl) {
                var remaining = (config.adzan_duration * 60000) - stateElapsedMs;
                if (remaining < 0) remaining = 0;
                adzanTimerEl.textContent = formatCountdown(remaining);
            }
            break;

        case STATE.IQAMAH:
            var iqamahEl = document.getElementById('iqamah-countdown');
            if (iqamahEl) {
                var remaining = (config.iqamah_duration * 60000) - stateElapsedMs;
                if (remaining < 0) remaining = 0;
                iqamahEl.textContent = formatCountdown(remaining);
            }
            var iqamahLabel = document.getElementById('iqamah-prayer-name');
            if (iqamahLabel) {
                iqamahLabel.textContent = DISPLAY_NAMES[engine.currentPrayer] || '';
            }
            break;

        case STATE.SHOLAT:
            // Screen is black. Optionally show a tiny timer.
            var sholatEl = document.getElementById('sholat-timer');
            if (sholatEl) {
                var remaining = (config.sholat_duration * 60000) - stateElapsedMs;
                if (remaining < 0) remaining = 0;
                sholatEl.textContent = formatCountdown(remaining);
            }
            break;
    }
}

function updateSidebarCountdown(diffMs) {
    var elCountdown = document.getElementById('countdown');
    if (!elCountdown) return;

    if (diffMs <= 0) {
        elCountdown.textContent = '00:00:00';
        return;
    }

    elCountdown.textContent = formatCountdown(diffMs);
}

// ===================================================================
// Helpers
// ===================================================================

function formatCountdown(ms) {
    if (ms <= 0) return '00:00:00';
    var h = Math.floor(ms / 3600000);
    var m = Math.floor((ms % 3600000) / 60000);
    var s = Math.floor((ms % 60000) / 1000);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return pad(h) + ':' + pad(m) + ':' + pad(s);
}

function showOverlay(id) {
    var el = document.getElementById('prayer-overlay-' + id);
    if (el) el.classList.remove('hidden');
}

function hideAllOverlays() {
    var overlays = document.querySelectorAll('.prayer-overlay');
    overlays.forEach(function (el) { el.classList.add('hidden'); });
}

// ===================================================================
// Beep Sound (Web Audio API)
// ===================================================================

function playBeep() {
    try {
        var ctx = new (window.AudioContext || window.webkitAudioContext)();

        // Play 3 short beeps
        [0, 0.3, 0.6].forEach(function (delay) {
            var osc = ctx.createOscillator();
            var gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880; // A5 note
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.15);
        });
    } catch (e) {
        // Audio not available — ignore silently
    }
}
