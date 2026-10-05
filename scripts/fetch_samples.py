#!/usr/bin/env python3
import urllib.request
import re
import os
import json

sounds = [
  {"id": "130430", "name": "tas_3", "bol": "na", "label": "Tas (Rim 3)"},
  {"id": "130429", "name": "te", "bol": "te", "label": "Te (Mute Main)"},
  {"id": "130428", "name": "na_sharp", "bol": "na", "label": "Na (Sharp Kinar)"},
  {"id": "130427", "name": "re", "bol": "re", "label": "Re (Index Mute)"},
  {"id": "130426", "name": "tas", "bol": "na", "label": "Tas (Rim Main)"},
  {"id": "130425", "name": "tas_2", "bol": "na", "label": "Tas (Rim 2)"},
  {"id": "130424", "name": "ke_2", "bol": "ke", "label": "Ke (Slap 2)"},
  {"id": "130423", "name": "ke_3", "bol": "ke", "label": "Ke (Slap 3)"},
  {"id": "130422", "name": "na-open", "bol": "tin", "label": "Na Open / Tin"},
  {"id": "130421", "name": "na", "bol": "na", "label": "Na (Canonical)"},
  {"id": "130420", "name": "tun_3", "bol": "tun", "label": "Tun (Bell 3)"},
  {"id": "130419", "name": "tun_2", "bol": "tun", "label": "Tun (Bell 2)"},
  {"id": "130418", "name": "te_2", "bol": "te", "label": "Te (Mute 2)"},
  {"id": "130417", "name": "te_ne", "bol": "te", "label": "Te-Ne (Roll)"},
  {"id": "130416", "name": "tun", "bol": "tun", "label": "Tun (Canonical Bell)"},
  {"id": "130415", "name": "te_middlefinger", "bol": "te", "label": "Te (Middle Finger)"},
  {"id": "130414", "name": "ghe_8", "bol": "meend", "label": "Ghe 8 (High Bend)"},
  {"id": "130413", "name": "ke", "bol": "ke", "label": "Ke (Canonical Slap)"},
  {"id": "130411", "name": "ghe_4", "bol": "ge", "label": "Ghe 4 (Resonant Bass)"},
  {"id": "130410", "name": "ghe_5", "bol": "ge", "label": "Ghe 5 (Resonant Bass)"},
  {"id": "130409", "name": "ghe_6", "bol": "ge", "label": "Ghe 6 (Deep Bass)"},
  {"id": "130408", "name": "ghe_7", "bol": "meend", "label": "Ghe 7 (Meend Slide)"},
  {"id": "130407", "name": "dhec", "bol": "dha", "label": "Dha / Dhec (Composite)"},
  {"id": "130406", "name": "ghe", "bol": "ge", "label": "Ghe (Canonical Bass)"},
  {"id": "130405", "name": "ghe_2", "bol": "ge", "label": "Ghe 2 (Bass Alt)"},
  {"id": "130404", "name": "ghe_3", "bol": "ge", "label": "Ghe 3 (Bass Alt 2)"}
]

out_dir = os.path.join(os.getcwd(), "public", "samples", "freesound")
os.makedirs(out_dir, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
manifest = []

print(f"Fetching {len(sounds)} Freesound tabla samples into {out_dir}...")

for s in sounds:
    sid = s["id"]
    sname = s["name"]
    page_url = f"https://freesound.org/s/{sid}/"
    try:
        req = urllib.request.Request(page_url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
        
        m = re.search(r'https://cdn\.freesound\.org/previews/\d+/\d+_\d+-(hq|lq)\.mp3', html)
        if not m:
            print(f"Warning: Could not find audio preview URL for {sid} ({sname})")
            continue
        
        lq_url = m.group(0)
        hq_url = lq_url.replace("-lq.mp3", "-hq.mp3")
        target_path = os.path.join(out_dir, f"{sname}.mp3")
        
        # Try HQ first
        try:
            req_audio = urllib.request.Request(hq_url, headers=headers)
            with urllib.request.urlopen(req_audio, timeout=15) as aresp:
                with open(target_path, "wb") as f:
                    f.write(aresp.read())
            quality = "HQ"
        except Exception:
            req_audio = urllib.request.Request(lq_url, headers=headers)
            with urllib.request.urlopen(req_audio, timeout=15) as aresp:
                with open(target_path, "wb") as f:
                    f.write(aresp.read())
            quality = "LQ"
        
        size = os.path.getsize(target_path)
        print(f"✓ Downloaded {sname}.mp3 ({quality}, {size} bytes) for bol [{s['bol']}]")
        manifest.append({
            "id": sid,
            "name": sname,
            "bol": s["bol"],
            "label": s["label"],
            "file": f"/samples/freesound/{sname}.mp3",
            "size": size
        })
    except Exception as e:
        print(f"✗ Failed {sid} ({sname}): {e}")

manifest_path = os.path.join(out_dir, "manifest.json")
with open(manifest_path, "w", encoding="utf-8") as f:
    json.dump(manifest, f, indent=2, ensure_ascii=False)

print(f"\nFinished! Successfully saved {len(manifest)} samples with manifest at {manifest_path}")
