/**
 * Signage Slider with Video Support
 * - Images: 5 seconds
 * - Videos: 30 seconds (more time to play)
 */
document.addEventListener('DOMContentLoaded', function () {
    initSlider();
});

function initSlider() {
    const slides = document.querySelectorAll('.signage-slide');
    if (slides.length < 2) return;

    let currentIndex = 0;
    const IMAGE_DURATION = 5000;    // 5 seconds for images
    const VIDEO_DURATION = 30000;   // 30 seconds for videos
    const CAMPAIGN_DURATION = 20000; // 20 seconds for campaign slides

    // Set initial state
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
        // Remove active from current
        slides[currentIndex].classList.remove('active');

        // Next index
        currentIndex = (currentIndex + 1) % slides.length;

        // Add active to next
        slides[currentIndex].classList.add('active');

        // Schedule next transition based on current slide type
        setTimeout(nextSlide, getDuration(slides[currentIndex]));
    }

    // Start with duration based on first slide
    setTimeout(nextSlide, getDuration(slides[0]));
}
