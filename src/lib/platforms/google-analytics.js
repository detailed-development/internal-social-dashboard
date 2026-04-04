import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_PATH = join(__dirname, '../../../google-service-account.json');

function getClient() {
  const credentials = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  return new BetaAnalyticsDataClient({ credentials });
}

export async function syncGoogleAnalytics(prisma, client) {
  if (!client.gaPropertyId) return;

  const analytics = getClient();
  const propertyId = `properties/${client.gaPropertyId}`;

  // Fetch last 30 days of daily metrics
  const [dailyReport] = await analytics.runReport({
    property: propertyId,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' },
    ],
  });

  for (const row of dailyReport.rows || []) {
    const [year, month, day] = [
      row.dimensionValues[0].value.slice(0, 4),
      row.dimensionValues[0].value.slice(4, 6),
      row.dimensionValues[0].value.slice(6, 8),
    ];
    const date = new Date(`${year}-${month}-${day}`);
    const [sessions, users, newUsers, pageviews, bounceRate, avgDuration] = row.metricValues.map(m => m.value);

    await prisma.webAnalytic.upsert({
      where: { clientId_date_source_medium: { clientId: client.id, date, source: 'all', medium: 'all' } },
      update: {
        sessions:            parseInt(sessions),
        users:               parseInt(users),
        newUsers:            parseInt(newUsers),
        pageviews:           parseInt(pageviews),
        bounceRate:          parseFloat(bounceRate),
        avgSessionDuration:  parseFloat(avgDuration),
      },
      create: {
        clientId:            client.id,
        date,
        source:              'all',
        medium:              'all',
        sessions:            parseInt(sessions),
        users:               parseInt(users),
        newUsers:            parseInt(newUsers),
        pageviews:           parseInt(pageviews),
        bounceRate:          parseFloat(bounceRate),
        avgSessionDuration:  parseFloat(avgDuration),
      },
    });
  }

  // Fetch traffic source breakdown (last 30 days aggregated)
  const [sourceReport] = await analytics.runReport({
    property: propertyId,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const row of sourceReport.rows || []) {
    const source = row.dimensionValues[0].value || '(direct)';
    const medium = row.dimensionValues[1].value || '(none)';
    const [sessions, users, pageviews] = row.metricValues.map(m => m.value);

    await prisma.webAnalytic.upsert({
      where: { clientId_date_source_medium: { clientId: client.id, date: today, source, medium } },
      update: { sessions: parseInt(sessions), users: parseInt(users), pageviews: parseInt(pageviews) },
      create: {
        clientId: client.id,
        date:     today,
        source,
        medium,
        sessions:  parseInt(sessions),
        users:     parseInt(users),
        newUsers:  0,
        pageviews: parseInt(pageviews),
      },
    });
  }

  console.log(`    GA4 synced: ${client.name} (property ${client.gaPropertyId})`);
}
