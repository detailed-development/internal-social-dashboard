import fs from 'fs';
import path from 'path';

const GRAPH = 'https://graph.facebook.com/v19.0';
const ENV_PATH = path.resolve(process.cwd(), '.env');

// Exchange any token for a fresh long-lived token using app credentials.
export async function exchangeToken() {
  const { META_APP_ID, META_APP_SECRET, META_USER_TOKEN } = process.env;

  if (!META_APP_ID || !META_APP_SECRET || !META_USER_TOKEN) {
    throw new Error('META_APP_ID, META_APP_SECRET, and META_USER_TOKEN must all be set in .env');
  }

  const url =
    `https://graph.facebook.com/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${META_APP_ID}` +
    `&client_secret=${META_APP_SECRET}` +
    `&fb_exchange_token=${META_USER_TOKEN}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.error) throw new Error(`Meta token exchange: ${json.error.message}`);
  return json.access_token;
}

// Exchange a provided short-lived token for a long-lived token.
// Use this when re-authorizing with new scopes — paste the fresh short-lived
// token from Graph API Explorer and this will return a 60-day token.
export async function exchangeTokenFrom(shortLivedToken) {
  const { META_APP_ID, META_APP_SECRET } = process.env;

  if (!META_APP_ID || !META_APP_SECRET) {
    throw new Error('META_APP_ID and META_APP_SECRET must be set in .env');
  }

  const url =
    `https://graph.facebook.com/oauth/access_token` +
    `?grant_type=fb_exchange_token` +
    `&client_id=${META_APP_ID}` +
    `&client_secret=${META_APP_SECRET}` +
    `&fb_exchange_token=${shortLivedToken}`;

  const res = await fetch(url);
  const json = await res.json();

  if (json.error) throw new Error(`Meta token exchange: ${json.error.message}`);
  return json.access_token;
}

// Write the new token to .env and update the running process.
export function persistToken(newToken) {
  let envContent = fs.readFileSync(ENV_PATH, 'utf8');
  if (/^META_USER_TOKEN=/m.test(envContent)) {
    envContent = envContent.replace(/^META_USER_TOKEN=.*/m, `META_USER_TOKEN=${newToken}`);
  } else {
    envContent += `\nMETA_USER_TOKEN=${newToken}`;
  }
  fs.writeFileSync(ENV_PATH, envContent, 'utf8');
  process.env.META_USER_TOKEN = newToken;
}

// Upsert every Facebook page + linked Instagram account using the given token.
export async function refreshAccounts(prisma, token) {
  const url = `${GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,followers_count}&limit=50&access_token=${token}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(`Meta API: ${json.error.message}`);

  const pages = json.data || [];
  const updated = [];
  const errors = [];

  for (const page of pages) {
    try {
      const fb = await prisma.socialAccount.upsert({
        where: { platform_platformUserId: { platform: 'FACEBOOK', platformUserId: page.id } },
        update: { accessToken: page.access_token, tokenStatus: 'ACTIVE', displayName: page.name },
        create: {
          platform: 'FACEBOOK',
          platformUserId: page.id,
          handle: page.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          displayName: page.name.trim(),
          accessToken: page.access_token,
          tokenStatus: 'ACTIVE',
          clientId: await resolveClientId(prisma, page.name),
        },
      });
      updated.push({ platform: 'FACEBOOK', handle: fb.handle, name: page.name });

      const ig = page.instagram_business_account;
      if (ig) {
        const igAccount = await prisma.socialAccount.upsert({
          where: { platform_platformUserId: { platform: 'INSTAGRAM', platformUserId: ig.id } },
          update: {
            accessToken: page.access_token,
            tokenStatus: 'ACTIVE',
            followerCount: ig.followers_count || 0,
            displayName: ig.name,
          },
          create: {
            platform: 'INSTAGRAM',
            platformUserId: ig.id,
            handle: ig.username,
            displayName: ig.name,
            accessToken: page.access_token,
            tokenStatus: 'ACTIVE',
            followerCount: ig.followers_count || 0,
            clientId: await resolveClientId(prisma, page.name),
          },
        });
        updated.push({ platform: 'INSTAGRAM', handle: igAccount.handle, name: ig.name });
      }
    } catch (err) {
      errors.push({ name: page.name, error: err.message });
    }
  }

  return { updated, errors, total: pages.length };
}

// Full orchestration: exchange → persist → upsert accounts.
export async function runFullRefresh(prisma) {
  const newToken = await exchangeToken();
  persistToken(newToken);
  return refreshAccounts(prisma, newToken);
}

async function resolveClientId(prisma, pageName) {
  const slug = pageName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const bySlug = await prisma.client.findUnique({ where: { slug } });
  if (bySlug) return bySlug.id;

  const byName = await prisma.client.findFirst({
    where: { name: { contains: pageName.split(' ')[0], mode: 'insensitive' } },
  });
  if (byName) return byName.id;

  const first = await prisma.client.findFirst({ orderBy: { name: 'asc' } });
  return first?.id;
}
