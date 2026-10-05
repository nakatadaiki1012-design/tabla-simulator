#!/usr/bin/env bash
set -e

mkdir -p public/samples/freesound

sounds=(
  "130430:tas_3:na"
  "130429:te:te"
  "130428:na_sharp:na"
  "130427:re:re"
  "130426:tas:na"
  "130425:tas_2:na"
  "130424:ke_2:ke"
  "130423:ke_3:ke"
  "130422:na-open:tin"
  "130421:na:na"
  "130420:tun_3:tun"
  "130419:tun_2:tun"
  "130418:te_2:te"
  "130417:te_ne:te"
  "130416:tun:tun"
  "130415:te_middlefinger:te"
  "130414:ghe_8:meend"
  "130413:ke:ke"
  "130411:ghe_4:ge"
  "130410:ghe_5:ge"
  "130409:ghe_6:ge"
  "130408:ghe_7:meend"
  "130407:dhec:dha"
  "130406:ghe:ge"
  "130405:ghe_2:ge"
  "130404:ghe_3:ge"
)

echo "Starting download of ${#sounds[@]} samples..."

for item in "${sounds[@]}"; do
  IFS=":" read -r id name bol <<< "$item"
  echo "Fetching sound $id ($name)..."
  page_url="https://freesound.org/s/${id}/"
  
  lq_url=$(curl -s -L "$page_url" | grep -o 'https://cdn.freesound.org/previews/[^"'"']*\-lq\.mp3' | head -n 1)
  if [ -z "$lq_url" ]; then
    echo "Warning: No preview URL found for $id"
    continue
  fi

  hq_url="${lq_url/-lq.mp3/-hq.mp3}"
  dest="public/samples/freesound/${name}.mp3"
  
  # Try HQ first, fallback to LQ if HTTP status != 200
  if curl -s -f "$hq_url" -o "$dest"; then
    echo "Saved $name (HQ): $(wc -c < "$dest") bytes"
  else
    curl -s -f "$lq_url" -o "$dest"
    echo "Saved $name (LQ): $(wc -c < "$dest") bytes"
  fi
done

echo "Download completed. Generating manifest.json..."
node -e "
const fs = require('fs');
const path = require('path');
const dir = 'public/samples/freesound';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));
const manifest = files.map(f => {
  const name = f.replace('.mp3', '');
  return {
    name,
    file: '/samples/freesound/' + f,
    size: fs.statSync(path.join(dir, f)).size
  };
});
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Manifest created with ' + manifest.length + ' files');
"
