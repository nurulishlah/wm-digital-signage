/**
 * Simple Crossfade Slide Logic
 */
document.addEventListener('DOMContentLoaded', function () {
    initSlider();
});

function initSlider() {
    const slides = document.querySelectorAll('.signage-slide');
    if (slides.length < 2) return;

    let currentIndex = 0;

    // Set initial state
    slides[0].classList.add('active');

    setInterval(() => {
        // Remove active from current
        slides[currentIndex].classList.remove('active');

        // Next index
        currentIndex = (currentIndex + 1) % slides.length;

        // Add active to next
        slides[currentIndex].classList.add('active');
    }, 5000); // 5 seconds per slide
}
