<?php
/**
 * Plugin Name: WM Digital Signage
 * Description: A digital signage / Jasma-like display plugin for WP Masjid Theme. Access via /signage
 * Version: 1.4.0
 * Author: Muhamad Ishlah
 * Text Domain: wm-digisign
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WM_DIGISIGN_PATH', plugin_dir_path( __FILE__ ) );
define( 'WM_DIGISIGN_URL', plugin_dir_url( __FILE__ ) );
define( 'WM_DIGISIGN_VERSION', '1.4.0' );

class WM_Digital_Signage {

	/**
	 * Default prayer engine settings.
	 */
	const DEFAULTS = array(
		'approaching_mins' => 10,
		'adzan_duration'   => 2,
		'iqamah_duration'  => 10,
		'sholat_duration'  => 15,
		'adj_fajr'         => 0,
		'adj_sunrise'      => 0,
		'adj_dhuhr'        => 0,
		'adj_asr'          => 0,
		'adj_maghrib'      => 0,
		'adj_isha'         => 0,
	);

	public function __construct() {
		add_action( 'init', array( $this, 'add_endpoint' ) );
		add_action( 'template_redirect', array( $this, 'template_redirect' ) );
        add_filter( 'template_include', array( $this, 'load_template' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'admin_menu', array( $this, 'add_admin_menu' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
	}

	public function add_endpoint() {
		add_rewrite_endpoint( 'signage', EP_ROOT );
	}

	public function template_redirect() {
		global $wp_query;
		if ( isset( $wp_query->query_vars['signage'] ) ) {
		}
	}

    public function load_template( $template ) {
        global $wp_query;
        if ( isset( $wp_query->query_vars['signage'] ) ) {
            wp_enqueue_style( 'dashicons' );
            
            $new_template = WM_DIGISIGN_PATH . 'templates/signage-view.php';
            if ( file_exists( $new_template ) ) {
                return $new_template;
            }
        }
        return $template;
    }

	// -------------------------------------------------------
	// REST API
	// -------------------------------------------------------

	public function register_rest_routes() {
		register_rest_route( 'wm-digisign/v1', '/content-hash', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_content_hash' ),
			'permission_callback' => '__return_true',
		) );
	}

	public function get_content_hash() {
		$hash_parts = array();

		$post_types = array( 'slide', 'video', 'sf_campaign', 'pengumuman', 'agenda', 'infaq', 'wakaf' );
		foreach ( $post_types as $pt ) {
			$posts = get_posts( array(
				'post_type'      => $pt,
				'posts_per_page' => 10,
				'orderby'        => 'modified',
				'order'          => 'DESC',
				'post_status'    => 'publish',
				'fields'         => 'ids',
			) );
			foreach ( $posts as $pid ) {
				$hash_parts[] = $pid . ':' . get_post_modified_time( 'U', true, $pid );
			}
		}

		$hash_parts[] = 'run_text:' . get_theme_mod( 'run_text', '' );

		foreach ( array( 'slide', 'video', 'sf_campaign' ) as $pt ) {
			$count = wp_count_posts( $pt );
			$hash_parts[] = $pt . '_count:' . ( isset( $count->publish ) ? $count->publish : 0 );
		}

		// Include plugin settings so signage auto-refreshes when admin changes them
		$settings = self::get_settings();
		$hash_parts[] = 'settings:' . md5( serialize( $settings ) );

		$hash = md5( implode( '|', $hash_parts ) );

		return rest_ensure_response( array(
			'hash' => $hash,
			'time' => current_time( 'mysql' ),
		) );
	}

	// -------------------------------------------------------
	// Admin Settings
	// -------------------------------------------------------

	public function add_admin_menu() {
		add_options_page(
			'Digital Signage',
			'Digital Signage',
			'manage_options',
			'wm-digisign',
			array( $this, 'render_settings_page' )
		);
	}

	public function register_settings() {
		register_setting( 'wm_digisign_settings', 'wm_digisign_options', array(
			'sanitize_callback' => array( $this, 'sanitize_settings' ),
			'default'           => self::DEFAULTS,
		) );

		add_settings_section(
			'wm_digisign_prayer_engine',
			'Prayer Engine',
			function () {
				echo '<p>Atur durasi untuk setiap tahapan waktu sholat pada Digital Signage.</p>';
			},
			'wm-digisign'
		);

		$fields = array(
			'approaching_mins' => array(
				'label' => 'Waktu Menjelang Sholat (menit)',
				'desc'  => 'Berapa menit sebelum waktu sholat layar menampilkan countdown besar.',
			),
			'adzan_duration' => array(
				'label' => 'Durasi Adzan (menit)',
				'desc'  => 'Berapa lama tampilan adzan ditampilkan.',
			),
			'iqamah_duration' => array(
				'label' => 'Durasi Iqamah (menit)',
				'desc'  => 'Berapa lama countdown iqamah ditampilkan setelah adzan.',
			),
			'sholat_duration' => array(
				'label' => 'Durasi Sholat (menit)',
				'desc'  => 'Berapa lama layar dimatikan (hitam) selama sholat berlangsung.',
			),
		);

		foreach ( $fields as $key => $field ) {
			add_settings_field(
				'wm_digisign_' . $key,
				$field['label'],
				function () use ( $key, $field ) {
					$options = self::get_settings();
					$val = isset( $options[ $key ] ) ? $options[ $key ] : self::DEFAULTS[ $key ];
					printf(
						'<input type="number" name="wm_digisign_options[%s]" value="%s" min="1" max="60" class="small-text" /> <span class="description">%s</span>',
						esc_attr( $key ),
						esc_attr( $val ),
						esc_html( $field['desc'] )
					);
				},
				'wm-digisign',
				'wm_digisign_prayer_engine'
			);
		}

		// --- Prayer Time Adjustment Section ---
		add_settings_section(
			'wm_digisign_time_adjust',
			'Koreksi Waktu Sholat',
			function () {
				echo '<p>Koreksi waktu sholat dalam menit. Nilai positif = mundurkan, negatif = majukan. Contoh: <code>+2</code> berarti mundur 2 menit.</p>';
			},
			'wm-digisign'
		);

		$adj_fields = array(
			'adj_fajr'    => 'Subuh',
			'adj_sunrise' => 'Terbit',
			'adj_dhuhr'   => 'Dzuhur',
			'adj_asr'     => 'Ashar',
			'adj_maghrib' => 'Maghrib',
			'adj_isha'    => 'Isya',
		);

		foreach ( $adj_fields as $key => $label ) {
			add_settings_field(
				'wm_digisign_' . $key,
				$label,
				function () use ( $key ) {
					$options = self::get_settings();
					$val = isset( $options[ $key ] ) ? $options[ $key ] : 0;
					printf(
						'<input type="number" name="wm_digisign_options[%s]" value="%s" min="-30" max="30" class="small-text" /> <span class="description">menit</span>',
						esc_attr( $key ),
						esc_attr( $val )
					);
				},
				'wm-digisign',
				'wm_digisign_time_adjust'
			);
		}
	}

	public function sanitize_settings( $input ) {
		$output = array();

		// Engine duration fields (positive only, 1-60)
		$duration_keys = array( 'approaching_mins', 'adzan_duration', 'iqamah_duration', 'sholat_duration' );
		foreach ( $duration_keys as $key ) {
			$output[ $key ] = isset( $input[ $key ] ) ? absint( $input[ $key ] ) : self::DEFAULTS[ $key ];
			if ( $output[ $key ] < 1 ) $output[ $key ] = self::DEFAULTS[ $key ];
			if ( $output[ $key ] > 60 ) $output[ $key ] = 60;
		}

		// Adjustment fields (can be negative, -30 to +30)
		$adj_keys = array( 'adj_fajr', 'adj_sunrise', 'adj_dhuhr', 'adj_asr', 'adj_maghrib', 'adj_isha' );
		foreach ( $adj_keys as $key ) {
			$output[ $key ] = isset( $input[ $key ] ) ? intval( $input[ $key ] ) : 0;
			$output[ $key ] = max( -30, min( 30, $output[ $key ] ) );
		}

		return $output;
	}

	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) return;
		?>
		<div class="wrap">
			<h1>Digital Signage Settings</h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'wm_digisign_settings' );
				do_settings_sections( 'wm-digisign' );
				submit_button( 'Simpan Pengaturan' );
				?>
			</form>
			<hr>
			<p><a href="<?php echo esc_url( home_url( '/signage' ) ); ?>" target="_blank">🖥️ Buka Tampilan Signage &rarr;</a></p>
		</div>
		<?php
	}

	/**
	 * Get prayer engine settings with defaults.
	 */
	public static function get_settings() {
		$options = get_option( 'wm_digisign_options', array() );
		return wp_parse_args( $options, self::DEFAULTS );
	}

	// -------------------------------------------------------
	// Activation
	// -------------------------------------------------------

	public static function activate() {
		add_rewrite_endpoint( 'signage', EP_ROOT );
		flush_rewrite_rules();
	}
}

$wm_digisign = new WM_Digital_Signage();
register_activation_hook( __FILE__, array( 'WM_Digital_Signage', 'activate' ) );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
