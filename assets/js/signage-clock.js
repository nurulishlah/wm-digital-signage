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
    // const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('clock-time').textContent = `${hours}:${minutes}`;

    // Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('id-ID', options);
    // TODO: Add Hijri Date
    document.getElementById('clock-date').textContent = dateStr;

    // Check prayer times every minute
    if (now.getSeconds() === 0) {
        highlightCurrentPrayer(now);
    }
}

// Global Prayer Times Object
var prayTimes = new PrayTimes(wmDigiSettings.method || 'KEMENAG');

function initPrayerTimes() {
    // Coordinate for Jakarta (Fallback). Ideally this comes from the city_id API fetch if we want precise lat/long
    // For now, let's try to fetch coordinates from idsholat like the theme does, or use a default.

    // Since we are mocking/porting, let's fetch the ID Sholat API to get Lat/Long
    // API: https://idsholat.net/wp-json/wp/v2/posts/{city_id}

    const cityId = wmDigiSettings.city_id;
    const apiUrl = `https://idsholat.net/wp-json/wp/v2/posts/${cityId}`;

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) throw new Error("API Network response was not ok");
            return response.json();
        })
        .then(data => {
            console.log("Prayer API Data:", data); // Debug Log
            if (data.lat) {
                const coords = data.lat.split(',');
                const lat = parseFloat(coords[0]);
                const lng = parseFloat(coords[1]);
                const timezone = parseFloat(data.zone);

                calculateSchedule(lat, lng, timezone);
            } else {
                console.warn("API returned no coordinates, using default.");
                calculateSchedule(-6.2088, 106.8456, 7);
            }
        })
        .catch(err => {
            console.error("Failed to fetch city data:", err);
            // Fallback to Jakarta (Monas)
            calculateSchedule(-6.2088, 106.8456, 7);
        });
}

function calculateSchedule(lat, lng, timezone) {
    if (!prayTimes) {
        console.error("PrayTimes library not loaded");
        return;
    }

    const date = new Date();
    // PrayTimes needs [lat, lng] and timezone
    const times = prayTimes.getTimes(date, [lat, lng], timezone);
    console.log("Calculated Times:", times); // Debug Log

    const listNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const displayNames = {
        'Fajr': 'Subuh',
        'Sunrise': 'Terbit',
        'Dhuhr': 'Dzuhur',
        'Asr': 'Ashar',
        'Maghrib': 'Maghrib',
        'Isha': 'Isya'
    };

    // Icons mapping (Icofont)
    // Available: hill-sunny, full-sunny, sun-set, night, full-night
    const icons = {
        'Fajr': 'icofont-night',
        'Sunrise': 'icofont-hill-sunny',
        'Dhuhr': 'icofont-full-sunny',
        'Asr': 'icofont-hill-sunny', // Reusing hill-sunny for afternoon
        'Maghrib': 'icofont-sun-set',
        'Isha': 'icofont-full-night'
    };

    const container = document.getElementById('prayer-list');
    if (container) {
        container.innerHTML = ''; // Clear
        listNames.forEach(name => {
            const timeVal = times[name.toLowerCase()]; // 04:30
            const iconClass = icons[name] || 'icofont-clock-time';

            const el = document.createElement('div');
            el.className = 'prayer-item';
            el.dataset.name = name; // Sets data-name="Fajr"
            el.innerHTML = `
                <div class="prayer-label">
                    <i class="prayer-icon ${iconClass}"></i>
                    <span class="prayer-name">${displayNames[name]}</span>
                </div>
                <span class="prayer-time">${timeVal}</span>
            `;
            container.appendChild(el);
        });
    }

    highlightCurrentPrayer(new Date(), times);
    startCountdown(times);
}

function highlightCurrentPrayer(now, times) {
    if (!times) return;

    // Time in minutes for comparison
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Convert times to minutes
    const timeToMins = (tStr) => {
        const [h, m] = tStr.split(':').map(Number);
        return h * 60 + m;
    };

    let nextPrayerName = null;
    let nextPrayerTime = null;

    const listNames = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']; // Keys in PrayTimes

    // Find next prayer
    for (const name of listNames) {
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
        nextPrayerTime = times.fajr; // Using today's Fajr as proxy for time, logic needs tomorrow handling for accurate countdown
    }

    // Highlight UI
    document.querySelectorAll('.prayer-item').forEach(el => el.classList.remove('active'));

    // Fix: Selector was [dataset-name], changed to [data-name]
    const nextEl = document.querySelector(`.prayer-item[data-name="${nextPrayerName}"]`);
    if (nextEl) nextEl.classList.add('active');

    // Update Countdown Target
    window.nextPrayerTarget = { name: nextPrayerName, time: nextPrayerTime };
    console.log("Next Prayer Target:", window.nextPrayerTarget); // Debug Log
    updateCountdownText(now);
}

function startCountdown(times) {
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    // Initial call
    updateCountdownText(new Date());

    window.countdownInterval = setInterval(() => {
        updateCountdownText(new Date());
    }, 1000);
}

function updateCountdownText(now) {
    if (!window.nextPrayerTarget) return;

    const targetTimeStr = window.nextPrayerTarget.time;
    const [tH, tM] = targetTimeStr.split(':').map(Number);

    let targetDate = new Date(now);
    targetDate.setHours(tH, tM, 0, 0);

    // If target is earlier than now, it means it's tomorrow (e.g. Fajr)
    // OR if next prayer is Fajr and it's currently Isha time (late night)
    if (targetDate < now) {
        targetDate.setDate(targetDate.getDate() + 1);
    }

    const diff = targetDate - now;

    if (diff <= 0) {
        document.getElementById('countdown').textContent = "00:00:00";
        return;
    }

    // Format H:M:S
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    const format = (n) => String(n).padStart(2, '0');
    const countdownStr = `-${format(h)}:${format(m)}:${format(s)}`;

    const elCountdown = document.getElementById('countdown');
    if (elCountdown) elCountdown.textContent = countdownStr;

    // Update Name
    const displayNames = {
        'Fajr': 'Subuh',
        'Sunrise': 'Terbit',
        'Dhuhr': 'Dzuhur',
        'Asr': 'Ashar',
        'Maghrib': 'Maghrib',
        'Isha': 'Isya'
    };
    const elName = document.getElementById('next-prayer-name');
    if (elName) elName.textContent = displayNames[window.nextPrayerTarget.name] || window.nextPrayerTarget.name;
}
