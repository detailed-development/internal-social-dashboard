import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COLORS = ['#f97316', '#84cc16', '#06b6d4', '#d946ef', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#f43f5e', '#0ea5e9'];

// Complete client registry — GA4 property IDs, GTM container IDs, and website URLs
const CLIENTS = [
  // Existing clients with GA4 + GTM
  { name: 'Acorn Pet Products',     slug: 'acorn-pet-products',     gaPropertyId: '400276658', gtmContainerId: 'GTM-52QBZWSX', websiteUrl: 'https://acornpetproducts.com' },
  { name: 'Calm Paws',              slug: 'calm-paws',              gaPropertyId: '398792965', gtmContainerId: 'GTM-K87NXGMP', websiteUrl: 'https://calmpaws.com' },
  { name: 'Calm Paws Essential Oils', slug: 'calm-paws-essential-oils', gaPropertyId: '398795584', gtmContainerId: null,       websiteUrl: null },
  { name: 'Circuit',                slug: 'circuit',                gaPropertyId: '398145596', gtmContainerId: 'GTM-TJB3FGJM', websiteUrl: 'https://circuitaz.com' },
  { name: 'CollaChews',             slug: 'collachews',             gaPropertyId: '398795251', gtmContainerId: 'GTM-N3FVBFNF', websiteUrl: 'https://collachews.com' },
  { name: 'Copper Canyon Building Solutions', slug: 'copper-canyon-building-solutions', gaPropertyId: '456339051', gtmContainerId: 'GTM-P79HV89P', websiteUrl: 'https://coppercanyonbuildingsolutions.com' },
  { name: 'Futurephonic Records',   slug: 'futurephonic-records',   gaPropertyId: '406110167', gtmContainerId: 'GTM-5J665FHF', websiteUrl: 'https://futurephonicrecords.com' },
  { name: "Heidi's Village",        slug: 'heidi-s-village',        gaPropertyId: '481926619', gtmContainerId: 'GTM-5GMZ2CL6', websiteUrl: 'https://heidisvillage.org' },
  { name: 'Juheun',                 slug: 'juheun',                 gaPropertyId: '398795147', gtmContainerId: 'GTM-WX7SWMJ9', websiteUrl: 'https://juheun.com' },
  { name: 'Kodiak Naturals',        slug: 'kodiak-naturals',        gaPropertyId: '398788129', gtmContainerId: 'GTM-TH6PJSXS', websiteUrl: 'https://kodiaknaturals.com' },
  { name: 'Michelle Sparks',        slug: 'michelle-sparks',        gaPropertyId: '398781147', gtmContainerId: 'GTM-TC55B4SX', websiteUrl: 'https://michelle-sparks.com' },
  { name: 'MUSIC+',                 slug: 'music-plus',             gaPropertyId: '516623095', gtmContainerId: null,           websiteUrl: null },
  { name: 'Neon Cactus Media',      slug: 'neon-cactus-media',      gaPropertyId: '398790319', gtmContainerId: 'GTM-K8P282FP', websiteUrl: 'https://neoncactusmedia.com' },
  { name: 'Pet Source Enterprise',  slug: 'pet-source-enterprise',  gaPropertyId: '398817584', gtmContainerId: 'GTM-PXQCG8DP', websiteUrl: 'https://petsourceenterprise.com' },
  { name: 'RC Gorman Navajo Gallery', slug: 'rc-gorman-navajo-gallery', gaPropertyId: '412164668', gtmContainerId: null,       websiteUrl: null },
  { name: 'The Symposium Club',     slug: 'the-symposium-club',     gaPropertyId: '514316027', gtmContainerId: null,           websiteUrl: null },
  { name: 'Tranzithouse',           slug: 'tranzithouse',           gaPropertyId: '457559495', gtmContainerId: null,           websiteUrl: null },
  { name: 'True Roots',             slug: 'true-roots',             gaPropertyId: '398788290', gtmContainerId: null,           websiteUrl: null },
  { name: 'TruRanch',               slug: 'truranch',               gaPropertyId: '398774297', gtmContainerId: null,           websiteUrl: null },
];

async function main() {
  console.log('Seeding client registry...\n');

  // Remove clients that should no longer exist
  const removed = await prisma.client.deleteMany({ where: { slug: { in: ['theblindhobo'] } } });
  if (removed.count > 0) console.log(`  Removed ${removed.count} client(s)\n`);

  for (let i = 0; i < CLIENTS.length; i++) {
    const { name, slug, gaPropertyId, gtmContainerId, websiteUrl } = CLIENTS[i];

    const client = await prisma.client.upsert({
      where: { slug },
      update: {
        ...(gaPropertyId   && { gaPropertyId }),
        ...(gtmContainerId && { gtmContainerId }),
        ...(websiteUrl     && { websiteUrl }),
      },
      create: {
        name,
        slug,
        avatarColor: COLORS[i % COLORS.length],
        gaPropertyId:   gaPropertyId   || null,
        gtmContainerId: gtmContainerId || null,
        websiteUrl:     websiteUrl     || null,
      },
    });

    const tags = [
      gaPropertyId   ? `GA4: ${gaPropertyId}`    : null,
      gtmContainerId ? `GTM: ${gtmContainerId}`   : null,
      websiteUrl     ? websiteUrl                  : null,
    ].filter(Boolean).join(' | ');

    console.log(`  ${client.name.padEnd(40)} ${tags}`);
  }

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
