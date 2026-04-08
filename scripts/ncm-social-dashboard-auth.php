<?php
/**
 * Plugin Name: NCM Social Dashboard Auth
 * Description: Fixes login redirect loop for the social dashboard subdomain.
 *              Drop this file into wp-content/mu-plugins/ on the WordPress site.
 *
 * Solves two problems:
 *   1. WordPress cookies are host-only by default, so the dashboard on
 *      isd.neoncactusmedia.com never receives the session cookies set on
 *      neoncactusmedia.com. This sets COOKIE_DOMAIN so cookies cover all
 *      subdomains.
 *   2. wp_safe_redirect() blocks redirects to hosts other than the WP host.
 *      When the dashboard sends the user to wp-login.php?redirect_to=
 *      https://isd.neoncactusmedia.com/, WordPress replaces that with a
 *      fallback URL (like /app-gateway/) which can itself loop. Adding the
 *      dashboard subdomain to the allowed redirect hosts fixes this.
 *
 * IMPORTANT: After installing this mu-plugin, have all users clear their
 * cookies for neoncactusmedia.com (or use incognito) so the old host-only
 * cookies are replaced with domain-scoped ones.
 */

// ── 1. Cookie domain ────────────────────────────────────────────────────────
// Must be defined before WP sets cookies. mu-plugins load early enough.
// The leading dot is optional per RFC 6265 but explicit for clarity.
if ( ! defined( 'COOKIE_DOMAIN' ) ) {
    define( 'COOKIE_DOMAIN', '.neoncactusmedia.com' );
}

// ── 2. Allowed redirect hosts ───────────────────────────────────────────────
// Let WordPress redirect to the dashboard subdomain after login.
add_filter( 'allowed_redirect_hosts', function ( $hosts ) {
    $hosts[] = 'isd.neoncactusmedia.com';
    return $hosts;
} );
