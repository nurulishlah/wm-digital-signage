<?php
/**
 * Plugin Name: WM Digital Signage
 * Description: A digital signage / Jasma-like display plugin for WP Masjid Theme. Access via /signage
 * Version: 1.3.0
 * Author: Muhamad Ishlah
 * Text Domain: wm-digisign
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WM_DIGISIGN_PATH', plugin_dir_path( __FILE__ ) );
define( 'WM_DIGISIGN_URL', plugin_dir_url( __FILE__ ) );
define( 'WM_DIGISIGN_VERSION', '1.3.0' );

class WM_Digital_Signage {

	public function __construct() {
		add_action( 'init', array( $this, 'add_endpoint' ) );
		add_action( 'template_redirect', array( $this, 'template_redirect' ) );
        add_filter( 'template_include', array( $this, 'load_template' ) );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
	}

	public function add_endpoint() {
		add_rewrite_endpoint( 'signage', EP_ROOT );
	}

	public function template_redirect() {
		global $wp_query;
		if ( isset( $wp_query->query_vars['signage'] ) ) {
            // We can handle logic here if needed, or just let template_include handle it
		}
	}

    public function load_template( $template ) {
        global $wp_query;
        if ( isset( $wp_query->query_vars['signage'] ) ) {
            // Enqueue Dashicons for the signage view
            wp_enqueue_style( 'dashicons' );
            
            $new_template = WM_DIGISIGN_PATH . 'templates/signage-view.php';
            if ( file_exists( $new_template ) ) {
                return $new_template;
            }
        }
        return $template;
    }

	/**
	 * Register REST API routes for live content updates.
	 */
	public function register_rest_routes() {
		register_rest_route( 'wm-digisign/v1', '/content-hash', array(
			'methods'             => 'GET',
			'callback'            => array( $this, 'get_content_hash' ),
			'permission_callback' => '__return_true',
		) );
	}

	/**
	 * REST callback: returns a hash of all signage-relevant content.
	 * The hash changes when any slide, video, campaign, or running text is modified.
	 */
	public function get_content_hash() {
		$hash_parts = array();

		// Collect last modified dates from all signage content types
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

		// Include running text setting
		$hash_parts[] = 'run_text:' . get_theme_mod( 'run_text', '' );

		// Include total post counts (detects additions/deletions)
		foreach ( array( 'slide', 'video', 'sf_campaign' ) as $pt ) {
			$count = wp_count_posts( $pt );
			$hash_parts[] = $pt . '_count:' . ( isset( $count->publish ) ? $count->publish : 0 );
		}

		$hash = md5( implode( '|', $hash_parts ) );

		return rest_ensure_response( array(
			'hash' => $hash,
			'time' => current_time( 'mysql' ),
		) );
	}

	public static function activate() {
		add_rewrite_endpoint( 'signage', EP_ROOT );
		flush_rewrite_rules();
	}
}

$wm_digisign = new WM_Digital_Signage();
register_activation_hook( __FILE__, array( 'WM_Digital_Signage', 'activate' ) );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
