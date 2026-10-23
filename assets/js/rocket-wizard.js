/**
 * AI-Cockpit — Trestegsraketen & Human-in-the-Loop Triage (assets/js/rocket-wizard.js)
 */
window.CockpitRocket = {
  rawTakeoutBlocks: [],
  triageCandidates: [],
  currentFilter: 'all',
  spentTokens: 0,

  loadSampleTakeoutDump() {
    this.rawTakeoutBlocks = [
      {
        rawId: 'raw_101',
        timestamp: '2026-09-14 21:10',
        exchanges: [
          { role: 'user', text: 'Hur sätter jag upp en Cloudflare Worker som validerar JWT-tokens mot Supabase?' },
          { role: 'model', text: 'Du kan använda Web Crypto API direkt i din Cloudflare Worker för att verifiera JWT-signaturen...' },
          { role: 'user', text: 'och sen kommer draken ner i grottan och jag tar fram mitt diamantsvärd och ropar akta er riddare' },
          { role: 'model', text: 'Draken vrålar så att stalaktiterna skakar i grottan! Riddarna tar skydd bakom sköldarna...' },
          { role: 'user', text: 'Tack! Hur cachar jag sedan svaret i Cloudflare KV i 60 sekunder?' },
          { role: 'model', text: 'Använd env.MY_KV.put(key, value, { expirationTtl: 60 }) i din Worker.' }
        ]
      },
      {
        rawId: 'raw_102',
        timestamp: '2026-09-18 14:20',
        exchanges: [
          { role: 'user', text: 'Jag ska bokföra månadens Uber- och Bolt-intäkter i Spiris. Vilket konto lägger jag serviceavgiften på?' },
          { role: 'model', text: 'Plattformsavgifterna bokförs normalt som försäljningsomkostnader/förmedlingsavgifter med omvänd skattskyldighet...' }
        ]
      },
      {
        rawId: 'raw_103',
        timestamp: '2026-09-22 19:05',
        exchanges: [
          { role: 'user', text: 'I vårt 2D-plattformsspel i GDevelop fastnar Leos karaktär-sprite i väggen när man hoppar.' },
          { role: 'model', text: 'Kontrollera hitbox-polygonen på spriten i GDevelop så att den inte sticker ut vid animationsbyte.' },
          { role: 'user', text: 'Fresten, kan man blanda kokt torsk, potatis och grädde direkt i en soppshake för att ta med i bilen?' },
          { role: 'model', text: 'Absolut, en varm eller ljummen fisk-soppshake i termos fungerar utmärkt under långa körpass!' }
        ]
      }
    ];

    document.getElementById('triageList').innerHTML = `
      <div class="triage-card">
        <strong>✅ 3 råa Takeout-block inlästa i Trestegsraketen (inkl. Leo-röstinmatning & ämneshopp)</strong>
        <p style="font-size:0.84rem; color:var(--text-muted);">
          Klicka nu på <strong>"Kör Steg 1 (Flash-Lite Grovklyvning)"</strong> till vänster för att se hur osäkra noder gulflaggas.
        </p>
      </div>
    `;
  },

  loadWizardRawFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed.conversations) {
          const grok = CockpitImporters.parseGrokTakeout(parsed);
          this.triageCandidates = grok.map(g => ({
            id: g.id,
            title: g.title,
            folder: g.folder,
            confidence: 'high',
            note: 'Identifierad som ren Grok-tråd.',
            messages: g.messages
          }));
          this.renderTriageList();
        } else {
          this.loadSampleTakeoutDump();
        }
      } catch {
        this.loadSampleTakeoutDump();
      }
    };
    reader.readAsText(file);
  },

  runRocketStage(stage) {
    if (this.rawTakeoutBlocks.length === 0) {
      this.loadSampleTakeoutDump();
    }

    document.getElementById('stagePill1').classList.toggle('active', stage === 1);
    document.getElementById('stagePill2').classList.toggle('active', stage === 2);
    document.getElementById('stagePill3').classList.toggle('active', stage === 3);

    if (stage === 1) {
      this.spentTokens += 1420;
      this.triageCandidates = [
        {
          id: 'cand_1',
          title: 'Bokföring av Uber & Bolt i Spiris',
          folder: 'Företag / Ekonomi',
          confidence: 'high',
          note: 'Steg 1 (Flash-Lite): Solklar och sammanhängande tråd. Grönflaggad.',
          messages: this.rawTakeoutBlocks[1].exchanges.map((x, i) => ({
            id: 'c1_' + i, role: x.role, text: x.text, timestamp: Date.now(), inContext: true
          }))
        },
        {
          id: 'cand_2',
          title: 'Cloudflare Workers + Plötsligt Drak-rollspel?!',
          folder: 'Programmering / Backend',
          confidence: 'uncertain',
          ambiguityType: 'leo_intrusion',
          note: '⚠️ Steg 1 (Flash-Lite): OSÄKER! Mitt i teknisk diskussion om Cloudflare dyker talspråk om drakar och riddare upp. Eskalera till Steg 2 eller knoppa av.',
          messages: this.rawTakeoutBlocks[0].exchanges.map((x, i) => ({
            id: 'c2_' + i, role: x.role, text: x.text, timestamp: Date.now(), inContext: true
          }))
        },
        {
          id: 'cand_3',
          title: 'GDevelop Hitbox & Fisk-soppshake',
          folder: 'Projekt / Blandat',
          confidence: 'uncertain',
          ambiguityType: 'topic_jump',
          note: '⚠️ Steg 1 (Flash-Lite): OSÄKER! Två helt olika domäner i samma block (Spelutveckling -> Matlagning/Soppshake).',
          messages: this.rawTakeoutBlocks[2].exchanges.map((x, i) => ({
            id: 'c3_' + i, role: x.role, text: x.text, timestamp: Date.now(), inContext: true
          }))
        }
      ];

      document.getElementById('stagePill1').classList.add('done');
      document.getElementById('btnStage2').disabled = false;
      this.updateTokenBox('Steg 1 klart. 1 grön tråd, 2 gula osäkra flaggade.');
      this.renderTriageList();
    }

    else if (stage === 2) {
      this.spentTokens += 2850;
      const newCandidates = [];

      for (const c of this.triageCandidates) {
        if (c.ambiguityType === 'leo_intrusion') {
          newCandidates.push({
            id: 'cand_2_mikael',
            title: 'Cloudflare Workers JWT & KV-cache mot Supabase',
            folder: 'Programmering / Cloudflare',
            confidence: 'high',
            note: '✅ Steg 2 (Flash 3.8 + Röstprofil): Rensade ut Leos röstinmatning och fogade ihop dina två Cloudflare-frågor till en sammanhängande teknisk tråd!',
            messages: [c.messages[0], c.messages[1], c.messages[4], c.messages[5]]
          });
          newCandidates.push({
            id: 'cand_2_leo',
            title: 'Grottdraken & Diamantsvärdet',
            folder: 'Leo / Rollspel',
            confidence: 'high',
            note: '✅ Steg 2 (Flash 3.8 + Röstprofil): Kände igen Leos röstinmatning och bröt ut äventyret till Leos egen rollspelsmapp!',
            messages: [c.messages[2], c.messages[3]]
          });
        } else {
          newCandidates.push(c);
        }
      }

      this.triageCandidates = newCandidates;
      document.getElementById('stagePill2').classList.add('done');
      document.getElementById('btnStage3').disabled = false;
      this.updateTokenBox('Steg 2 klart! Leo-intrånget utbrutet enligt din röstprofil. 1 gul nod återstår.');
      this.renderTriageList();
    }

    else if (stage === 3) {
      this.spentTokens += 1100;
      const finalCandidates = [];

      for (const c of this.triageCandidates) {
        if (c.ambiguityType === 'topic_jump') {
          finalCandidates.push({
            id: 'cand_3_gdev',
            title: 'GDevelop — Hitbox och Sprite-kollision för Leo',
            folder: 'Spelutveckling / GDevelop',
            confidence: 'high',
            note: '🧠 Steg 3 (Pro/Argon): Delade upp blocket och placerade GDevelop-frågan i rätt projektmapp.',
            messages: [c.messages[0], c.messages[1]]
          });
          finalCandidates.push({
            id: 'cand_3_shake',
            title: 'Recept: Torsk- och potatis-soppshake för bilen',
            folder: 'Kost & Träning / Soppshakes',
            confidence: 'high',
            note: '🧠 Steg 3 (Pro/Argon): Bröt ut soppshake-receptet till egen tråd under Kost & Träning.',
            messages: [c.messages[2], c.messages[3]]
          });
        } else {
          finalCandidates.push(c);
        }
      }

      this.triageCandidates = finalCandidates;
      document.getElementById('stagePill3').classList.add('done');
      this.updateTokenBox('Steg 3 klart! Alla trådar är grönflaggade och koherenta.');
      this.renderTriageList();
    }

    this.updateBadge();
  },

  updateBadge() {
    const uncertainCount = this.triageCandidates.filter(c => c.confidence === 'uncertain').length;
    const badge = document.getElementById('rocketBadge');
    if (uncertainCount > 0) {
      badge.textContent = `${uncertainCount} GULA`;
    } else if (this.triageCandidates.length > 0) {
      badge.textContent = 'KLAR';
    }
  },

  updateTokenBox(statusText) {
    const costUsd = (this.spentTokens * 0.0000003).toFixed(4);
    document.getElementById('tokenEstimateBox').innerHTML = `
      Förbrukade tokens: <strong>${this.spentTokens.toLocaleString('sv-SE')}</strong> (~$${costUsd})<br>
      Status: <span style="color:var(--accent)">${statusText}</span>
    `;
  },

  filterTriage(mode) {
    this.currentFilter = mode;
    this.renderTriageList();
  },

  manualSplitCandidate(candId) {
    const idx = this.triageCandidates.findIndex(c => c.id === candId);
    if (idx === -1) return;
    const item = this.triageCandidates[idx];
    if (item.messages.length < 4) return;

    const half = Math.floor(item.messages.length / 2);
    const partA = {
      id: item.id + '_a',
      title: item.title + ' (Del 1)',
      folder: item.folder,
      confidence: 'high',
      note: 'Manuellt delad av dig i Triage-vyn.',
      messages: item.messages.slice(0, half)
    };
    const partB = {
      id: item.id + '_b',
      title: item.title + ' (Avknoppad tråd)',
      folder: item.folder,
      confidence: 'high',
      note: 'Manuellt avknoppad av dig i Triage-vyn.',
      messages: item.messages.slice(half)
    };
    this.triageCandidates.splice(idx, 1, partA, partB);
    this.renderTriageList();
    this.updateBadge();
  },

  approveCandidate(candId) {
    const item = this.triageCandidates.find(c => c.id === candId);
    if (item) {
      item.confidence = 'high';
      item.note = 'Manuellt godkänd av dig.';
      this.renderTriageList();
      this.updateBadge();
    }
  },

  renderTriageList() {
    const container = document.getElementById('triageList');
    const list = this.triageCandidates.filter(c => this.currentFilter === 'all' || c.confidence === 'uncertain');

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state">Inga noder matchar filtret.</div>`;
      return;
    }

    container.innerHTML = list.map(c => {
      const isOk = c.confidence === 'high';
      const previewHtml = c.messages.map(m =>
        `<div style="font-size:0.8rem; padding:4px 8px; background:rgba(255,255,255,0.03); border-radius:4px; margin-top:4px;">
          <strong style="color:${m.role === 'user' ? 'var(--accent)' : '#a855f7'}">${m.role.toUpperCase()}:</strong> ${CockpitApp.escapeHtml(m.text)}
        </div>`
      ).join('');

      return `
        <div class="triage-card ${isOk ? 'confident' : 'uncertain'}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>${CockpitApp.escapeHtml(c.title)}</strong>
              <span style="font-size:0.78rem; color:var(--text-muted); margin-left:8px;">📁 ${CockpitApp.escapeHtml(c.folder)}</span>
            </div>
            <span class="${isOk ? 'badge-ok' : 'badge-warn'}">${isOk ? '● GRÖN (Säker)' : '▲ GUL (Osäker)'}</span>
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted);">${CockpitApp.escapeHtml(c.note)}</div>
          <div>${previewHtml}</div>
          ${!isOk ? `
            <div class="triage-actions">
              <button onclick="CockpitRocket.approveCandidate('${c.id}')">👍 Behåll ihop & Godkänn</button>
              <button onclick="CockpitRocket.manualSplitCandidate('${c.id}')">✂️ Knoppa av till ny tråd</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  commitTriageToWorkspace() {
    if (this.triageCandidates.length === 0) {
      alert("Kör minst Steg 1 först så att det finns trådar att skicka in i Trädkatalogen.");
      return;
    }
    this.triageCandidates.forEach(c => {
      CockpitState.workspaceThreads.push({
        id: c.id + '_' + Date.now().toString(36),
        title: c.title,
        folder: c.folder,
        provider: 'takeout-rocket',
        messages: c.messages
      });
    });
    CockpitState.activeThreadId = CockpitState.workspaceThreads[CockpitState.workspaceThreads.length - 1].id;
    CockpitApp.switchView('chat');
    CockpitApp.renderAll();
    CockpitApp.showToast(`🚀 La till ${this.triageCandidates.length} sorterade trådar direkt i Trädkatalogen!`, false);
  }
};
