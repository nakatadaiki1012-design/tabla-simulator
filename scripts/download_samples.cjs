const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const sounds = [
  { id: '130430', name: 'tas_3', bol: 'na', role: 'dayan_rim_3' },
  { id: '130429', name: 'te', bol: 'te', role: 'dayan_te_1' },
  { id: '130428', name: 'na_sharp', bol: 'na', role: 'dayan_na_sharp' },
  { id: '130427', name: 're', bol: 're', role: 'dayan_re_1' },
  { id: '130426', name: 'tas', bol: 'na', role: 'dayan_na_open' },
  { id: '130425', name: 'tas_2', bol: 'na', role: 'dayan_rim_2' },
  { id: '130424', name: 'ke_2', bol: 'ke', role: 'bayan_ke_2' },
  { id: '130423', name: 'ke_3', bol: 'ke', role: 'bayan_ke_3' },
  { id: '130422', name: 'na-open', bol: 'tin', role: 'dayan_tin' },
  { id: '130421', name: 'na', bol: 'na', role: 'dayan_na_main' },
  { id: '130420', name: 'tun_3', bol: 'tun', role: 'dayan_tun_3' },
  { id: '130419', name: 'tun_2', bol: 'tun', role: 'dayan_tun_2' },
  { id: '130418', name: 'te_2', bol: 'te', role: 'dayan_te_2' },
  { id: '130417', name: 'te_ne', bol: 'te', role: 'dayan_te_roll' },
  { id: '130416', name: 'tun', bol: 'tun', role: 'dayan_tun_main' },
  { id: '130415', name: 'te_middlefinger', bol: 'te', role: 'dayan_te_mid' },
  { id: '130414', name: 'ghe_8', bol: 'meend', role: 'bayan_meend_high' },
  { id: '130413', name: 'ke', bol: 'ke', role: 'bayan_ke_main' },
  { id: '130411', name: 'ghe_4', bol: 'ge', role: 'bayan_ge_4' },
  { id: '130410', name: 'ghe_5', bol: 'ge', role: 'bayan_ge_5' },
  { id: '130409', name: 'ghe_6', bol: 'ge', role: 'bayan_ge_6' },
  { id: '130408', name: 'ghe_7', bol: 'meend', role: 'bayan_meend_main' },
  { id: '130407', name: 'dhec', bol: 'dha', role: 'both_dha_main' },
  { id: '130406', name: 'ghe', bol: 'ge', role: 'bayan_ge_main' },
  { id: '130405', name: 'ghe_2', bol: 'ge', role: 'bayan_ge_2' },
  { id: '130404', name: 'ghe_3', bol: 'ge', role: 'bayan_ge_3' }
];

const destDir = path.join(__dirname, '..', 'public', 'samples', 'freesound');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Node.js)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetch(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode} for ${url}`));
      }
      resolve(res);
    }).on('error', reject);
  });
}

function getBody(res) {
  return new Promise((resolve, reject) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
    res.on('error', reject);
  });
}

function downloadBinary(url, dest) {
  return new Promise((resolve, reject) => {
    fetch(url).then(res => {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve(true));
      });
      file.on('error', reject);
    }).catch(reject);
  });
}

async function processAll() {
  const manifest = [];
  console.log(`Starting download of ${sounds.length} tabla samples from freesound.org...`);

  for (const s of sounds) {
    const pageUrl = `https://freesound.org/s/${s.id}/`;
    try {
      const pageRes = await fetch(pageUrl);
      const html = await getBody(pageRes);
      
      // Look for og:audio or cdn preview
      const match = html.match(/https:\/\/cdn\.freesound\.org\/previews\/[0-9]+\/[0-9]+_[0-9]+-(hq|lq)\.mp3/i);
      if (!match) {
        console.warn(`Could not find preview URL for sound ${s.id} (${s.name})`);
        continue;
      }

      // Prefer hq if available
      let audioUrl = match[0].replace('-lq.mp3', '-hq.mp3');
      const filename = `${s.name}.mp3`;
      const filePath = path.join(destDir, filename);

      console.log(`Downloading ${s.name} (${s.id}) from ${audioUrl}...`);
      await downloadBinary(audioUrl, filePath);
      
      const stats = fs.statSync(filePath);
      console.log(`Saved ${filename} (${stats.size} bytes)`);

      manifest.push({
        id: s.id,
        name: s.name,
        bol: s.bol,
        role: s.role,
        file: `/samples/freesound/${filename}`,
        size: stats.size
      });
    } catch (err) {
      console.error(`Error processing ${s.id}:`, err.message);
    }
  }

  const manifestPath = path.join(destDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Successfully generated manifest with ${manifest.length} samples at ${manifestPath}`);
}

processAll();
