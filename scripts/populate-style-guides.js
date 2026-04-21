/**
 * Populate style guides from brand guideline markdown files.
 * Reads markdown files from the Neon Cactus Brand Guidelines folder and
 * populates the ClientStyleGuide table via the API.
 *
 * Usage: node scripts/populate-style-guides.js
 */

import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const BRAND_GUIDELINES_DIR = '/Users/meeseeks4.0/Desktop/Neon Cactus Media/Brand Guidelines';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api';
const API_CLIENTS_ENDPOINT = `${API_BASE_URL}/clients`;

/**
 * Extract content between headers in markdown
 */
function extractSectionContent(markdown, sectionTitle) {
  const regex = new RegExp(
    `##\\s+${sectionTitle}.*?(?=##|$)`,
    'is'
  );
  const match = markdown.match(regex);
  return match ? match[0] : '';
}

/**
 * Parse color palette from markdown section
 * Expects a table with HEX and RGB values
 */
function parseColorPalette(markdown) {
  const colors = {
    primary: null,
    secondary: null,
    accent: null,
  };

  const lines = markdown.split('\n');
  let inTable = false;
  const tableRows = [];

  for (const line of lines) {
    if (line.includes('|') && line.includes('-')) {
      inTable = true;
      continue;
    }
    if (inTable && line.includes('|')) {
      tableRows.push(line);
    } else if (inTable && !line.includes('|')) {
      inTable = false;
    }
  }

  // Parse table rows
  for (const row of tableRows) {
    const cols = row.split('|').map(c => c.trim()).filter(c => c);
    if (cols.length >= 3) {
      const role = cols[0].toLowerCase();
      const hex = cols[2]; // Usually the HEX code column

      if (role.includes('primary') || role.includes('main')) {
        colors.primary = hex;
      } else if (role.includes('secondary') || role.includes('support')) {
        colors.secondary = hex;
      } else if (role.includes('accent') || role.includes('highlight')) {
        colors.accent = hex;
      }
    }
  }

  return colors;
}

/**
 * Parse typography section to extract font families
 */
function parseFonts(markdown) {
  const fonts = [];

  // Look for font names in bold or code blocks
  const fontMatches = markdown.match(/(?:\*\*|`)([\w\s]+)(?:\*\*|`)/g) || [];

  // Common font family patterns
  const patterns = [
    /(?:(?:\*\*|`)?)(Montserrat|Open Sans|Lora|Arial|Helvetica|Georgia|Times|Roboto|Inter|Poppins|Ubuntu)(?:(?:\*\*|`)?)/gi,
  ];

  for (const pattern of patterns) {
    const matches = markdown.match(pattern) || [];
    matches.forEach(m => {
      const clean = m.replace(/[\*`]/g, '').trim();
      if (clean && !fonts.includes(clean)) {
        fonts.push(clean);
      }
    });
  }

  return fonts.length > 0 ? fonts.join(', ') : null;
}

/**
 * Extract tone of voice section
 */
function parseToneOfVoice(markdown) {
  const toneSection = extractSectionContent(markdown, 'Tone of [Vv]oice');
  if (!toneSection) return null;

  // Extract bullet points and personality traits
  const lines = toneSection.split('\n').filter(line => line.trim());
  const toneLines = lines
    .filter(line => line.includes('-') || line.includes('*'))
    .slice(0, 5) // Take first 5 lines
    .map(line => line.replace(/^[-*]\s+/, '').trim())
    .filter(line => line);

  return toneLines.join('; ') || null;
}

/**
 * Extract do's and don'ts from all relevant sections
 */
function parseDosAndDonts(markdown) {
  const dos = [];
  const donts = [];

  // Look for "Do's and don'ts" sections throughout the document
  const doSections = markdown.match(/\*?Do['s]*\*?:.*?(?=\n\n|\*?Do[n't]*|##)/gis) || [];
  const dontSections = markdown.match(/\*?Don't['s]*\*?:.*?(?=\n\n|\*?Do|##)/gis) || [];

  // Parse do's
  for (const section of doSections) {
    const items = section
      .split('\n')
      .filter(line => line.trim() && line.includes('*'))
      .map(line => line.replace(/^[\*\s]+/, '').trim())
      .filter(line => line && !line.toLowerCase().includes("don't"))
      .slice(0, 5);
    dos.push(...items);
  }

  // Parse don'ts
  for (const section of dontSections) {
    const items = section
      .split('\n')
      .filter(line => line.trim() && line.includes('*'))
      .map(line => line.replace(/^[\*\s]+/, '').trim())
      .filter(line => line)
      .slice(0, 5);
    donts.push(...items);
  }

  return {
    dos: dos.length > 0 ? dos : null,
    donts: donts.length > 0 ? donts : null,
  };
}

/**
 * Parse a single brand guideline markdown file
 */
function parseGuideline(filePath, fileName) {
  const markdown = fs.readFileSync(filePath, 'utf-8');

  // Extract client slug from filename (e.g., "calm-paws.md" -> "calm-paws")
  const slug = path.basename(fileName, '.md');

  // Extract sections
  const colorSection = extractSectionContent(markdown, 'Colo[u]?r');
  const typographySection = extractSectionContent(markdown, 'Typography');
  const toneSection = extractSectionContent(markdown, 'Tone of [Vv]oice');

  const colors = parseColorPalette(colorSection);
  const fonts = parseFonts(typographySection);
  const toneOfVoice = parseToneOfVoice(markdown);
  const { dos, donts } = parseDosAndDonts(markdown);

  return {
    slug,
    fonts,
    primaryColors: colors.primary ? { hex: colors.primary } : null,
    secondaryColors: colors.secondary ? { hex: colors.secondary } : null,
    toneOfVoice,
    brandGuidelines: markdown.substring(0, 2000), // First 2000 chars as summary
    dos,
    donts,
    promptMarkdown: markdown,
  };
}

/**
 * Populate a single client's style guide via API
 */
async function populateStyleGuide(data) {
  try {
    const endpoint = `${API_CLIENTS_ENDPOINT}/${data.slug}/style-guide`;

    // Filter out null values to avoid overwriting with empty data
    const payload = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && key !== 'slug') {
        payload[key] = value;
      }
    });

    console.log(`  Updating ${data.slug}...`);
    const response = await axios.put(endpoint, payload);
    console.log(`  ✓ Successfully updated ${data.slug}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log(`  ⚠ Client not found: ${data.slug} (skipping)`);
    } else {
      console.error(`  ✗ Error updating ${data.slug}:`, error.message);
    }
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Populating Style Guides from Brand Guidelines\n');
  console.log(`Reading from: ${BRAND_GUIDELINES_DIR}`);
  console.log(`API endpoint: ${API_CLIENTS_ENDPOINT}\n`);

  // Get all markdown files
  const files = fs
    .readdirSync(BRAND_GUIDELINES_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md' && !f.includes('template'));

  if (files.length === 0) {
    console.error('No brand guideline files found!');
    process.exit(1);
  }

  console.log(`Found ${files.length} brand guideline files:\n`);

  let successful = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = path.join(BRAND_GUIDELINES_DIR, file);

    try {
      // Parse the guideline
      const parsed = parseGuideline(filePath, file);

      // Populate via API
      const result = await populateStyleGuide(parsed);

      if (result) {
        successful++;
      } else if (result === null) {
        skipped++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`✗ Error processing ${file}:`, error.message);
      failed++;
    }
  }

  console.log(`\n✨ Complete!\n`);
  console.log(`  Successful: ${successful}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total: ${files.length}\n`);
}

main().catch(console.error);
