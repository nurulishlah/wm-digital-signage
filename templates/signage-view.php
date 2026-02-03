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
            $slider_query = new WP_Query(array(
                'post_type' => 'slide', // Using 'slide' CPT
                'posts_per_page' => 5,
                'orderby' => 'menu_order date',
                'order' => 'ASC',
            ));

            if ($slider_query->have_posts()) :
                $idx = 0;
                while ($slider_query->have_posts()) : $slider_query->the_post();
                    $active_class = ($idx === 0) ? 'active' : '';
                    $idx++;
                    ?>
                    <div class="signage-slide <?php echo $active_class; ?>">
                        <?php if (has_post_thumbnail()) : ?>
                            <?php the_post_thumbnail('full'); ?>
                        <?php else : ?>
                            <h1 style="font-size: 4rem; text-align: center; color: #ccc;"><?php the_title(); ?></h1>
                        <?php endif; ?>
                    </div>
                    <?php
                endwhile;
                wp_reset_postdata();
            else :
                // Fallback
                ?>
                <div class="signage-slide active">
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
