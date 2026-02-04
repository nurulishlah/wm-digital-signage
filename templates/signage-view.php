<?php
/**
 * Signage View Template
 * Fullscreen Digital Signage
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>Digital Signage - <?php bloginfo('name'); ?></title>
    <link rel="stylesheet" href="<?php echo WM_DIGISIGN_URL . 'assets/css/style.css'; ?>">
    <link rel="stylesheet" href="<?php echo get_template_directory_uri() . '/wm-css/icofont.css'; ?>">
    <?php wp_head(); ?>
    <!-- Load our CSS AFTER wp_head to override theme styles -->
    <link rel="stylesheet" href="<?php echo WM_DIGISIGN_URL . 'assets/css/style.css'; ?>">
</head>
<body class="signage-page">

<div id="signage-app">
    <!-- Header -->
    <header id="signage-header">
        <div class="mosque-info">
            <?php 
                $custom_logo_id = get_theme_mod( 'custom_logo' );
                $logo = wp_get_attachment_image_src( $custom_logo_id , 'full' );
            ?>
            <?php if ( has_custom_logo() ) : ?>
                <img src="<?php echo esc_url( $logo[0] ); ?>" alt="<?php bloginfo( 'name' ); ?>" class="mosque-logo">
            <?php endif; ?>
            
            <div class="mosque-text">
                <div class="mosque-name"><?php echo get_theme_mod('nama_masjid', get_bloginfo('name')); ?></div>
                <div class="mosque-slogan" style="font-size: 1.2rem; opacity: 0.9; color: #cbd5e1; font-weight: 400;"><?php bloginfo('description'); ?></div>
                <div class="mosque-address"><?php echo get_theme_mod('alamat', ''); ?></div>
            </div>
        </div>
        <div class="clock-widget">
            <div class="time-now" id="clock-time">--:--</div>
            <div class="date-now" id="clock-date">Initializing...</div>
        </div>
    </header>

    <!-- Main -->
    <div id="signage-main">
        <!-- Slider Area -->
        <main id="signage-slider">
            <?php
            // Query slides (all)
            $slides_query = new WP_Query(array(
                'post_type' => 'slide',
                'posts_per_page' => 10,
                'orderby' => 'menu_order date',
                'order' => 'ASC',
            ));
            
            // Query only the latest video
            $video_query = new WP_Query(array(
                'post_type' => 'video',
                'posts_per_page' => 1,
                'orderby' => 'date',
                'order' => 'DESC',
            ));
            
            // Query latest campaign (for fundraiser progress slide)
            $campaign_query = new WP_Query(array(
                'post_type' => 'sf_campaign',
                'posts_per_page' => 1,
                'orderby' => 'date',
                'order' => 'DESC',
                'post_status' => 'publish',
            ));
            
            // Merge posts: slides first, then video, then campaign at the end
            $all_posts = array_merge($slides_query->posts, $video_query->posts, $campaign_query->posts);
            $has_posts = !empty($all_posts);

            if ($has_posts) :
                $idx = 0;
                foreach ($all_posts as $post) :
                    setup_postdata($post);
                    $active_class = ($idx === 0) ? 'active' : '';
                    $post_type = get_post_type($post);
                    $idx++;
                    
                    // Check if this is a video post
                    $video_url = '';
                    if ($post_type === 'video') {
                        $video_url = get_post_meta($post->ID, 'video_embed', true);
                    }
                    
                    // Determine slide type
                    $slide_type = 'image';
                    if (!empty($video_url)) {
                        $slide_type = 'video';
                    } elseif ($post_type === 'sf_campaign') {
                        $slide_type = 'campaign';
                    }
                    ?>
                    <div class="signage-slide <?php echo $active_class; ?>" data-type="<?php echo $slide_type; ?>"<?php 
                        // Add background image for campaign slides
                        if ($slide_type === 'campaign' && has_post_thumbnail($post)) {
                            $bg_url = get_the_post_thumbnail_url($post, 'full');
                            echo ' style="background-image: url(' . esc_url($bg_url) . '); background-size: cover; background-position: center;"';
                        }
                    ?>>
                        <?php if ($slide_type === 'campaign') : ?>
                            <?php
                            // Get campaign data using Simple Fundraiser functions
                            $campaign_id = $post->ID;
                            $goal = get_post_meta($campaign_id, '_sf_goal', true);
                            $collected = function_exists('sf_get_campaign_total') ? sf_get_campaign_total($campaign_id) : 0;
                            $progress = function_exists('sf_get_campaign_progress') ? sf_get_campaign_progress($campaign_id) : 0;
                            
                            // Payment info
                            $bank_name = get_post_meta($campaign_id, '_sf_bank_name', true);
                            $account_number = get_post_meta($campaign_id, '_sf_account_number', true);
                            $account_holder = get_post_meta($campaign_id, '_sf_account_holder', true);
                            $qris_image_id = get_post_meta($campaign_id, '_sf_qris_image', true);
                            $qris_url = $qris_image_id ? wp_get_attachment_url($qris_image_id) : '';
                            
                            // Format currency
                            $format_fn = function_exists('sf_format_currency') ? 'sf_format_currency' : function($amt) { return 'Rp ' . number_format($amt, 0, ',', '.'); };
                            ?>
                            <div class="campaign-slide-overlay"></div>
                            <div class="campaign-slide-content">
                                <!-- Header -->
                                <div class="campaign-header">
                                    <h1 class="campaign-title"><?php echo get_the_title($post); ?></h1>
                                </div>
                                
                                <!-- Two Column Layout -->
                                <div class="campaign-body">
                                    <!-- Left: Progress -->
                                    <div class="campaign-left">
                                        <div class="campaign-progress-section">
                                            <h2>Progres</h2>
                                            <div class="campaign-stats">
                                                <div class="campaign-stat">
                                                    <span class="stat-label">Target</span>
                                                    <span class="stat-value"><?php echo $format_fn(floatval($goal)); ?></span>
                                                </div>
                                                <div class="campaign-stat">
                                                    <span class="stat-label">Terkumpul</span>
                                                    <span class="stat-value collected"><?php echo $format_fn($collected); ?></span>
                                                </div>
                                            </div>
                                            <div class="campaign-progress-bar">
                                                <div class="progress-fill" style="width: <?php echo esc_attr($progress); ?>%;"></div>
                                            </div>
                                            <div class="campaign-progress-percent"><?php echo number_format($progress, 1); ?>%</div>
                                            <div class="campaign-link"><?php echo esc_url(get_permalink($post)); ?></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Right: Payment Info + QRIS -->
                                    <div class="campaign-right">
                                        <div class="campaign-donate-section">
                                            <h2>Cara Donasi</h2>
                                            <div class="donate-columns">
                                                <?php if ($qris_url) : ?>
                                                    <div class="donate-col qris-col">
                                                        <p class="donate-label">Scan QRIS</p>
                                                        <img src="<?php echo esc_url($qris_url); ?>" alt="QRIS" class="qris-image">
                                                    </div>
                                                <?php endif; ?>
                                                <?php if ($bank_name && $account_number) : ?>
                                                    <div class="donate-col bank-col">
                                                        <p class="donate-label">Transfer Bank</p>
                                                        <div class="bank-info">
                                                            <div class="bank-name"><?php echo esc_html($bank_name); ?></div>
                                                            <div class="account-number"><?php echo esc_html($account_number); ?></div>
                                                            <div class="account-holder">a.n <?php echo esc_html($account_holder); ?></div>
                                                        </div>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php elseif ($slide_type === 'video' && !empty($video_url)) : ?>
                            <?php
                            // Convert YouTube/Vimeo URL to embed URL
                            $embed_url = '';
                            if (strpos($video_url, 'youtube.com') !== false || strpos($video_url, 'youtu.be') !== false) {
                                // Extract YouTube video ID
                                preg_match('/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/', $video_url, $matches);
                                if (!empty($matches[1])) {
                                    $embed_url = 'https://www.youtube.com/embed/' . $matches[1] . '?autoplay=1&mute=1&loop=1&controls=0&playlist=' . $matches[1];
                                }
                            } elseif (strpos($video_url, 'vimeo.com') !== false) {
                                // Extract Vimeo video ID
                                preg_match('/vimeo\.com\/(\d+)/', $video_url, $matches);
                                if (!empty($matches[1])) {
                                    $embed_url = 'https://player.vimeo.com/video/' . $matches[1] . '?autoplay=1&muted=1&loop=1&background=1';
                                }
                            } else {
                                // Assume it's a direct video URL (mp4, webm)
                                $embed_url = $video_url;
                            }
                            ?>
                            <?php if (strpos($embed_url, 'youtube.com') !== false || strpos($embed_url, 'vimeo.com') !== false) : ?>
                                <iframe 
                                    src="<?php echo esc_url($embed_url); ?>" 
                                    frameborder="0" 
                                    allow="autoplay; fullscreen" 
                                    allowfullscreen
                                    class="slide-video-iframe">
                                </iframe>
                            <?php else : ?>
                                <video autoplay muted loop playsinline class="slide-video">
                                    <source src="<?php echo esc_url($embed_url); ?>" type="video/mp4">
                                </video>
                            <?php endif; ?>
                        <?php elseif (has_post_thumbnail($post)) : ?>
                            <?php echo get_the_post_thumbnail($post, 'full'); ?>
                        <?php else : ?>
                            <h1 style="font-size: 4rem; text-align: center; color: #ccc;"><?php echo get_the_title($post); ?></h1>
                        <?php endif; ?>
                    </div>
                    <?php
                endforeach;
                wp_reset_postdata();
            else :
                // Fallback
                ?>
                <div class="signage-slide active" data-type="image">
                    <div style="text-align: center;">
                        <h1 style="font-size: 4rem; color: #fff;">Selamat Datang</h1>
                        <p style="font-size: 2rem; color: #ccc;"><?php bloginfo('name'); ?></p>
                    </div>
                </div>
            <?php endif; ?>
        </main>

        <!-- Sidebar: Prayer Times -->
        <aside id="signage-jadwal">
            <div id="prayer-list">
                <!-- Populated by JS -->
            </div>
            
            <div class="countdown-box">
                <div class="next-prayer-label">Menuju <span id="next-prayer-name">...</span></div>
                <div class="countdown-timer" id="countdown">--:--:--</div>
            </div>
        </aside>
    </div>

    <!-- Footer -->
    <footer id="signage-footer">
        <div class="running-text">
            <?php 
                // 1. Get Static Text
                $def_text = 'Selamat Datang di Masjid Kami. Mohon luruskan dan rapatkan shaf.';
                $static_text = get_theme_mod('run_text', $def_text);
                
                // 2. Get Dynamic Post Titles (Latest 1 per Type)
                $dynamic_text = '';
                // List of CPTs to check
                $cpt_list = array('pengumuman', 'agenda', 'infaq', 'wakaf', 'sf_campaign');
                
                // Icon Mapping (Dashicons)
                $icons = array(
                    'pengumuman' => 'dashicons-megaphone',
                    'agenda'     => 'dashicons-calendar-alt',
                    'infaq'      => 'dashicons-money-alt',
                    'wakaf'      => 'dashicons-heart', // or businessperson
                    'sf_campaign'=> 'dashicons-groups'
                );
                
                foreach ($cpt_list as $cpt) {
                   $args = array(
                       'post_type' => $cpt,
                       'posts_per_page' => 1,
                       'post_status' => 'publish',
                       'orderby' => 'date',
                       'order' => 'DESC',
                   );
                   
                   $q = new WP_Query($args);
                   if ($q->have_posts()) {
                       while ($q->have_posts()) {
                           $q->the_post();
                           
                           $icon_class = isset($icons[$cpt]) ? $icons[$cpt] : 'dashicons-star-filled';
                           
                           // Separator + Title
                           // Using dedicated class for alignment
                           $dynamic_text .= ' &nbsp;&nbsp;<span class="dashicons ' . $icon_class . ' running-icon"></span>&nbsp;&nbsp; ' . get_the_title();
                       }
                       wp_reset_postdata();
                   }
                }

                // Combine: Static Text + Dynamic Posts
                echo strip_tags($static_text) . $dynamic_text; 
            ?>
        </div>
    </footer>
</div>

<!-- Settings for JS -->
<script>
    var wmDigiSettings = {
        city_id: "<?php echo get_theme_mod('idsholat_id', '8'); ?>", // fallback to Jakarta
        method: "<?php echo get_theme_mod('method_id', 'KEMENAG'); ?>",
        imsaak_diff: 10, // minutes before Fajr
        adjustment: 0
    };
</script>

<script src="<?php echo WM_DIGISIGN_URL . 'assets/js/PrayTimes.js'; ?>"></script>
<script src="<?php echo WM_DIGISIGN_URL . 'assets/js/signage-clock.js'; ?>"></script>
<script src="<?php echo WM_DIGISIGN_URL . 'assets/js/signage-slider.js'; ?>"></script>

</body>
</html>
