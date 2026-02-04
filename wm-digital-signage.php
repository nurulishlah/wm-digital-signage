<?php
/**
 * Plugin Name: WM Digital Signage
 * Description: A digital signage / Jasma-like display plugin for WP Masjid Theme. Access via /signage
 * Version: 1.1.0
 * Author: Muhamad Ishlah
 * Text Domain: wm-digisign
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'WM_DIGISIGN_PATH', plugin_dir_path( __FILE__ ) );
define( 'WM_DIGISIGN_URL', plugin_dir_url( __FILE__ ) );

class WM_Digital_Signage {

	public function __construct() {
		add_action( 'init', array( $this, 'add_endpoint' ) );
		add_action( 'template_redirect', array( $this, 'template_redirect' ) );
        add_filter( 'template_include', array( $this, 'load_template' ) );
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

	public static function activate() {
		add_rewrite_endpoint( 'signage', EP_ROOT );
		flush_rewrite_rules();
	}
}

$wm_digisign = new WM_Digital_Signage();
register_activation_hook( __FILE__, array( 'WM_Digital_Signage', 'activate' ) );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );
