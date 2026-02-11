/**
 * Signage Slider with Video Support
 * - Images: 5 seconds
 * - Videos: 30 seconds (more time to play)
 * - Campaign: 20 seconds
 *
 * Exposes window.signageSlider.pause() and .resume() for Prayer Engine.
 */
document.addEventListener('DOMContentLoaded', function () {
    initSlider();
});

function initSlider() {
    const slides = document.querySelectorAll('.signage-slide');
    if (slides.length < 2) return;

    let currentIndex = 0;
    let timerId = null;
    let paused = false;

    const IMAGE_DURATION = 5000;
    const VIDEO_DURATION = 30000;
    const CAMPAIGN_DURATION = 20000;

    slides[0].classList.add('active');

    function getSlideType(slide) {
        return slide.dataset.type || 'image';
    }

    function getDuration(slide) {
        const type = getSlideType(slide);
        if (type === 'video') return VIDEO_DURATION;
        if (type === 'campaign') return CAMPAIGN_DURATION;
        return IMAGE_DURATION;
    }

    function nextSlide() {
        if (paused) return;

        slides[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % slides.length;
        slides[currentIndex].classList.add('active');

        scheduleNext();
    }

    function scheduleNext() {
        if (timerId) clearTimeout(timerId);
        if (paused) return;
        timerId = setTimeout(nextSlide, getDuration(slides[currentIndex]));
    }

    // Start
    scheduleNext();

    // Expose pause/resume globally for Prayer Engine
    window.signageSlider = {
        pause: function () {
            paused = true;
            if (timerId) {
                clearTimeout(timerId);
                timerId = null;
            }
        },
        resume: function () {
            if (!paused) return;
            paused = false;
            scheduleNext();
        }
    };
}
