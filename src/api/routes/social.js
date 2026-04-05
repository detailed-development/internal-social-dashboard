import { Router } from 'express';
import axios from 'axios';

const router = Router();

/**
 * GET /api/social/lookup?platform=INSTAGRAM&handle=foo
 *
 * Fetches publicly available profile info for an Instagram or Facebook handle
 * without requiring an API token. Returns best-effort data; some fields may
 * be missing if the platform blocks the request.
 *
 * Response: { handle, displayName, followerCount, bio, avatarUrl }
 */
router.get('/lookup', async (req, res) => {
  const { platform, handle } = req.query;

  if (!platform || !handle) {
    return res.status(400).json({ error: 'platform and handle are required' });
  }

  const normalized = handle.replace(/^@/, '').trim();

  try {
    if (platform === 'INSTAGRAM') {
      const data = await lookupInstagram(normalized);
      return res.json(data);
    }

    if (platform === 'FACEBOOK') {
      const data = await lookupFacebook(normalized);
      return res.json(data);
    }

    return res.status(400).json({ error: 'Lookup not supported for this platform' });
  } catch (err) {
    // Return a partial result rather than an error so the UI can still show something
    return res.json({ handle: normalized });
  }
});

async function lookupInstagram(handle) {
  // Instagram's internal web API – works for public profiles without auth
  const response = await axios.get(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'X-IG-App-ID': '936619743392459',
        'Referer': 'https://www.instagram.com/',
      },
      timeout: 8000,
    }
  );

  const user = response.data?.data?.user;
  if (!user) throw new Error('No user data returned');

  return {
    handle,
    displayName: user.full_name || handle,
    followerCount: user.edge_followed_by?.count ?? null,
    bio: user.biography || null,
    avatarUrl: user.profile_pic_url_hd || user.profile_pic_url || null,
  };
}

async function lookupFacebook(handle) {
  // Scrape Open Graph tags from the public Facebook page
  const response = await axios.get(
    `https://www.facebook.com/${encodeURIComponent(handle)}`,
    {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
    }
  );

  const html = response.data;

  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+property="og:title"/i);
  const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
  const descMatch  = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+content="([^"]+)"\s+property="og:description"/i);

  const displayName = titleMatch ? decodeHtmlEntities(titleMatch[1]) : handle;
  const avatarUrl   = imageMatch ? imageMatch[1] : null;
  const bio         = descMatch  ? decodeHtmlEntities(descMatch[1]) : null;

  // Facebook og:description sometimes contains "X likes · X followers · ..."
  let followerCount = null;
  if (bio) {
    const followerMatch = bio.match(/([0-9,]+)\s+followers/i);
    if (followerMatch) followerCount = parseInt(followerMatch[1].replace(/,/g, ''), 10);
  }

  return { handle, displayName, followerCount, bio: followerCount ? null : bio, avatarUrl };
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

export default router;
