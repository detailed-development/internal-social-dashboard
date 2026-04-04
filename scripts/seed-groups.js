import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GROUPS = [
  { name: 'Acorn Pet Products', slug: 'acorn-pet-products-group', avatarColor: '#f97316', sortOrder: 1 },
  { name: 'Mpet',               slug: 'mpet-group',               avatarColor: '#0ea5e9', sortOrder: 2 },
  { name: 'Dog Rescues',        slug: 'dog-rescues-group',        avatarColor: '#f43f5e', sortOrder: 3 },
  { name: 'Music',              slug: 'music-group',              avatarColor: '#8b5cf6', sortOrder: 4 },
  { name: 'Unsorted',           slug: 'unsorted-group',           avatarColor: '#94a3b8', sortOrder: 99 },
];

// Map client slugs → group slug
const ASSIGNMENTS = {
  'acorn-pet-products-group': [
    'acorn-pet-products', 'calm-paws', 'cp-basics', 'kodiak-naturals', 'pet-source-enterprise',
  ],
  'mpet-group': [
    'collachews', 'prohide', 'righthide', 'truranch',
  ],
  'dog-rescues-group': [
    'heidi-s-village', 'one-love-arizona',
  ],
  'music-group': [
    'circuit', 'futurephonic-records', 'juheun', 'michelle-sparks', 'music-plus', 'tranzithouse',
  ],
  'unsorted-group': [
    'arizona-studios', 'copper-canyon-building-solutions', 'neon-cactus-media',
    'rc-gorman-navajo-gallery', 'subliminal-veg', 'the-symposium-club', 'true-roots',
  ],
};

// New clients to create
const NEW_CLIENTS = [
  { name: 'ProHide',          slug: 'prohide',          avatarColor: '#06b6d4' },
  { name: 'RightHide',        slug: 'righthide',        avatarColor: '#14b8a6' },
  { name: 'One Love Arizona', slug: 'one-love-arizona', avatarColor: '#ec4899' },
];

// Clients to remove
const REMOVE_SLUGS = ['calm-paws-essential-oils', 'theblindhobo', 'mpet'];

async function main() {
  // Remove unwanted clients
  const removed = await prisma.client.deleteMany({ where: { slug: { in: REMOVE_SLUGS } } });
  console.log(`Removed ${removed.count} client(s)\n`);

  // Create new clients
  for (const c of NEW_CLIENTS) {
    await prisma.client.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: { name: c.name, slug: c.slug, avatarColor: c.avatarColor },
    });
    console.log(`  + Client: ${c.name}`);
  }

  // Create groups
  console.log('\nCreating groups...');
  const groupMap = {};
  for (const g of GROUPS) {
    const group = await prisma.clientGroup.upsert({
      where: { slug: g.slug },
      update: { name: g.name, avatarColor: g.avatarColor, sortOrder: g.sortOrder },
      create: g,
    });
    groupMap[g.slug] = group.id;
    console.log(`  + Group: ${g.name}`);
  }

  // Assign clients to groups
  console.log('\nAssigning clients to groups...');
  for (const [groupSlug, clientSlugs] of Object.entries(ASSIGNMENTS)) {
    const groupId = groupMap[groupSlug];
    for (const clientSlug of clientSlugs) {
      const result = await prisma.client.updateMany({
        where: { slug: clientSlug },
        data: { groupId },
      });
      if (result.count === 0) {
        console.log(`  WARN: client not found — ${clientSlug}`);
      } else {
        console.log(`  ${clientSlug} → ${groupSlug}`);
      }
    }
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
