import pkg from '@google-analytics/admin';
const { BetaAnalyticsAdminServiceClient } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KEY_PATH = join(__dirname, '../../../../google-service-account.json');

function getAdminClient() {
  const credentials = JSON.parse(readFileSync(KEY_PATH, 'utf8'));
  return new BetaAnalyticsAdminServiceClient({ credentials });
}

import { Router } from 'express';
const router = Router();

router.get('/', async (req, res) => {
  try {
    const admin = getAdminClient();
    // List all accounts first, then properties under each
    const [accounts] = await admin.listAccounts();
    let allProperties = [];
    for (const account of accounts || []) {
      const [props] = await admin.listProperties({ filter: `parent:${account.name}` });
      allProperties = allProperties.concat(props || []);
    }
    
    const mapped = allProperties.map(prop => ({
      id: prop.name.split('/').pop(), // extract property ID from 'properties/123456'
      displayName: prop.displayName,
      websiteUrl: prop.websiteUrl,
      timeZone: prop.timeZone,
      createTime: prop.createTime,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Error fetching GA4 properties:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch GA4 properties', 
      detail: err.message 
    });
  }
});

export default router;
