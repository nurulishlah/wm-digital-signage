=== WM Digital Signage ===
Contributors: nurulishlah
Tags: digital signage, mosque, prayer times, masjid, display
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 1.4.0
Requires PHP: 7.4
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A beautiful fullscreen digital signage display for mosques, designed for WP Masjid theme.

== Description ==

WM Digital Signage transforms your website into a stunning TV display for your mosque. Perfect for lobby screens, prayer halls, and information kiosks.

**Features:**

* 🕐 Real-time clock with Hijri/Gregorian date
* 🕌 Automatic prayer times with countdown
* 🖼️ Image slider from your Slide posts
* 🎬 Video support (YouTube, Vimeo, or direct MP4)
* 💰 Campaign progress slide with QRIS and bank info
* 📢 Dynamic running text with announcements
* 🎨 2026 Modern Minimalist design with Glassmorphism
* ☪️ Beautiful Islamic geometric pattern overlay
* 📺 TV-safe zones (no content cut off by bezels)

**Requirements:**

* WP Masjid theme (for prayer time settings and content)
* Simple Fundraiser plugin (optional, for campaign slides)

== Installation ==

1. Upload the plugin folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu
3. Visit `yoursite.com/signage` to view the display
4. If the page shows 404, go to Settings > Permalinks and click Save

== Frequently Asked Questions ==

= How do I access the signage display? =

Simply visit `yoursite.com/signage` after activating the plugin.

= Why do I see a 404 error? =

Go to Settings > Permalinks in WordPress admin and click "Save Changes" to flush rewrite rules.

= Can I customize the colors? =

Currently the design uses the WP Masjid theme color palette. Custom color options may be added in future versions.

== Changelog ==

= 1.4.0 =
* NEW: Prayer Engine state machine — 5 automated states around prayer times
* NEW: APPROACHING overlay with countdown (configurable minutes before prayer)
* NEW: ADZAN visual alert with mosque icon, prayer name, and beep sound
* NEW: IQAMAH countdown overlay with configurable duration
* NEW: SHOLAT mode — black screen (OLED saver) during prayer
* NEW: Sunrise exception — skips ADZAN/IQAMAH/SHOLAT states
* NEW: Admin settings page (Settings > Digital Signage) for all durations
* NEW: Slider auto-pauses during ADZAN/IQAMAH/SHOLAT, resumes after
* FIX: Countdown timer format no longer shows erroneous minus prefix

= 1.3.0 =
* NEW: Auto-refresh signage when content is updated in WordPress (no manual reload needed)
* NEW: Prayer countdown auto-transitions to next prayer without page reload
* NEW: Midnight rollover recalculates prayer times for new day
* NEW: REST API endpoint for content change detection (/wp-json/wm-digisign/v1/content-hash)
* NEW: Cache-busting version parameter on all CSS/JS assets
* SECURITY: Escaped all dynamic output with esc_html/esc_attr/esc_js to prevent XSS
* SECURITY: Escaped all asset URLs with esc_url()
* FIX: Removed duplicate CSS loading
* FIX: Added missing wp_footer() call

= 1.2.0 =
* IMPROVED: Responsive layout for small screens and smart displays
* NEW: Height-based media queries for landscape TVs (720p)
* NEW: Nest Hub optimized layout (1024×600)
* FIX: Strip shortcode tags from running text output
* IMPROVED: Campaign slide vertical layout fills available space
* IMPROVED: Prayer times sidebar adapts to limited vertical space

= 1.1.0 =
* NEW: Video slide support (YouTube, Vimeo, direct MP4)
* NEW: Campaign progress slide from Simple Fundraiser
* Campaign slide shows target, collected, progress bar
* Campaign slide shows QRIS and bank transfer info
* Videos display for 30 seconds, campaigns for 20 seconds
* Only latest video and campaign are shown

= 1.0.0 =
* Initial release
* Real-time clock and date display
* Prayer times with countdown timer
* Image slider integration
* Dynamic running text (Pengumuman, Agenda, Infaq, Campaigns)
* 2026 Modern Minimalist Glassmorphism design
* Islamic geometric pattern background
* TV-safe zones

== Upgrade Notice ==

= 1.4.0 =
Prayer Engine state machine! Automated APPROACHING, ADZAN, IQAMAH, and SHOLAT overlays. Configurable via Settings > Digital Signage.

= 1.3.0 =
Auto-refresh content, auto-transitioning prayer countdown, and security hardening. Recommended update.

= 1.2.0 =
Responsive display for Nest Hub and small TVs! All prayer times and countdown now fit on 720p and 600p screens.

= 1.1.0 =
New video and campaign slide support! Show your fundraising campaigns with QRIS codes.

= 1.0.0 =
Initial release of WM Digital Signage.
