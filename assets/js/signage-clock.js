/**
 * WM Digital Signage Logic
 * Handles Clock, Date, and Prayer Times (using PrayTimes.js)
 */

document.addEventListener('DOMContentLoaded', function () {
    updateClock();
    setInterval(updateClock, 1000);

    initPrayerTimes();
});

function updateClock() {
    const now = new Date();

    // Time
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById('clock-time').textContent = `${hours}:${minutes}`;

    // Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    document.getElementById('clock-date').textContent = dateStr;
}

// Global Prayer Times Object
var prayTimes = new PrayTimes(wmDigiSettings.method || 'KEMENAG');

// Store prayer times and coordinates globally for recalculation
window.prayerData = {
    times: null,
    lat: null,
    lng: null,
    timezone: null,
    lastCalculatedDate: null
};

const PRAYER_LIST = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const DISPLAY_NAMES = {
    'Fajr': 'Subuh',
    'Sunrise': 'Terbit',
    'Dhuhr': 'Dzuhur',
    'Asr': 'Ashar',
    'Maghrib': 'Maghrib',
    'Isha': 'Isya'
};
const PRAYER_ICONS = {
    'Fajr': 'icofont-night',
    'Sunrise': 'icofont-hill-sunny',
    'Dhuhr': 'icofont-full-sunny',
    'Asr': 'icofont-hill-sunny',
    'Maghrib': 'icofont-sun-set',
    'Isha': 'icofont-full-night'
};

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

                // Store coordinates for daily recalculation
                window.prayerData.lat = lat;
                window.prayerData.lng = lng;
                window.prayerData.timezone = timezone;

                calculateSchedule(lat, lng, timezone);
            } else {
                console.warn("API returned no coordinates, using default.");
                window.prayerData.lat = -6.2088;
                window.prayerData.lng = 106.8456;
                window.prayerData.timezone = 7;
                calculateSchedule(-6.2088, 106.8456, 7);
            }
        })
        .catch(err => {
            console.error("Failed to fetch city data:", err);
            window.prayerData.lat = -6.2088;
            window.prayerData.lng = 106.8456;
            window.prayerData.timezone = 7;
            calculateSchedule(-6.2088, 106.8456, 7);
        });
}

function calculateSchedule(lat, lng, timezone) {
    if (!prayTimes) {
        console.error("PrayTimes library not loaded");
        return;
    }

    const date = new Date();
    const times = prayTimes.getTimes(date, [lat, lng], timezone);

    // Store globally for recalculation
    window.prayerData.times = times;
    window.prayerData.lastCalculatedDate = date.toDateString();

    renderPrayerList(times);
    findAndSetNextPrayer(new Date());
    startCountdown();
}

/**
 * Recalculate prayer times for a new day (midnight rollover)
 */
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

/**
 * Render the prayer list UI
 */
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

/**
 * Convert "HH:MM" string to total minutes
 */
function timeToMins(tStr) {
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Find and set the next upcoming prayer based on current time.
 * Updates the active highlight and the countdown target.
 */
function findAndSetNextPrayer(now) {
    const times = window.prayerData.times;
    if (!times) return;

    const currentMins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    let nextPrayerName = null;
    let nextPrayerTime = null;
    let isTomorrow = false;

    // Find the next prayer that hasn't passed yet
    for (const name of PRAYER_LIST) {
        const pTime = times[name.toLowerCase()];
        const pMins = timeToMins(pTime);

        if (pMins > currentMins) {
            nextPrayerName = name;
            nextPrayerTime = pTime;
            break;
        }
    }

    // If no next prayer found (after Isha), next is Fajr tomorrow
    if (!nextPrayerName) {
        nextPrayerName = 'Fajr';
        nextPrayerTime = times.fajr;
        isTomorrow = true;
    }

    // Update active highlight
    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('active'));
    const nextEl = document.querySelector(`.prayer-item[data-name="${nextPrayerName}"]`);
    if (nextEl) nextEl.classList.add('active');

    // Set countdown target
    window.nextPrayerTarget = {
        name: nextPrayerName,
        time: nextPrayerTime,
        isTomorrow: isTomorrow
    };

    // Update the label immediately
    const elName = document.getElementById('next-prayer-name');
    if (elName) elName.textContent = DISPLAY_NAMES[nextPrayerName] || nextPrayerName;
}

/**
 * Start the countdown interval (runs every second)
 */
function startCountdown() {
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    // Run immediately then every second
    updateCountdownText(new Date());
    window.countdownInterval = setInterval(() => {
        updateCountdownText(new Date());
    }, 1000);
}

/**
 * Update the countdown display. When countdown reaches zero,
 * automatically recalculate the next prayer.
 */
function updateCountdownText(now) {
    if (!window.nextPrayerTarget) return;

    // Check if we've crossed midnight — recalculate prayer times for new day
    if (window.prayerData.lastCalculatedDate &&
        now.toDateString() !== window.prayerData.lastCalculatedDate) {
        recalculateForNewDay();
        return;
    }

    const targetTimeStr = window.nextPrayerTarget.time;
    const [tH, tM] = targetTimeStr.split(':').map(Number);

    let targetDate = new Date(now);
    targetDate.setHours(tH, tM, 0, 0);

    // Only add a day if the prayer is explicitly marked as tomorrow
    // (i.e. after Isha, waiting for Fajr). Do NOT use targetDate < now
    // because that would skip past the zero threshold and prevent
    // findAndSetNextPrayer() from ever being called.
    if (window.nextPrayerTarget.isTomorrow) {
        targetDate.setDate(targetDate.getDate() + 1);
    }

    const diff = targetDate - now;

    if (diff <= 0) {
        // Prayer time has passed! Recalculate the next prayer.
        findAndSetNextPrayer(now);
        return;
    }

    // Format -HH:MM:SS
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const format = (n) => String(n).padStart(2, '0');
    const countdownStr = `-${format(h)}:${format(m)}:${format(s)}`;

    const elCountdown = document.getElementById('countdown');
    if (elCountdown) elCountdown.textContent = countdownStr;
}
