# ⚡ AI-Cockpit v578 (Modulär GitHub & Cloudflare Pages-utgåva)

Detta arkiv innehåller den kompletta, modulärt uppdelade **AI-Cockpit v578** (100 % identisk funktionalitet med All-In-One-versionen, men uppdelad i rena moduler för snabb laddning, webbläsarcache och enkel vidareutveckling).

## 📂 Filstruktur (450 910 bytes totalt)

```text
├── index.html                  # Själva gränssnittet, sidomenyn och alla 14 modaler (106,7 KB)
├── style.css                   # All design, Guld/Silver/Brons-teman, Norton Commander & Intercom (41,8 KB)
├── README.md                   # Denna guide (2,1 KB)
└── js/
    ├── 01_core_chat.js         # Prislistor, PromptMotorn, AI-anrop, Långtidsminne & RAM-cachad metrik (103,2 KB)
    ├── 02_storage_sync.js      # Kvotsäkrad sparning (IndexedDB för 25MB+ Takeout) & krocksäker Takeout-import (29,1 KB)
    ├── 03_search_detective.js  # 3-stegs Sökdetektiven (En enda promptruta ➔ 4.0 Argon ➔ JS Blodhund ➔ Flash-Lite) (19,9 KB)
    ├── 04_norton_commander.js  # Dual-Pane Extreme Editing Mode för desktop (F1–F10 & högerklick) (15,1 KB)
    ├── 05_cleanup_ux.js        # Städpatrullen (Grön/Gul/Röd zon), Google Drive Multi-file Synk & Specialstudior (81,0 KB)
    ├── 06_tree_triage.js       # Trädrendering, Ursprungsskyltar (GEM/GPT/CLD), 0ms Släggsök & Auto-triage (18,6 KB)
    └── 07_intercom_app.js      # Intercom Bil-läge, 45s följdfrågefönster, OCR-vakthund & dubbel röstmotor (33,5 KB)
```

## 🚀 Så lägger du upp detta på GitHub & Cloudflare Pages

1. Packa upp denna `.zip`-fil i en mapp på din dator.
2. Skapa ett privat repository på [github.com](https://github.com) (t.ex. `ai-cockpit`).
3. Välj **Add file ➔ Upload files** på GitHub och dra in `index.html`, `style.css`, `README.md` samt hela mappen `js/` (så att mappstrukturen `js/01_core_chat.js` osv. bevaras).
4. Klicka på **Commit changes**.
5. I **Cloudflare Pages** väljer du **Connect to Git**, pekar på `ai-cockpit` och trycker **Save and Deploy**!
