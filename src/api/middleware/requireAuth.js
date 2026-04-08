import axios from 'axios';

const AUTH_CHECK_URL = process.env.AUTH_CHECK_URL;

/**
 * Verifies every request against the configured AUTH_CHECK_URL endpoint.
 * The endpoint is expected to return:
 *   200  — authenticated and authorised
 *   401  — not authenticated (no valid session)
 *   403  — authenticated but not authorised for this resource
 *
 * The user's Cookie header is forwarded so the upstream can validate
 * their WordPress (or other) session cookie.
 *
 * If AUTH_CHECK_URL is not set the middleware is a no-op, which makes
 * local development work without a WordPress instance.
 */
export default async function requireAuth(req, res, next) {
  if (!AUTH_CHECK_URL) return next();

  let status;
  try {
    const response = await axios.get(AUTH_CHECK_URL, {
      headers: {
        cookie: req.headers.cookie ?? '',
        'x-forwarded-for': req.headers['x-forwarded-for'] ?? req.socket.remoteAddress,
      },
      validateStatus: () => true, // never throw on any HTTP status
      timeout: 5000,
    });
    status = response.status;
  } catch {
    return res.status(503).json({ error: 'auth_unavailable' });
  }

  if (status === 200) return next();
  if (status === 403) return res.status(403).json({ error: 'forbidden' });
  return res.status(401).json({ error: 'unauthenticated' });
}
