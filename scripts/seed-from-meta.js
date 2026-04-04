import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TOKEN = process.env.META_USER_TOKEN;

if (!TOKEN) {
  console.error('ERROR: Set META_USER_TOKEN environment variable');
  process.exit(1);
}

const GRAPH = 'https://graph.facebook.com/v19.0';

const COLORS = [
  '#6366f1', '#f43f5e', '#0ea5e9', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#3b82f6',
  '#22c55e', '#a855f7', '#06b6d4',
];

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('Fetching pages from Meta Graph API...\n');

  const res = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username,name,followers_count}&limit=50&access_token=${TOKEN}`
  );
  const json = await res.json();

  if (json.error) {
    console.error('Meta API error:', json.error.message);
    process.exit(1);
  }

  const pages = json.data;
  console.log(`Found ${pages.length} pages\n`);

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const slug = slugify(page.name);
    const color = COLORS[i % COLORS.length];

    const client = await prisma.client.upsert({
      where: { slug },
      update: { name: page.name.trim() },
      create: { name: page.name.trim(), slug, avatarColor: color },
    });
    console.log(`Client: ${client.name} (${slug})`);

    // Facebook Page account
    await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId: { platform: 'FACEBOOK', platformUserId: page.id },
      },
      update: {
        accessToken: page.access_token,
        tokenStatus: 'ACTIVE',
        displayName: page.name.trim(),
      },
      create: {
        clientId: client.id,
        platform: 'FACEBOOK',
        platformUserId: page.id,
        handle: slug,
        displayName: page.name.trim(),
        accessToken: page.access_token,
        tokenStatus: 'ACTIVE',
      },
    });
    console.log(`  + Facebook page: ${page.name}`);

    // Instagram Business Account (linked via page)
    const ig = page.instagram_business_account;
    if (ig) {
      await prisma.socialAccount.upsert({
        where: {
          platform_platformUserId: { platform: 'INSTAGRAM', platformUserId: ig.id },
        },
        update: {
          accessToken: page.access_token,
          tokenStatus: 'ACTIVE',
          followerCount: ig.followers_count || 0,
          displayName: ig.name,
        },
        create: {
          clientId: client.id,
          platform: 'INSTAGRAM',
          platformUserId: ig.id,
          handle: ig.username,
          displayName: ig.name,
          accessToken: page.access_token,
          tokenStatus: 'ACTIVE',
          followerCount: ig.followers_count || 0,
        },
      });
      console.log(`  + Instagram: @${ig.username} (${ig.followers_count} followers)`);
    }

    console.log('');
  }

  console.log('Done! All clients and accounts seeded.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
