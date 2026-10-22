  // ============================================================================
  // --- V20 & V21: STÄDPATRULLEN MED KONTEXTZONER (GRÖN/GUL/RÖD) + PROGRESSIV UX-NIVÅ ---
  // ============================================================================
  let cleanupCandidateItems = [];

  function openCleanupPatrolModal() {
    scanCleanupCandidates();
    openModal('cleanupPatrolModal');
  }

  function evaluateMessagePairForCleanup(userMsg, botMsg) {
    const wantFluff = document.getElementById('clean_chk_fluff')?.checked !== false;
    const wantShort = document.getElementById('clean_chk_short')?.checked !== false;
    const wantFailed = document.getElementById('clean_chk_failed')?.checked !== false;
    const wantExcluded = document.getElementById('clean_chk_excluded')?.checked !== false;
    const customFilter = (document.getElementById('cleanCustomTextFilter')?.value || '').trim().toLowerCase();

    const uText = (userMsg?.text || '').trim();
    const bText = (botMsg?.text || '').trim();
    const combinedLower = (uText + ' ' + bText).toLowerCase();

    if (customFilter && !combinedLower.includes(customFilter)) {
      return null;
    }

    let score = 0;
    const reasons = [];

    if (customFilter && combinedLower.includes(customFilter)) {
      score += 50;
      reasons.push(`Matchar filter: "${customFilter}"`);
    }

    if (wantExcluded && ((userMsg && userMsg.inContext === false) || (botMsg && botMsg.inContext === false))) {
      score += 45;
      reasons.push('🛡️ Redan brusfiltrerad ur kontext');
    }

    const uWords = countWords(uText);
    const fillerRegex = /^(tack|tack så mycket|okej|ok|bra|toppen|test|testing|hej|hallå|ja|nej|hmm|\?|\.)[!?.]*$/i;
    if (wantShort && userMsg && (uWords <= 3 || fillerRegex.test(uText))) {
      if (fillerRegex.test(uText) || uWords <= 2) {
        score += 55;
        reasons.push(`Kort utfyllnadsprompt (${uWords} ord)`);
      }
    }

    const failUserRegex = /\b(funkar inte|fungerar inte|blev fel|helt fel|du förstod inte|gör om|nej inte så|felkod)\b/i;
    const failBotRegex = /(⚠️ Fel från|\[Demosvar från|Tomt svar från|ursäkta förvirringen|jag ber om ursäkt för misstaget)/i;
    if (wantFailed) {
      if (uText && failUserRegex.test(uText) && uWords <= 15) {
        score += 60;
        reasons.push('⚠️ Klagomål / misslyckad prompt');
      }
      if (bText && failBotRegex.test(bText)) {
        score += 75;
        reasons.push('⚠️ Felmeddelande / Demosvar / Ursäkt');
      }
    }

    if (wantFluff && bText) {
      const fluffPatterns = [
        { rx: /\b(som en ai|som språkmodell|som en artificiell intelligens)\b/i, pts: 40, label: '"Som en AI..."' },
        { rx: /\b(det är viktigt att komma ihåg|det är värt att notera|man bör ha i åtanke)\b/i, pts: 28, label: 'Brasklapp ("Viktigt att komma ihåg")' },
        { rx: /\b(hoppas detta hjälper|hoppas det här hjälper|säg till om du undrar något mer|lycka till med)\b/i, pts: 25, label: 'Artighetsfluff på slutet' },
        { rx: /\b(sammanfattningsvis kan sägas|i slutändan beror det på|det finns både för- och nackdelar)\b/i, pts: 30, label: 'Mellanmjölk-slutsats ("Beror på...")' },
        { rx: /\b(här är några allmänna tips|här är ett antal generella punkter)\b/i, pts: 35, label: 'Generisk standardlista' }
      ];
      fluffPatterns.forEach(fp => {
        if (fp.rx.test(bText)) {
          score += fp.pts;
          reasons.push(`🥛 ${fp.label}`);
        }
      });

      const bulletCount = (bText.match(/^\s*[-*•]|^\s*\d+\./gm) || []).length;
      if (bulletCount >= 6 && uWords > 0 && uWords <= 10 && !/[0-9]{3,}|function |const |def /.test(bText)) {
        score += 25;
        reasons.push(`🥛 Generisk listvägg (${bulletCount} punkter på kort fråga)`);
      }
    }

    if (score < 25) return null;
    return {
      score: Math.min(100, score),
      reasons
    };
  }

  // Beräknar om inlägget ligger i Slutet (Grön zon), Mitten (Gul zon) eller Först (Röd zon)
  function computeCleanupPositionZone(idx, spanCount, totalMsgs) {
    const afterCount = Math.max(0, totalMsgs - (idx + spanCount));
    if (afterCount === 0 || (afterCount <= 2 && idx > 0)) {
      return {
        zone: 'green',
        afterCount,
        badgeHtml: `<span class="zone-pill-green" title="Ligger i slutet av tråden – inget efterföljande samtal kan spåra ur om du tar bort detta.">🟢 Slutet av tråd (Säker att radera)</span>`,
        defaultChecked: true
      };
    }
    if (idx === 0) {
      return {
        zone: 'red',
        afterCount,
        badgeHtml: `<span class="zone-pill-red" title="Trådens allra första inlägg! Om du raderar det kan resten av samtalet (${afterCount} inlägg) tappa sitt sammanhang.">🔴 Trådstart (${afterCount} inlägg följer – brusfiltrera hellre!)</span>`,
        defaultChecked: false
      };
    }
    return {
      zone: 'yellow',
      afterCount,
      badgeHtml: `<span class="zone-pill-yellow" title="Ligger mitt i konversationen med ${afterCount} inlägg efteråt. Använd gärna '🛡️ Brusfiltrera' så samtalet fortfarande går att läsa!">🟡 Mitt i tråd (${afterCount} inlägg efteråt)</span>`,
      defaultChecked: false
    };
  }

  function scanCleanupCandidates() {
    const allThreads = collectAllThreadsWithPaths(treeData);
    cleanupCandidateItems = [];

    allThreads.forEach(({ thread, pathStr }) => {
      const msgs = thread.messages || [];
      let i = 0;
      while (i < msgs.length) {
        const cur = msgs[i];
        if (!cur.id) cur.id = `m_${thread.id}_${i}_${Date.now()}`;
        const next = (i + 1 < msgs.length) ? msgs[i + 1] : null;
        if (next && !next.id) next.id = `m_${thread.id}_${i + 1}_${Date.now()}`;

        if (cur.role === 'user' && next && next.role === 'assistant') {
          const ev = evaluateMessagePairForCleanup(cur, next);
          if (ev) {
            const tok = countTokens(cur.text) + countTokens(next.text);
            const zInfo = computeCleanupPositionZone(i, 2, msgs.length);
            cleanupCandidateItems.push({
              id: 'clean_' + cur.id,
              threadId: thread.id,
              threadName: thread.name,
              threadPath: pathStr,
              msgIds: [cur.id, next.id],
              userText: cur.text,
              botText: next.text,
              botModel: next.model || 'AI',
              tokens: tok,
              score: ev.score,
              reasons: ev.reasons,
              zone: zInfo.zone,
              afterCount: zInfo.afterCount,
              zoneBadgeHtml: zInfo.badgeHtml,
              checked: zInfo.defaultChecked || ev.score >= 70
            });
          }
          i += 2;
        } else {
          const ev = cur.role === 'user'
            ? evaluateMessagePairForCleanup(cur, null)
            : evaluateMessagePairForCleanup(null, cur);
          if (ev) {
            const tok = countTokens(cur.text);
            const zInfo = computeCleanupPositionZone(i, 1, msgs.length);
            cleanupCandidateItems.push({
              id: 'clean_' + cur.id,
              threadId: thread.id,
              threadName: thread.name,
              threadPath: pathStr,
              msgIds: [cur.id],
              userText: cur.role === 'user' ? cur.text : '',
              botText: cur.role === 'assistant' ? cur.text : '',
              botModel: cur.model || 'AI',
              tokens: tok,
              score: ev.score,
              reasons: ev.reasons,
              zone: zInfo.zone,
              afterCount: zInfo.afterCount,
              zoneBadgeHtml: zInfo.badgeHtml,
              checked: zInfo.defaultChecked || ev.score >= 70
            });
          }
          i += 1;
        }
      }
    });

    cleanupCandidateItems.sort((a, b) => b.score - a.score);
    renderCleanupCandidatesList();
  }

  function renderCleanupCandidatesList() {
    const listEl = document.getElementById('cleanupCandidatesList');
    const statsEl = document.getElementById('cleanupSummaryStats');
    const execBtn = document.getElementById('btnExecuteCleanup');
    const muteBtn = document.getElementById('btnMuteCleanup');
    if (!listEl || !statsEl || !execBtn) return;

    listEl.innerHTML = '';
    const checkedItems = cleanupCandidateItems.filter(x => x.checked);
    const savedTokens = checkedItems.reduce((acc, x) => acc + x.tokens, 0);
    const totalMsgToDelete = checkedItems.reduce((acc, x) => acc + x.msgIds.length, 0);

    statsEl.innerHTML = `Hittade <strong>${cleanupCandidateItems.length} misstänkta inläggspar</strong> • <strong>${checkedItems.length} st ibockade</strong> (~${savedTokens.toLocaleString('sv-SE')} tokens) • <em>🟢 Slutinlägg är förbockade, 🟡 Mitteninlägg lämnas obockade tills du väljer!</em>`;
    execBtn.textContent = `🗑️ Radera permanent (${checkedItems.length} par / ${totalMsgToDelete} inlägg)`;
    execBtn.disabled = checkedItems.length === 0;
    execBtn.style.opacity = checkedItems.length === 0 ? '0.5' : '1';
    if (muteBtn) {
      muteBtn.textContent = `🛡️ Brusfiltrera markerade (${checkedItems.length} par – behåll läsbarhet)`;
      muteBtn.disabled = checkedItems.length === 0;
      muteBtn.style.opacity = checkedItems.length === 0 ? '0.5' : '1';
    }

    if (cleanupCandidateItems.length === 0) {
      listEl.innerHTML = `<div style="padding:28px; text-align:center; color:var(--text-muted); border:1px dashed var(--border); border-radius:10px;">✨ Inga mellanmjölkssvar eller slaskinlägg matchade dina filter!</div>`;
      return;
    }

    cleanupCandidateItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'cleanup-item-card' + (item.checked ? ' checked' : '');

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.checked = item.checked;
      chk.style.cssText = 'width:18px; height:18px; accent-color:#ef4444; cursor:pointer; margin-top:2px;';
      chk.onchange = () => {
        item.checked = chk.checked;
        renderCleanupCandidatesList();
      };

      const content = document.createElement('div');
      content.style.cssText = 'flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; font-size:12px;';

      const uPreview = item.userText ? item.userText.replace(/\s+/g, ' ').slice(0, 170) : '(Ingen användarfråga)';
      const bPreview = item.botText ? item.botText.replace(/\s+/g, ' ').slice(0, 220) : '';

      content.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <span style="color:#93c5fd; font-weight:700;">📂 ${escapeHtml(item.threadPath)}</span>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            ${item.zoneBadgeHtml || ''}
            <span class="cleanup-score-pill">Slaskpoäng: ${item.score}/100 • ~${item.tokens} tkn</span>
          </div>
        </div>
        <div style="color:#fcd34d; font-size:11px;">Orsak: ${escapeHtml(item.reasons.join(' • '))}</div>
        ${item.userText ? `<div style="color:#e2e8f0; background:rgba(0,0,0,0.25); padding:5px 8px; border-radius:6px;"><strong>👤 Du:</strong> ${escapeHtml(uPreview)}${item.userText.length > 170 ? '…' : ''}</div>` : ''}
        ${item.botText ? `<div style="color:#cbd5e1; background:rgba(0,0,0,0.35); padding:5px 8px; border-radius:6px;"><strong>🤖 ${escapeHtml(item.botModel)}:</strong> ${escapeHtml(bPreview)}${item.botText.length > 220 ? '…' : ''}</div>` : ''}
      `;

      card.appendChild(chk);
      card.appendChild(content);
      listEl.appendChild(card);
    });
  }

  function toggleAllCleanupChecks(state) {
    cleanupCandidateItems.forEach(item => { item.checked = !!state; });
    renderCleanupCandidatesList();
  }

  async function runAiCleanupJudge() {
    if (cleanupCandidateItems.length === 0) return;
    let prov = 'gemini';
    let mod = 'gemini-3.5-flash-lite';
    if (!hasLiveKey('gemini')) {
      const fb = ['openai', 'anthropic', 'grok'].find(p => hasLiveKey(p));
      if (!fb) {
        alert('Lägg in en API-nyckel under 🔑 API om du vill låta AI:n dubbelkolla listan (den lokala städpatrullen fungerar dock redan till 100 % utan nyckel!).');
        return;
      }
      prov = fb;
      mod = PROVIDERS[prov].models[PROVIDERS[prov].models.length - 1].id;
    }

    const btn = document.getElementById('btnAiCleanupJudge');
    btn.disabled = true;
    btn.textContent = '⏳ AI-granskar...';

    try {
      const compactList = cleanupCandidateItems.slice(0, 25).map((item, i) =>
        `#${i} (${item.zone === 'green' ? 'Slutet' : 'Mitten, ' + item.afterCount + ' svar efter'}): [Tråd: ${item.threadName}] Du: "${(item.userText || '').slice(0, 90)}" -> AI: "${(item.botText || '').slice(0, 130)}"`
      ).join('\n');

      const sys = [
        'Du hjälper användaren att städa bort värdelösa eller mellanmjölkiga inlägg ur sin chatthistorik.',
        'Här är en numrerad lista (#0, #1, ...) med misstänkta slaskinlägg.',
        'Om något av inläggen faktiskt innehåller VIKTIG FAKTA eller styr riktningen på efterföljande svar i tråden så att det inte bör raderas, lista dess nummer i keepIndices.',
        'Svara ENBART med JSON i formatet: {"keepIndices": [2, 5], "note": "Kort kommentar på svenska"}'
      ].join('\n');

      const r = await callAI(prov, mod, [{ role: 'user', text: compactList }], sys, { maxTokens: 400, noTools: true });
      chargeLedger(prov, mod, r.inTok ?? 300, r.outTok ?? 80);
      const m = r.text.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]);
        if (Array.isArray(parsed.keepIndices)) {
          parsed.keepIndices.forEach(idx => {
            if (cleanupCandidateItems[idx]) {
              cleanupCandidateItems[idx].checked = false;
              cleanupCandidateItems[idx].reasons.unshift('🛡️ AI-granskare: Kan påverka trådens sammanhang (urklickad)');
            }
          });
        }
        renderCleanupCandidatesList();
        showAutosaveToast(`🤖 AI-granskning klar: ${parsed.note || 'Kryssade ur inlägg med möjlig nytta!'}`);
      }
    } catch (e) {
      alert('Kunde inte köra AI-granskning: ' + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🤖 AI-granska listan (~1 öre)';
    }
  }

  // Det smarta alternativet för gula/röda mitt-i-tråden-inlägg: Behåll texten synlig i tråden men slå av 🧠 Kontext-nålen!
  function muteCleanupPatrolItems() {
    const toMute = cleanupCandidateItems.filter(x => x.checked);
    if (toMute.length === 0) return;

    const totalMsgs = toMute.reduce((a, x) => a + x.msgIds.length, 0);
    const savedTok = toMute.reduce((a, x) => a + x.tokens, 0);
    const affectedThreadsSet = new Set(toMute.map(x => x.threadId));

    const muteMap = new Map();
    toMute.forEach(item => {
      if (!muteMap.has(item.threadId)) muteMap.set(item.threadId, new Set());
      const s = muteMap.get(item.threadId);
      item.msgIds.forEach(mid => s.add(mid));
    });

    muteMap.forEach((idSet, tid) => {
      const tNode = findNode(treeData, tid);
      if (tNode && Array.isArray(tNode.messages)) {
        tNode.messages.forEach(m => {
          if (idSet.has(m.id)) m.inContext = false;
        });
        tNode.lastModified = Date.now();
      }
    });

    affectedThreadsSet.forEach(tid => saveTree(tid));
    saveTree();
    renderAll();
    closeModal('cleanupPatrolModal');
    showAutosaveToast(`🛡️ Brusfiltrerade ${totalMsgs} inlägg! De finns kvar att läsa i sina trådar men kostar 0 kr vid nästa AI-anrop (sparar ~${savedTok.toLocaleString('sv-SE')} tkn).`);
  }

  function executeCleanupPatrol() {
    const toRemove = cleanupCandidateItems.filter(x => x.checked);
    if (toRemove.length === 0) return;

    const midThreadCount = toRemove.filter(x => x.zone !== 'green').length;
    const totalMsgs = toRemove.reduce((a, x) => a + x.msgIds.length, 0);
    const savedTok = toRemove.reduce((a, x) => a + x.tokens, 0);
    const affectedThreadsSet = new Set(toRemove.map(x => x.threadId));

    const midWarn = midThreadCount > 0
      ? `\n\n⚠️ OBS: ${midThreadCount} av de markerade paren ligger MITT I en konversation (🟡/🔴). Om du vill behålla läsbarheten i de trådarna kan du trycka Avbryt och välja knappen "🛡️ Brusfiltrera markerade" istället!`
      : '';

    if (!confirm(`Vill du radera de ${toRemove.length} ibockade inläggsparen (${totalMsgs} meddelanden) permanent ur ${affectedThreadsSet.size} tråd(ar)?\n\nDetta frigör ~${savedTok.toLocaleString('sv-SE')} tokens.${midWarn}`)) {
      return;
    }

    const deleteMap = new Map();
    toRemove.forEach(item => {
      if (!deleteMap.has(item.threadId)) deleteMap.set(item.threadId, new Set());
      const s = deleteMap.get(item.threadId);
      item.msgIds.forEach(mid => s.add(mid));
    });

    const deleteEmptyThreads = document.getElementById('cleanDeleteEmptyThreadsChk')?.checked;
    const emptyThreadIds = new Set();

    deleteMap.forEach((idSet, tid) => {
      const tNode = findNode(treeData, tid);
      if (tNode && Array.isArray(tNode.messages)) {
        tNode.messages = tNode.messages.filter(m => !idSet.has(m.id));
        tNode.lastModified = Date.now();
        if (deleteEmptyThreads && tNode.messages.length === 0) {
          emptyThreadIds.add(tid);
        }
      }
    });

    const allRemovedMsgIds = [];
    deleteMap.forEach((idSet) => idSet.forEach(mid => allRemovedMsgIds.push(mid)));
    if (allRemovedMsgIds.length > 0 && typeof registerDeletedMessagesForSync === 'function') {
      registerDeletedMessagesForSync(allRemovedMsgIds);
    }

    if (emptyThreadIds.size > 0) {
      function pruneEmptyThreadsRec(parent) {
        if (!parent.children) return;
        parent.children = parent.children.filter(c => !(c.type === 'thread' && emptyThreadIds.has(c.id)));
        parent.children.forEach(pruneEmptyThreadsRec);
      }
      pruneEmptyThreadsRec(treeData);
      if (typeof registerDeletedNodesForSync === 'function') {
        registerDeletedNodesForSync(Array.from(emptyThreadIds));
      }
    }

    affectedThreadsSet.forEach(tid => {
      if (!emptyThreadIds.has(tid)) saveTree(tid);
    });
    saveTree();
    ensureValidActiveThread();
    renderAll();
    closeModal('cleanupPatrolModal');
    showAutosaveToast(`🧹 Städpatrullen raderade ${totalMsgs} slaskinlägg${emptyThreadIds.size ? ` (och ${emptyThreadIds.size} tomma trådar)` : ''} – sparade ~${savedTok.toLocaleString('sv-SE')} tokens!`);
  }

  // ============================================================================
  // --- V21: PROGRESSIV UX-NIVÅ (1: ENKEL ➔ 2: SMART ➔ 3: FULL COCKPIT) ---
  // ============================================================================
  const UX_LEVEL_GUIDES = {
    1: {
      title: '🟢 Nivå 1: Lugn & Enkel (Perfekt startläge)',
      html: `
        <div class="pm-hint" style="border-left-color:#10b981; background:rgba(16,185,129,0.12); color:#a7f3d0;">
          <strong>Allt brus och alla avancerade mätare är nu dolda!</strong> Du ser bara det absolut viktigaste för att komma igång direkt utan krångel:
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>1. ☰ Trädstrukturen (till vänster):</strong><br>
            Sortera dina samtal i mappar och undertrådar (precis som vanliga mappar på datorn) istället för en enda rörig lista.
          </div>
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>2. ⚡ PromptMotorn & Snabbknapparna (ovanför chattrutan):</strong><br>
            Osäker på hur du ska formulera dig? Klistra bara in ett mejl eller en text och klicka på <code>⚡ 20s Sammanfattning</code>, <code>✉️ Svarsutkast</code>, <code>🕵️ Fluffdetektor</code> eller <code>✋ Artigt Nej</code>!
          </div>
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>3. ☁️ Molnsynk & 🔑 API:</strong><br>
            Anslut ditt Google Drive med ett klick så finns dina trådar både i mobilen och på datorn.
          </div>
        </div>
      `
    },
    2: {
      title: '🟡 Nivå 2: Smarta Verktyg (Spara pengar & slipp upprepningar)',
      html: `
        <div class="pm-hint" style="border-left-color:#f59e0b; background:rgba(245,158,11,0.12); color:#fde68a;">
          <strong>Nu har du låst upp verktygen som gör att AI:n minns bättre och kostar 80 % mindre!</strong>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>1. 🧠 Brusfilter-nålen (uppe till höger på varje meddelande):</strong><br>
            Varje gång du ställer en ny fråga läser AI:n hela samtalet igen. Om du dragit ett skämt eller bytt spår: klicka på <code>🧠 Aktiv i kontext</code> så att den blir <code>🛡️ Brusfiltrerad</code>. Då slipper AI:n bli förvirrad och du betalar 0 kr för det inlägget vid nästa fråga!
          </div>
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>2. 🧠 Hierarkiskt Långtidsminne (knappen Minne):</strong><br>
            Skriv in fakta eller regler på en mapp (t.ex. <em>"Svara alltid kortfattat"</em>). Alla trådar i mappen ärver då minnet automatiskt – oavsett om du pratar med Gemini, ChatGPT eller Claude!
          </div>
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>3. 🕵️ Sökagent & 🧹 Städpatrull (nere till vänster):</strong><br>
            Låt Sökdetektiven hitta guldkorn i hundratals gamla chattar, eller låt Städpatrullen rensa bort gamla "mellanmjölkssvar".
          </div>
        </div>
      `
    },
    3: {
      title: '🔵 Nivå 3: Full AI-Cockpit (Alla reglage & extrem kontroll)',
      html: `
        <div class="pm-hint" style="border-left-color:#3b82f6; background:rgba(59,130,246,0.14); color:#93c5fd;">
          <strong>Alla system är upplåsta! Full kontroll över varenda token, modell och verktyg:</strong>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px; font-size:13px;">
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>1. 💾 Dual-Pane Commander (Desktop):</strong><br>
            Klassiskt tvåpanelsläge med kungsblå retro-känsla! Högerklicka för att gulmarkera inlägg och flytta/kopiera dem mellan två trådar med <code>F5</code> och <code>F6</code>.
          </div>
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>2. 🎛️ Specialstudior (Lyria Musik, Veo Video, Bild, Webbsök & Python):</strong><br>
            Guidade studior som väver in din GPS-plats, tid och lokalhistoria i musik-, video- och bildprompter.
          </div>
          <div style="background:rgba(30,41,59,0.7); padding:10px 12px; border-radius:8px; border:1px solid var(--border);">
            <strong>3. 👁️ Kontext-inspektor & Batch-markering (Ctrl+klick):</strong><br>
            Inspektera exakt vilken rådata som skickas till API:et och markera flera kort i chatten för att bryta ut sidospår till nya undertrådar.
          </div>
        </div>
      `
    }
  };

  function setUxComplexityLevel(level, showGuidePopup = false) {
    const lvl = [1, 2, 3].includes(Number(level)) ? Number(level) : 3;
    const prevLvl = uiPrefs.uxLevel || 3;
    uiPrefs.uxLevel = lvl;
    saveUiPrefs();
    applyUxLevelToDom();

    if (showGuidePopup && lvl !== prevLvl) {
      openUxLevelGuideModal(lvl);
    }
  }

  function applyUxLevelToDom() {
    const lvl = uiPrefs.uxLevel || 3;
    document.body.classList.remove('ux-level-1', 'ux-level-2', 'ux-level-3');
    document.body.classList.add('ux-level-' + lvl);

    [1, 2, 3].forEach(n => {
      const btn = document.getElementById('uxLvlBtn' + n);
      if (btn) {
        btn.classList.remove('active-lvl-1', 'active-lvl-2', 'active-lvl-3');
        if (n === lvl) btn.classList.add('active-lvl-' + n);
      }
    });
  }

  function openUxLevelGuideModal(levelToView) {
    const lvl = [1, 2, 3].includes(Number(levelToView)) ? Number(levelToView) : (uiPrefs.uxLevel || 3);
    const info = UX_LEVEL_GUIDES[lvl] || UX_LEVEL_GUIDES[3];
    document.getElementById('uxGuideModalTitle').textContent = info.title;
    document.getElementById('uxGuideModalContent').innerHTML = info.html;

    [1, 2, 3].forEach(n => {
      const tab = document.getElementById('uxGuideTab' + n);
      if (tab) tab.classList.toggle('active', n === lvl);
    });

    // Om användaren klickar på en annan nivåflik inne i guiden, aktivera även den nivån direkt!
    if (lvl !== (uiPrefs.uxLevel || 3)) {
      uiPrefs.uxLevel = lvl;
      saveUiPrefs();
      applyUxLevelToDom();
    }

    openModal('uxLevelGuideModal');
  }

  const _origRenderAll = renderAll;
  renderAll = function() {
    _origRenderAll();
    updateMemoryIndicator();
    applyUiPrefsToDom();
  };

  // ============================================================================
  // --- V18 UPGRADE: KOLLISIONSFRI FLERFILS-SYNK (GIT-STIL) & SMART MERGE PÅ GOOGLE DRIVE ---
  // ============================================================================
  const DEFAULT_GDRIVE_CLIENT_ID = '551988819752-uig1jopvsplofelvj413fs70cdpnpm69.apps.googleusercontent.com';
  let gdriveConfig = JSON.parse(localStorage.getItem('ai_cockpit_gdrive_cfg_v15')) || {
    clientId: DEFAULT_GDRIVE_CLIENT_ID,
    folderMode: 'appdata', // 'appdata' eller 'drivefile'
    autoSync: true
  };
  if (!gdriveConfig.clientId || !gdriveConfig.clientId.endsWith('.apps.googleusercontent.com') || gdriveConfig.clientId.split('.apps.googleusercontent.com').length > 2) {
    gdriveConfig.clientId = DEFAULT_GDRIVE_CLIENT_ID;
  }
  let gdriveAccessToken = sessionStorage.getItem('ai_cockpit_gdrive_token') || '';
  let gdriveTokenExpiry = Number(sessionStorage.getItem('ai_cockpit_gdrive_expiry') || 0);
  let gdriveRemoteFileId = null;      // tree_index.json (eller legacy min_ai_cockpit.aicockpit)
  let gdriveThreadsFolderId = null;   // ID för mappen 'threads' på Google Drive
  let gdriveThreadFileIds = {};       // Map: threadId -> Google Drive fileId för threads/t_xxx.json
  let gdriveDirtyThreadIds = new Set();
  let gdriveDeletedNodeIds = new Set(JSON.parse(localStorage.getItem('ai_cockpit_deleted_nodes_v578') || '[]'));
  let gdriveDeletedMsgIds = new Set(JSON.parse(localStorage.getItem('ai_cockpit_deleted_msgs_v578') || '[]'));
  let gdrivePendingDeleteThreadIds = new Set();

  function saveDeletedRegistries() {
    try {
      const nodeArr = Array.from(gdriveDeletedNodeIds).slice(-5000);
      const msgArr = Array.from(gdriveDeletedMsgIds).slice(-10000);
      localStorage.setItem('ai_cockpit_deleted_nodes_v578', JSON.stringify(nodeArr));
      localStorage.setItem('ai_cockpit_deleted_msgs_v578', JSON.stringify(msgArr));
    } catch (e) {}
  }

  function pruneDeletedNodesFromTree(node) {
    if (!node || !node.children) return;
    node.children = node.children.filter(c => !gdriveDeletedNodeIds.has(c.id));
    node.children.forEach(pruneDeletedNodesFromTree);
  }

  function registerDeletedMessagesForSync(msgIds = []) {
    msgIds.forEach(id => {
      if (id) gdriveDeletedMsgIds.add(id);
    });
    saveDeletedRegistries();
  }

  async function deleteSingleThreadFileFromDrive(tid) {
    if (!isGdriveTokenValid()) return;
    const fileId = gdriveThreadFileIds[tid];
    if (!fileId) return;
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${gdriveAccessToken}` }
      });
      delete gdriveThreadFileIds[tid];
    } catch (e) {
      console.warn('[GDrive] Kunde inte radera trådfil:', tid, e);
    }
  }

  function registerDeletedNodesForSync(nodeIds = []) {
    nodeIds.forEach(id => {
      if (!id) return;
      gdriveDeletedNodeIds.add(id);
      gdrivePendingDeleteThreadIds.add(id);
      gdriveDirtyThreadIds.delete(id);
    });
    saveDeletedRegistries();

    // Tvinga omedelbar synkronisering till både localStorage och IndexedDB så att inget gammalt spökträd kan läsas tillbaka vid omladdning!
    treeData.lastModified = Date.now();
    try {
      const cleanTreeStr = JSON.stringify(treeData, (key, value) => (key === 'imageUrl' || key === 'dataUrl') ? undefined : value);
      localStorage.setItem('ai_cockpit_tree_v3', cleanTreeStr);
    } catch (e) {}
    if (typeof idbWriteVault === 'function') {
      idbWriteVault('tree_backup_v578', treeData);
    }

    // Om inloggad på Google Drive: radera filerna på Drive och uppdatera indexet!
    if (isGdriveTokenValid()) {
      scheduleGdriveAutoSync();
    }
  }
  let gdriveLastSyncedModified = 0;
  let gdriveAutoSyncTimer = null;
  let gdriveTokenClient = null;
  let gdriveIsSyncing = false;

  function initGdriveUiFromConfig() {
    const cidInput = document.getElementById('gdriveClientIdInput');
    if (cidInput) cidInput.value = gdriveConfig.clientId || '';
    const radios = document.querySelectorAll('input[name="gdriveFolderMode"]');
    radios.forEach(r => { r.checked = (r.value === (gdriveConfig.folderMode || 'appdata')); });
    const autoChk = document.getElementById('gdriveAutoSyncChk');
    if (autoChk) autoChk.checked = gdriveConfig.autoSync !== false;
    updateGdriveUiState();
  }

  function sanitizeClientId(raw) {
    let s = String(raw || '').replace(/\s+/g, '').replace(/^["']+|["']+$/g, '');
    const m = s.match(/([0-9]+-[a-zA-Z0-9_]+\.apps\.googleusercontent\.com)/);
    if (m) return m[1];
    return s || DEFAULT_GDRIVE_CLIENT_ID;
  }

  function saveGdriveConfig() {
    const cidInput = document.getElementById('gdriveClientIdInput');
    const checkedRadio = document.querySelector('input[name="gdriveFolderMode"]:checked');
    const autoChk = document.getElementById('gdriveAutoSyncChk');
    const cleaned = cidInput ? sanitizeClientId(cidInput.value) : DEFAULT_GDRIVE_CLIENT_ID;
    gdriveConfig.clientId = cleaned || DEFAULT_GDRIVE_CLIENT_ID;
    if (cidInput) cidInput.value = gdriveConfig.clientId;
    gdriveConfig.folderMode = checkedRadio ? checkedRadio.value : 'appdata';
    gdriveConfig.autoSync = autoChk ? autoChk.checked : true;
    localStorage.setItem('ai_cockpit_gdrive_cfg_v15', JSON.stringify(gdriveConfig));
    gdriveRemoteFileId = null;
    gdriveThreadsFolderId = null;
    gdriveThreadFileIds = {};
  }

  function isGdriveTokenValid() {
    return !!gdriveAccessToken && Date.now() < (gdriveTokenExpiry - 30000);
  }

  function updateGdriveUiState(statusMessage, isError = false) {
    const badge = document.getElementById('gdriveSyncBadge');
    const pullBtn = document.getElementById('gdrivePullBtn');
    const pushBtn = document.getElementById('gdrivePushBtn');
    const loginBtn = document.getElementById('gdriveLoginBtn');
    const sideBtn = document.getElementById('sidebarCloudBtn');
    const statusEl = document.getElementById('gdriveLiveStatus');

    const connected = isGdriveTokenValid();
    if (badge) {
      badge.textContent = connected ? '🟢 Ansluten (Krockfri Flerfils-synk v18)' : '⚪ Ej inloggad';
      badge.style.color = connected ? '#6ee7b7' : '#94a3b8';
      badge.style.borderColor = connected ? '#10b981' : '#334155';
    }
    if (pullBtn) pullBtn.disabled = !connected;
    if (pushBtn) pushBtn.disabled = !connected;
    if (loginBtn) {
      loginBtn.textContent = connected ? '🔄 Förnya Google-inloggning' : '🔵 Logga in med Google Drive';
    }
    if (sideBtn) {
      sideBtn.textContent = connected ? '☁️ Drive: PÅ' : '☁️ Molnsynk';
    }
    if (statusMessage && statusEl) {
      statusEl.textContent = statusMessage;
      statusEl.style.color = isError ? '#fca5a5' : '#a7f3d0';
    }
  }

  function getGdriveScope() {
    return gdriveConfig.folderMode === 'drivefile'
      ? 'https://www.googleapis.com/auth/drive.file'
      : 'https://www.googleapis.com/auth/drive.appdata';
  }

  function handleGoogleDriveLogin() {
    saveGdriveConfig();
    const cidInput = document.getElementById('gdriveClientIdInput');
    if (cidInput) cidInput.value = gdriveConfig.clientId;
    if (!gdriveConfig.clientId || !gdriveConfig.clientId.endsWith('.apps.googleusercontent.com')) {
      alert('Kontrollera ditt Google OAuth Client ID!');
      cidInput?.focus();
      return;
    }
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      updateGdriveUiState('❌ Googles inloggningsskript kunde inte laddas. Kontrollera internetuppkopplingen.', true);
      return;
    }

    gdriveTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: gdriveConfig.clientId,
      scope: getGdriveScope(),
      callback: async (resp) => {
        if (resp.error) {
          updateGdriveUiState('❌ Google-inloggning misslyckades: ' + (resp.error_description || resp.error), true);
          return;
        }
        gdriveAccessToken = resp.access_token;
        const expiresInSec = Number(resp.expires_in || 3599);
        gdriveTokenExpiry = Date.now() + (expiresInSec * 1000);
        sessionStorage.setItem('ai_cockpit_gdrive_token', gdriveAccessToken);
        sessionStorage.setItem('ai_cockpit_gdrive_expiry', String(gdriveTokenExpiry));
        updateGdriveUiState('✅ Inloggad! Initierar krockfri mappstruktur (tree_index.json + threads/)...');
        await syncOnLoginWithDrive();
      }
    });

    gdriveTokenClient.requestAccessToken({ prompt: '' });
  }

  // Hjälpare för Google Drive REST API
  async function gdriveFetchJson(url, options = {}) {
    const headers = {
      'Authorization': `Bearer ${gdriveAccessToken}`,
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      gdriveAccessToken = '';
      sessionStorage.removeItem('ai_cockpit_gdrive_token');
      throw new Error('Din Google-session har gått ut. Klicka på "Logga in med Google Drive" igen.');
    }
    if (!res.ok) throw new Error(`Google Drive HTTP ${res.status}`);
    return await res.json();
  }

  // Skapar eller hittar mappen `threads` och indexfilen `tree_index.json` helt automatiskt (Zero-Config!)
  async function ensureGdriveMultiFileEnv() {
    const isAppData = gdriveConfig.folderMode !== 'drivefile';
    const spaces = isAppData ? 'appDataFolder' : 'drive';

    // 1. Hitta eller skapa mappen `threads`
    if (!gdriveThreadsFolderId) {
      const qFolder = encodeURIComponent("name = 'threads' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const folderSearch = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files?spaces=${spaces}&q=${qFolder}&fields=files(id,name)&pageSize=5`);
      if (folderSearch.files && folderSearch.files.length > 0) {
        gdriveThreadsFolderId = folderSearch.files[0].id;
      } else {
        const folderMeta = {
          name: 'threads',
          mimeType: 'application/vnd.google-apps.folder',
          ...(isAppData ? { parents: ['appDataFolder'] } : {})
        };
        const createdFolder = await gdriveFetchJson('https://www.googleapis.com/drive/v3/files?fields=id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(folderMeta)
        });
        gdriveThreadsFolderId = createdFolder.id;
      }
    }

    // 2. Lista befintliga trådfiler inuti `threads/` så vi har deras fileId och modifiedTime i cachen
    const qThreads = encodeURIComponent(`'${gdriveThreadsFolderId}' in parents and trashed = false`);
    const threadFilesList = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files?spaces=${spaces}&q=${qThreads}&fields=files(id,name,modifiedTime)&pageSize=500`);
    const remoteThreadFiles = {};
    (threadFilesList.files || []).forEach(f => {
      const tid = String(f.name || '').replace(/\.json$/, '');
      if (tid) {
        gdriveThreadFileIds[tid] = f.id;
        remoteThreadFiles[tid] = f;
      }
    });

    // 3. Hitta `tree_index.json` (eller legacy `min_ai_cockpit.aicockpit`)
    const qIndex = encodeURIComponent("(name = 'tree_index.json' or name = 'min_ai_cockpit.aicockpit') and trashed = false");
    const indexSearch = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files?spaces=${spaces}&q=${qIndex}&fields=files(id,name,modifiedTime)&pageSize=10`);
    const indexFile = (indexSearch.files || []).find(f => f.name === 'tree_index.json') || null;
    const legacyFile = (indexSearch.files || []).find(f => f.name === 'min_ai_cockpit.aicockpit') || null;

    if (indexFile) gdriveRemoteFileId = indexFile.id;
    return { indexFile, legacyFile, remoteThreadFiles };
  }

  // Skapar ett lättviktigt index-träd där varje tråd behåller sin metadata men inte tynger ner indexfilen
  function buildSkeletonTree(node) {
    const copy = {
      id: node.id,
      name: node.name,
      type: node.type,
      isOpen: node.isOpen,
      memory: node.memory || '',
      lastModified: node.lastModified || Date.now()
    };
    if (node.type === 'folder') {
      copy.children = (node.children || []).map(c => buildSkeletonTree(c));
    }
    return copy;
  }

  // Krockfri sammanslagning av två meddelandelistor som RESPEKTERAR raderade meddelanden!
  function mergeThreadMessages(localMsgs = [], remoteMsgs = []) {
    const map = new Map();
    const order = [];
    remoteMsgs.forEach((m, i) => {
      const id = m.id || (`rem_${i}_${countWords(m.text)}`);
      if (gdriveDeletedMsgIds.has(id)) return; // Hoppa över meddelanden som användaren har raderat!
      map.set(id, m);
      order.push(id);
    });
    localMsgs.forEach((m, i) => {
      const id = m.id || (`loc_${i}_${countWords(m.text)}`);
      if (gdriveDeletedMsgIds.has(id)) return;
      if (!map.has(id)) {
        order.push(id);
      }
      map.set(id, m);
    });
    return order.map(id => map.get(id));
  }

  // Slår ihop lokalt mappträd och molnets mappträd, men TVINGAR BORT allt som användaren har raderat!
  function mergeTreeStructures(localNode, remoteNode) {
    if (!remoteNode) return localNode;
    if (!localNode) return remoteNode;
    const merged = {
      ...remoteNode,
      ...localNode,
      memory: (localNode.memory && localNode.memory.trim()) ? localNode.memory : (remoteNode.memory || '')
    };
    if (localNode.type === 'folder' || remoteNode.type === 'folder') {
      const childMap = new Map();
      const childOrder = [];
      (remoteNode.children || []).forEach(rc => {
        if (gdriveDeletedNodeIds.has(rc.id)) return; // Tillåt aldrig Google Drive att återuppväcka en raderad tråd/mapp!
        childMap.set(rc.id, rc);
        childOrder.push(rc.id);
      });
      (localNode.children || []).forEach(lc => {
        if (gdriveDeletedNodeIds.has(lc.id)) return;
        if (childMap.has(lc.id)) {
          childMap.set(lc.id, mergeTreeStructures(lc, childMap.get(lc.id)));
        } else {
          childMap.set(lc.id, lc);
          childOrder.push(lc.id);
        }
      });
      merged.children = childOrder.map(id => childMap.get(id));
    }
    return merged;
  }

  // Sparar eller uppdaterar EN enskild trådfil (`threads/{threadId}.json`) med krockfri merge
  async function pushSingleThreadFileToDrive(threadNode) {
    if (!threadNode || threadNode.type !== 'thread') return;
    const isAppData = gdriveConfig.folderMode !== 'drivefile';
    const tid = threadNode.id;
    let existingFileId = gdriveThreadFileIds[tid];

    // Om filen redan finns på Drive, hämta den snabbt och fläta ihop eventuella nya meddelanden från andra enheter!
    if (existingFileId) {
      try {
        const remoteThreadData = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files/${existingFileId}?alt=media`);
        if (remoteThreadData && Array.isArray(remoteThreadData.messages)) {
          threadNode.messages = mergeThreadMessages(threadNode.messages || [], remoteThreadData.messages);
        }
      } catch (e) {}
    }

    const payload = JSON.stringify({
      id: tid,
      name: threadNode.name,
      memory: threadNode.memory || '',
      lastModified: threadNode.lastModified || Date.now(),
      messages: threadNode.messages || []
    }, null, 2);

    if (existingFileId) {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${gdriveAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: payload
      });
    } else {
      const meta = {
        name: `${tid}.json`,
        mimeType: 'application/json',
        parents: [gdriveThreadsFolderId || (isAppData ? 'appDataFolder' : 'root')]
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
      form.append('file', new Blob([payload], { type: 'application/json' }));
      const created = await gdriveFetchJson('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        body: form
      });
      if (created && created.id) gdriveThreadFileIds[tid] = created.id;
    }
  }

  async function syncOnLoginWithDrive() {
    try {
      const { indexFile, legacyFile } = await ensureGdriveMultiFileEnv();
      if (!indexFile && !legacyFile) {
        updateGdriveUiState('ℹ️ Skapar din krockfria mappstruktur (tree_index.json + threads/) på Google Drive...');
        await pushToGoogleDrive(true);
        return;
      }
      await pullFromGoogleDrive(true);
    } catch (e) {
      updateGdriveUiState('❌ Kunde inte synka vid inloggning: ' + e.message, true);
    }
  }

  async function pullFromGoogleDrive(isInitialLogin = false) {
    if (!isGdriveTokenValid()) {
      updateGdriveUiState('⚠️ Du måste logga in med Google Drive först.', true);
      return;
    }
    updateGdriveUiState('⏳ Synkar mappstruktur och trådfiler från Google Drive...');
    try {
      const { indexFile, legacyFile, remoteThreadFiles } = await ensureGdriveMultiFileEnv();

      // Fall 1: Vi har det nya flerfils-indexet (`tree_index.json`)
      if (indexFile) {
        const indexBundle = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files/${indexFile.id}?alt=media`);
        if (Array.isArray(indexBundle.deletedNodeIds)) {
          indexBundle.deletedNodeIds.forEach(id => gdriveDeletedNodeIds.add(id));
        }
        if (Array.isArray(indexBundle.deletedMsgIds)) {
          indexBundle.deletedMsgIds.forEach(id => gdriveDeletedMsgIds.add(id));
        }
        saveDeletedRegistries();

        const remoteSkeleton = indexBundle.treeSkeleton || indexBundle.treeData || indexBundle;

        // Slå ihop trädstrukturen men filtrera stenhårt bort raderade trådar och mappar!
        const isDefaultLocal = !treeData.lastModified && collectAllThreadsWithPaths(treeData).length <= 1;
        if (isDefaultLocal) {
          treeData = remoteSkeleton;
        } else {
          treeData = mergeTreeStructures(treeData, remoteSkeleton);
        }
        pruneDeletedNodesFromTree(treeData);

        if (indexBundle.uiPrefs) uiPrefs = { ...uiPrefs, ...indexBundle.uiPrefs };
        if (indexBundle.costLedger) costLedger = indexBundle.costLedger;

        // Hämta och fläta ihop alla trådfiler från `threads/`
        const allThreads = collectAllThreadsWithPaths(treeData);
        let syncedThreadsCount = 0;
        for (const { thread } of allThreads) {
          if (gdriveDeletedNodeIds.has(thread.id)) continue;
          const rf = remoteThreadFiles[thread.id];
          if (rf) {
            try {
              const tData = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files/${rf.id}?alt=media`);
              if (tData && Array.isArray(tData.messages)) {
                thread.messages = isDefaultLocal
                  ? tData.messages.filter(m => !gdriveDeletedMsgIds.has(m.id))
                  : mergeThreadMessages(thread.messages || [], tData.messages);
                syncedThreadsCount++;
              }
            } catch (e) {}
          }
        }

        if (indexBundle.activeThreadId && findNode(treeData, indexBundle.activeThreadId)) {
          activeThreadId = indexBundle.activeThreadId;
        }
        ensureValidActiveThread();
        saveTree();
        renderAll();
        updateGdriveUiState(`✅ Krockfri synk klar (${syncedThreadsCount} trådfiler synkade kl ${new Date().toLocaleTimeString()})!`);
        return;
      }

      // Fall 2: Migrering från äldre enkel-fil (`min_ai_cockpit.aicockpit`) -> uppgradera automatiskt till flerfils-struktur!
      if (legacyFile) {
        const legacyBundle = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files/${legacyFile.id}?alt=media`);
        const incomingTree = legacyBundle.treeData || legacyBundle;
        const isDefaultLocal = !treeData.lastModified && collectAllThreadsWithPaths(treeData).length <= 1;
        if (isDefaultLocal) {
          treeData = incomingTree;
        } else {
          treeData = mergeTreeStructures(treeData, incomingTree);
        }
        localStorage.setItem('ai_cockpit_tree_v3', JSON.stringify(treeData));
        renderAll();
        updateGdriveUiState('🔄 Uppgraderar din Google Drive-lagring till v18 krockfri flerfils-struktur...');
        await pushToGoogleDrive(true);
        return;
      }

      updateGdriveUiState('ℹ️ Ingen tidigare arbetsyta hittades på Drive. Klicka på "Spara till Drive nu".');
    } catch (e) {
      updateGdriveUiState('❌ Fel vid hämtning från Google Drive: ' + e.message, true);
    }
  }

  async function pushToGoogleDrive(silent = false, onlyThreadIds = null) {
    if (!isGdriveTokenValid()) {
      if (!silent) updateGdriveUiState('⚠️ Logga in med Google Drive först.', true);
      return;
    }
    if (gdriveIsSyncing) return;
    gdriveIsSyncing = true;
    if (!silent) updateGdriveUiState('⏳ Synkar trådfiler och index till Google Drive...');

    try {
      await ensureGdriveMultiFileEnv();
      const isAppData = gdriveConfig.folderMode !== 'drivefile';

      // 0. Om användaren har raderat trådar: plocka bort deras filer från Google Drive först!
      const toDeleteNow = new Set([...gdrivePendingDeleteThreadIds]);
      Object.keys(gdriveThreadFileIds).forEach(tid => {
        if (gdriveDeletedNodeIds.has(tid)) toDeleteNow.add(tid);
      });
      for (const delId of toDeleteNow) {
        await deleteSingleThreadFileFromDrive(delId);
        gdrivePendingDeleteThreadIds.delete(delId);
      }

      pruneDeletedNodesFromTree(treeData);

      // 1. Spara antingen bara de ändrade trådarna (blixtsnabbt och krockfritt!) eller alla trådar
      const allThreads = collectAllThreadsWithPaths(treeData);
      const targets = (onlyThreadIds && onlyThreadIds.length > 0)
        ? allThreads.filter(t => onlyThreadIds.includes(t.thread.id) && !gdriveDeletedNodeIds.has(t.thread.id))
        : allThreads.filter(t => !gdriveDeletedNodeIds.has(t.thread.id));

      for (const { thread } of targets) {
        await pushSingleThreadFileToDrive(thread);
      }

      // 2. Uppdatera `tree_index.json` (respektera alltid lokala raderingar!)
      if (gdriveRemoteFileId) {
        try {
          const remoteIdx = await gdriveFetchJson(`https://www.googleapis.com/drive/v3/files/${gdriveRemoteFileId}?alt=media`);
          if (Array.isArray(remoteIdx.deletedNodeIds)) {
            remoteIdx.deletedNodeIds.forEach(id => gdriveDeletedNodeIds.add(id));
          }
          const remoteSkel = remoteIdx.treeSkeleton || remoteIdx.treeData;
          if (remoteSkel) {
            treeData = mergeTreeStructures(treeData, remoteSkel);
            pruneDeletedNodesFromTree(treeData);
          }
        } catch (e) {}
      }

      const indexPayload = JSON.stringify({
        format: 'aicockpit-v18-multifile',
        savedAt: new Date().toISOString(),
        lastModified: treeData.lastModified || Date.now(),
        activeThreadId,
        currentProvider,
        currentModel,
        uiPrefs,
        costLedger,
        deletedNodeIds: Array.from(gdriveDeletedNodeIds).slice(-5000),
        deletedMsgIds: Array.from(gdriveDeletedMsgIds).slice(-10000),
        treeSkeleton: buildSkeletonTree(treeData)
      }, null, 2);

      if (gdriveRemoteFileId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${gdriveRemoteFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${gdriveAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: indexPayload
        });
      } else {
        const meta = {
          name: 'tree_index.json',
          mimeType: 'application/json',
          ...(isAppData ? { parents: ['appDataFolder'] } : {})
        };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
        form.append('file', new Blob([indexPayload], { type: 'application/json' }));
        const created = await gdriveFetchJson('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST',
          body: form
        });
        if (created && created.id) gdriveRemoteFileId = created.id;
      }

      // Spara även en komplett backup i `min_ai_cockpit.aicockpit` när man trycker manuellt på "Spara till Drive nu"
      gdriveLastSyncedModified = Date.now();
      renderAll();
      updateGdriveUiState(`✅ Krockfri synk klar (${targets.length} tråd${targets.length === 1 ? '' : 'ar'} + index kl ${new Date().toLocaleTimeString()})!`);
    } catch (e) {
      updateGdriveUiState('❌ Kunde inte spara till Google Drive: ' + e.message, true);
      showAutosaveToast('⚠️ Google Drive-synk misslyckades: ' + e.message);
    } finally {
      gdriveIsSyncing = false;
    }
  }

  function scheduleGdriveAutoSync(dirtyThreadId = null) {
    if (dirtyThreadId) gdriveDirtyThreadIds.add(dirtyThreadId);
    if (!gdriveConfig.autoSync || !isGdriveTokenValid()) return;
    if (gdriveAutoSyncTimer) clearTimeout(gdriveAutoSyncTimer);
    gdriveAutoSyncTimer = setTimeout(() => {
      const ids = Array.from(gdriveDirtyThreadIds);
      gdriveDirtyThreadIds.clear();
      pushToGoogleDrive(true, ids);
    }, 1600);
  }

  // --- V18 NYA FUNKTIONER: FLYTTA/RADERA MEDDELANDEN, UNDERTRÅDAR & KOD-UPPGRADERING ---
  function quickUpgradeForCoding() {
    if (currentProvider === 'gemini') {
      currentModel = 'gemini-4.0-argon';
    } else if (currentProvider === 'openai') {
      currentModel = 'gpt-6.1-sol';
    } else if (currentProvider === 'anthropic') {
      currentModel = 'claude-sonnet-5-5';
    } else if (currentProvider === 'grok') {
      currentModel = 'grok-4.7';
    } else {
      currentProvider = 'gemini';
      currentModel = 'gemini-4.0-argon';
    }
    populateModelSelectors();
    showAutosaveToast(`👑 Bytte till ${currentModel} för skarp kodning och analys!`);
  }

  function deleteSingleMessage(msgId) {
    const thread = findNode(treeData, activeThreadId);
    if (!thread || !thread.messages) return;
    if (!confirm('Vill du ta bort detta meddelande permanent ur tråden?')) return;
    registerDeletedMessagesForSync([msgId]);
    thread.messages = thread.messages.filter(m => m.id !== msgId);
    selectedMessageIds.delete(msgId);
    saveTree(activeThreadId);
    renderAll();
  }

  function deleteSelectedMessages() {
    if (selectedMessageIds.size === 0) return;
    const thread = findNode(treeData, activeThreadId);
    if (!thread || !thread.messages) return;
    if (!confirm(`Vill du radera de ${selectedMessageIds.size} markerade meddelandena permanent?`)) return;
    registerDeletedMessagesForSync(Array.from(selectedMessageIds));
    thread.messages = thread.messages.filter(m => !selectedMessageIds.has(m.id));
    selectedMessageIds.clear();
    saveTree(activeThreadId);
    renderAll();
  }

  function quickMoveSingleOrPair(idx) {
    const thread = findNode(treeData, activeThreadId);
    if (!thread || !thread.messages) return;
    selectedMessageIds.clear();
    const m = thread.messages[idx];
    if (m) selectedMessageIds.add(m.id);
    // Om man klickar Flytta på en användarfråga och nästa meddelande är AI-svaret, markera båda automatiskt!
    const nextMsg = thread.messages[idx + 1];
    if (m && m.role === 'user' && nextMsg && nextMsg.role === 'assistant') {
      selectedMessageIds.add(nextMsg.id);
    } else if (m && m.role === 'assistant' && idx > 0 && thread.messages[idx - 1].role === 'user') {
      selectedMessageIds.add(thread.messages[idx - 1].id);
    }
    updateBatchActionBar();
    renderChat();
    openMoveMessagesModal();
  }

  function openMoveMessagesModal() {
    if (selectedMessageIds.size === 0) return;
    document.getElementById('moveModalMsgCount').textContent = String(selectedMessageIds.size);
    document.getElementById('moveNewThreadNameInput').value = '';
    const sel = document.getElementById('moveTargetThreadSelect');
    sel.innerHTML = '';
    const allThreads = collectAllThreadsWithPaths(treeData);
    allThreads.forEach(({ thread, pathStr }) => {
      if (thread.id === activeThreadId) return;
      const opt = document.createElement('option');
      opt.value = thread.id;
      opt.textContent = `💬 ${pathStr}`;
      sel.appendChild(opt);
    });
    openModal('moveMessagesModal');
  }

  function confirmMoveSelectedMessages() {
    const sourceThread = findNode(treeData, activeThreadId);
    if (!sourceThread || !sourceThread.messages) return;
    const newName = (document.getElementById('moveNewThreadNameInput').value || '').trim();
    const targetId = document.getElementById('moveTargetThreadSelect').value;

    const toMove = sourceThread.messages.filter(m => selectedMessageIds.has(m.id));
    if (!toMove.length) return;

    let destThread = null;
    if (newName) {
      destThread = {
        id: 't_mov_' + Date.now(),
        name: newName,
        type: 'thread',
        lastModified: Date.now(),
        messages: []
      };
      const path = findPath(treeData, activeThreadId);
      const parent = (path && path.length >= 2) ? path[path.length - 2] : treeData;
      if (!parent.children) parent.children = [];
      parent.children.push(destThread);
      parent.isOpen = true;
    } else if (targetId) {
      destThread = findNode(treeData, targetId);
    }

    if (!destThread) {
      alert('Välj en måltråd i listan eller skriv ett namn på en ny tråd.');
      return;
    }

    if (!destThread.messages) destThread.messages = [];
    destThread.messages.push(...toMove);
    destThread.lastModified = Date.now();
    sourceThread.messages = sourceThread.messages.filter(m => !selectedMessageIds.has(m.id));
    selectedMessageIds.clear();

    closeModal('moveMessagesModal');
    const prevThreadId = activeThreadId;
    activeThreadId = destThread.id;
    saveTree(prevThreadId);
    saveTree(destThread.id);
    renderAll();
    showAutosaveToast(`✅ Flyttade ${toMove.length} meddelanden till "${destThread.name}"!`);
  }

  function branchSelectedMessagesToNewThread() {
    const sourceThread = findNode(treeData, activeThreadId);
    if (!sourceThread || !sourceThread.messages || selectedMessageIds.size === 0) return;
    const defaultName = `Sidospår från ${sourceThread.name}`;
    const newName = prompt('Namn på den nya utbrutna tråden:', defaultName);
    if (!newName) return;

    const toMove = sourceThread.messages.filter(m => selectedMessageIds.has(m.id));
    const newThread = {
      id: 't_branch_' + Date.now(),
      name: newName.trim(),
      type: 'thread',
      lastModified: Date.now(),
      messages: toMove
    };

    const path = findPath(treeData, activeThreadId);
    const parent = (path && path.length >= 2) ? path[path.length - 2] : treeData;
    if (!parent.children) parent.children = [];
    parent.children.push(newThread);
    parent.isOpen = true;

    sourceThread.messages = sourceThread.messages.filter(m => !selectedMessageIds.has(m.id));
    selectedMessageIds.clear();

    const prevId = activeThreadId;
    activeThreadId = newThread.id;
    saveTree(prevId);
    saveTree(newThread.id);
    renderAll();
    showAutosaveToast(`🌿 Skapade ny tråd "${newThread.name}" med ${toMove.length} meddelanden!`);
  }

  function branchRecentToSubthread() {
    const sourceThread = findNode(treeData, activeThreadId);
    if (!sourceThread || !sourceThread.messages) return;
    const activeMsgs = sourceThread.messages.filter(m => m.inContext !== false);
    const recent = activeMsgs.slice(-4).map(m => ({ ...m, id: 'br_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6) }));
    const newName = prompt('Namn på ny fortsättningstråd (tar med de 4 senaste aktiva meddelandena som startkontext):', `${sourceThread.name} (Del 2)`);
    if (!newName) return;

    const newThread = {
      id: 't_part_' + Date.now(),
      name: newName.trim(),
      type: 'thread',
      lastModified: Date.now(),
      messages: recent
    };

    const path = findPath(treeData, activeThreadId);
    const parent = (path && path.length >= 2) ? path[path.length - 2] : treeData;
    if (!parent.children) parent.children = [];
    parent.children.push(newThread);
    parent.isOpen = true;

    activeThreadId = newThread.id;
    saveTree(newThread.id);
    renderAll();
    showAutosaveToast(`🌿 Startade "${newThread.name}" med de ${recent.length} senaste meddelandena!`);
  }

  // --- V17 UPGRADE: GUIDAD SPECIALFUNKTIONS-STUDIO (LYRIA, VEO, BILD, SÖK, KOD) ---
  // ============================================================================
  let currentSpecStudioType = 'lyria';

  const SPEC_STUDIO_META = {
    lyria: {
      title: '🎵 Lyria Musik- & Låtstudio',
      btnText: '🔵 Skapa Låt & Lyria-komp nu! ➤',
      promptLabel: '✍️ 2. Vad ska låten handla om? (Person, resa, plats eller fritt tema):',
      placeholder: 'T.ex. "En trött pendlarhjälte på väg genom Stockholm", "Sommarkväll i skärgården" eller lämna tomt så bygger vi på tråden & platsen...',
      banner: '🎸 <strong>Så här bränner du tokens med stil i Lyria-studion:</strong><br>Välj genre, sångstil och om du vill krydda med din nuvarande tid, plats eller lokalhistoria. När du trycker på den <strong>blå knappen</strong> komponerar AI:n både en skräddarsydd låttext och ett optimerat <em>Lyria / MusicFX backing-track-recept</em> (BPM, tonart och instrument) baserat på din valda kontext!'
    },
    veo: {
      title: '🎬 Veo 2 Video- & Regissörsstudio',
      btnText: '🔵 Generera Veo-scen & Storyboard! ➤',
      promptLabel: '✍️ 2. Vilken scen eller händelse vill du filma?',
      placeholder: 'T.ex. "En svart bil med falkvingedörrar som glider fram genom ett regnigt kvällskvarter"...',
      banner: '🎬 <strong>Så här fungerar Veo Videostudion:</strong><br>Välj filmstil och kamerarörelse. Du kan kryssa i att hämta din faktiska plats, tid på dygnet och lokalhistoria så skapas en komplett, fotorealistisk <em>Veo 2-videoprompt + bild-för-bild-storyboard</em> redo att köras!'
    },
    image: {
      title: '🖼️ AI Bildstudio (GPT-Image-2 & Imagen 3)',
      btnText: '🔵 Generera Bild (Betala & se glad ut!) ➤',
      promptLabel: '✍️ 2. Beskriv bilden du vill måla upp:',
      placeholder: 'T.ex. "En dramatisk oljemålning av det vi nyss pratade om i tråden" eller "En 2D-spelhjälte i pixel-art"...',
      banner: '🖼️ <strong>Varning för äkta bild-tokens:</strong><br>Här målar vi på riktigt! Väljer du <strong>OpenAI GPT-Image-2</strong> (eller <strong>Gemini Imagen 3</strong>) skapas en riktig högupplöst bild direkt i chattråden (kostar ca 0,40–0,80 kr per bild). Vill du att bilden ska spegla platsen du befinner dig på eller samtalet hittills? Kryssa bara i rutorna nedan!'
    },
    grounding: {
      title: '🔍 Gemini Live Webbsökning (Google Search Grounding)',
      btnText: '🔵 Sök live på Google & Svara! ➤',
      promptLabel: '✍️ 2. Vad vill du att Gemini ska dammsuga nätet efter?',
      placeholder: 'T.ex. "Vad händer i det här området idag och vad har platsen för historia?" eller "Kolla aktuella reservdelspriser"...',
      banner: '🔍 <strong>Kopplar upp Gemini direkt mot Google Sök i realtid:</strong><br>Slår på <code>google_search</code>-verktyget i API-anropet så att modellen slutar gissa och istället hämtar färska fakta från webben. Perfekt i kombination med kryssrutan för <em>min nuvarande plats & lokalhistoria</em>!'
    },
    openaiWebSearch: {
      title: '🌐 OpenAI Deep Web Search (Responses API)',
      btnText: '🔵 Kör OpenAI Webbsökning nu! ➤',
      promptLabel: '✍️ 2. Vad ska OpenAI söka upp och granska på nätet?',
      placeholder: 'T.ex. "Jämför aktuella recensioner och priser..."',
      banner: '🌐 <strong>OpenAI Live Web Search:</strong><br>Aktiverar OpenAI:s inbyggda webbsökningsverktyg (<code>web_search</code>) i Responses API. Modellen söker igenom nätet och levererar ett strukturerat svar med aktuella uppgifter.'
    },
    codeInterpreter: {
      title: '🧮 Python, Matematik & Dataanalys (Code Interpreter)',
      btnText: '🔵 Kör Beräkning & Analys! ➤',
      promptLabel: '✍️ 2. Beskriv uträkningen, datan eller koden du vill ha:',
      placeholder: 'T.ex. "Räkna ut lönsamheten på den här kalkylen steg för steg" eller "Skriv ett Python-skript som..."',
      banner: '🧮 <strong>Slipp huvudräkning och killgissningar:</strong><br>Tvingar AI:n att räkna och analysera systematiskt (och aktiverar <code>code_interpreter</code>-containern på OpenAI-modeller) så att siffror, tabeller och kod blir 100 % genomräknade.'
    }
  };

  function openSpecialStudioModal(type = 'lyria') {
    switchSpecialStudioTab(type);
    // Om användaren redan har skrivit något i chattrutan, lyft in det som förslag i popupens textruta
    const draft = document.getElementById('promptInput')?.value?.trim() || '';
    const customBox = document.getElementById('specCustomPromptInput');
    if (draft && customBox && !customBox.value.trim()) {
      customBox.value = draft;
    }
    // Synka GPS-kryssrutan om användaren redan har slagit på Plats i chatten
    const locChk = document.getElementById('spec_ctx_location');
    if (locChk && uiPrefs.smartLoc && uiPrefs.cachedLocationText) {
      locChk.checked = true;
      const badge = document.getElementById('specLocationBadge');
      if (badge) {
        badge.style.display = 'block';
        badge.textContent = `📍 Aktiv position redo: ${uiPrefs.cachedLocationText}`;
      }
    }
    updateSpecCostPreview();
    openModal('specialStudioModal');
  }

  function switchSpecialStudioTab(type) {
    currentSpecStudioType = type;
    const allTypes = ['lyria', 'veo', 'image', 'grounding', 'openaiWebSearch', 'codeInterpreter'];
    allTypes.forEach(t => {
      const btn = document.getElementById('specTab_' + t);
      const pane = document.getElementById('specPane_' + t);
      if (btn) btn.classList.toggle('active', t === type);
      if (pane) pane.style.display = (t === type) ? 'flex' : 'none';
    });

    const meta = SPEC_STUDIO_META[type] || SPEC_STUDIO_META.lyria;
    document.getElementById('specModalTitle').textContent = meta.title;
    document.getElementById('specExplainBanner').innerHTML = meta.banner;
    document.getElementById('specPromptLabel').textContent = meta.promptLabel;
    document.getElementById('specCustomPromptInput').placeholder = meta.placeholder;
    document.getElementById('specExecuteBlueBtn').textContent = meta.btnText;
    updateSpecCostPreview();
  }

  function onSpecLocationToggle(checked) {
    const badge = document.getElementById('specLocationBadge');
    if (!checked) {
      if (badge) badge.style.display = 'none';
      updateSpecCostPreview();
      return;
    }
    if (uiPrefs.cachedLocationText && !uiPrefs.cachedLocationText.includes('nekad')) {
      if (badge) {
        badge.style.display = 'block';
        badge.textContent = `📍 Aktiv position: ${uiPrefs.cachedLocationText}`;
      }
      updateSpecCostPreview();
      return;
    }
    if (navigator.geolocation) {
      if (badge) {
        badge.style.display = 'block';
        badge.textContent = '⏳ Hämtar din GPS-position och ortnamn...';
      }
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude.toFixed(4);
        const lon = pos.coords.longitude.toFixed(4);
        let placeLabel = `${lat}, ${lon}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12`);
          if (r.ok) {
            const j = await r.json();
            const suburb = j?.address?.suburb || j?.address?.neighbourhood || j?.address?.village || '';
            const city = j?.address?.city || j?.address?.town || j?.address?.municipality || '';
            const country = j?.address?.country || '';
            placeLabel = [suburb, city, country].filter(Boolean).join(', ') + ` (${lat}, ${lon})`;
          }
        } catch (e) {}
        uiPrefs.cachedLocationText = placeLabel;
        uiPrefs.smartLoc = true;
        saveUiPrefs();
        applyUiPrefsToDom();
        if (badge) badge.textContent = `📍 Position klar: ${placeLabel}`;
        updateSpecCostPreview();
      }, () => {
        if (badge) badge.textContent = '⚠️ Kunde inte hämta GPS – skriv gärna orten i textfältet nedan istället.';
      }, { timeout: 6000 });
    }
  }

  function buildSpecialStudioContextBlock() {
    const useThread = document.getElementById('spec_ctx_thread')?.checked;
    const useDate = document.getElementById('spec_ctx_datetime')?.checked;
    const useLoc = document.getElementById('spec_ctx_location')?.checked;
    const useLore = document.getElementById('spec_ctx_locallore')?.checked;

    const ctxLines = [];
    const now = new Date();
    if (useDate) {
      ctxLines.push(`- Aktuell tid och datum: ${now.toLocaleDateString('sv-SE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} kl. ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}.`);
    }
    if (useLoc && uiPrefs.cachedLocationText) {
      ctxLines.push(`- Aktuell geografisk plats: ${uiPrefs.cachedLocationText}.`);
    }
    if (useLore) {
      ctxLines.push(`- Lokal förankring & historia: Väv naturligt in intressanta detaljer om vad som kännetecknar detta område, dess lokalhistoria, atmosfär eller vad som brukar hända här vid den här tiden.`);
    }
    if (useThread) {
      const thread = findNode(treeData, activeThreadId);
      const activeMsgs = (thread?.messages || []).filter(m => m.inContext !== false);
      if (activeMsgs.length > 0) {
        const snippet = activeMsgs.slice(-4).map(m => `${m.role === 'user' ? 'Användare' : 'AI'}: ${m.text.slice(0, 220)}`).join(' | ');
        ctxLines.push(`- Bakgrund från pågående konversation: ${snippet}`);
      }
    }
    return ctxLines.length ? `\n\nKONTEXT & INSPIRATION ATT VÄVA IN:\n${ctxLines.join('\n')}` : '';
  }

  function updateSpecCostPreview() {
    const valEl = document.getElementById('specCostValue');
    if (!valEl) return;
    const customTxt = document.getElementById('specCustomPromptInput')?.value || '';
    const ctxTxt = buildSpecialStudioContextBlock();
    const useThread = document.getElementById('spec_ctx_thread')?.checked;
    const activeNode = findNode(treeData, activeThreadId);
    const baseTokens = useThread && activeNode ? getNodeMetrics(activeNode).activeTokens : 0;
    const estIn = baseTokens + countTokens(customTxt + ctxTxt) + 180;

    if (currentSpecStudioType === 'image') {
      const eng = document.getElementById('spec_img_engine')?.value || 'openai_direct';
      // GPT-Image-2 / Imagen 3 1024x1024 medium ligger runt $0.04 per bild
      const imgUsd = eng === 'openai_direct' ? 0.04 : 0.03;
      valEl.textContent = `~${formatCurrency(imgUsd, 2)} (1 högupplöst bild)`;
      return;
    }

    let prov = currentProvider;
    let mod = currentModel;
    if (currentSpecStudioType === 'grounding') {
      prov = 'gemini';
      mod = currentProvider === 'gemini' ? currentModel : 'gemini-3.8-flash';
    } else if (currentSpecStudioType === 'openaiWebSearch') {
      prov = 'openai';
      mod = currentProvider === 'openai' ? currentModel : 'gpt-6.1-sol';
    }
    const usd = calculateCallCostUsd(prov, mod, estIn, 750);
    valEl.textContent = `~${formatCurrency(usd, 3)} (${PROVIDERS[prov]?.name.split(' ')[0]} • ${mod})`;
  }

  async function executeSpecialStudioAction() {
    const customIdea = (document.getElementById('specCustomPromptInput')?.value || '').trim();
    const ctxBlock = buildSpecialStudioContextBlock();
    const useLore = document.getElementById('spec_ctx_locallore')?.checked;

    // Om användaren valt lokalhistoria + Gemini finns tillgängligt, slå gärna på grounding så fakta om platsen blir äkta!
    if (useLore && currentProvider === 'gemini') {
      features.grounding = true;
      document.getElementById('featGrounding')?.classList.add('active');
    }

    if (currentSpecStudioType === 'image') {
      const eng = document.getElementById('spec_img_engine')?.value || 'openai_direct';
      const style = document.getElementById('spec_img_style')?.value || '';
      const finalImgPrompt = [
        `Skapa en bild i stilen ${style}.`,
        customIdea ? `Motiv: ${customIdea}` : 'Motiv baserat på vår pågående konversation och plats.',
        ctxBlock
      ].filter(Boolean).join('\n');

      closeModal('specialStudioModal');
      document.getElementById('promptInput').value = finalImgPrompt;
      onPromptInput();
      if (eng === 'openai_direct') {
        await generateOpenAIImage();
      } else {
        await generateGeminiImageOrPrompt(finalImgPrompt);
      }
      return;
    }

    let builtPrompt = '';
    let overrideProv = null;
    let overrideMod = null;

    if (currentSpecStudioType === 'lyria') {
      const genre = document.getElementById('spec_lyria_genre')?.value || '';
      const vibe = document.getElementById('spec_lyria_vibe')?.value || '';
      document.getElementById('featLyria')?.classList.add('active');
      builtPrompt = [
        `🎵 UPPDRAG – LYRIA MUSIKSTUDIO:`,
        `Genre & Stil: ${genre}`,
        `Upplägg & Karaktär: ${vibe}`,
        customIdea ? `Tema / Handling: ${customIdea}` : `Tema: Utgå från vår konversation och den valda plats-/tidskontexten.`,
        ctxBlock,
        ``,
        `LEVERERA FÖLJANDE:`,
        `1. Om sång valts: En träffsäker, rytmisk och sångbar låttext på svenska (Vers 1, Refräng, Vers 2, Refräng, Outro) med ackordanalys ovanför raderna.`,
        `2. En skottsäker engelsk **Lyria / MusicFX Audio Prompt** (med exakt BPM, taktart, tonart, instrumentering och produktionsstil, och "strictly instrumental, no vocals" om rent komp valdes).`
      ].filter(Boolean).join('\n');
    } else if (currentSpecStudioType === 'veo') {
      const style = document.getElementById('spec_veo_style')?.value || '';
      const cam = document.getElementById('spec_veo_camera')?.value || '';
      document.getElementById('featVeo')?.classList.add('active');
      builtPrompt = [
        `🎬 UPPDRAG – VEO 2 VIDEOSTUDIO:`,
        `Visuell stil: ${style}`,
        `Kamerarörelse & Ljus: ${cam}`,
        customIdea ? `Scen & Handling: ${customIdea}` : `Scen: Skapa en filmisk scen baserad på vår konversation och plats-/tidskontext.`,
        ctxBlock,
        ``,
        `LEVERERA FÖLJANDE:`,
        `1. En kort storyboard i 3 klipp (Klipp 1: Etablering, Klipp 2: Huvudaction, Klipp 3: Avslutande bild) med ljudeffekter och dialog/voiceover.`,
        `2. En optimerad engelsk **Veo 2 Video Generation Prompt** (motiv, miljö, kamerarörelse, linser, ljussättning och atmosfär) redo att generera videon.`
      ].filter(Boolean).join('\n');
    } else if (currentSpecStudioType === 'grounding') {
      const focus = document.getElementById('spec_grounding_focus')?.value || '';
      features.grounding = true;
      document.getElementById('featGrounding')?.classList.add('active');
      overrideProv = 'gemini';
      overrideMod = currentProvider === 'gemini' ? currentModel : 'gemini-3.8-flash';
      builtPrompt = [
        `🔍 UPPDRAG MED LIVE GOOGLE WEBBSÖKNING:`,
        `Fokus: ${focus}`,
        customIdea ? `Fråga / Ämne: ${customIdea}` : `Uppdrag: Berätta vad som är aktuellt och intressant utifrån angiven plats, tid och vår tråd.`,
        ctxBlock
      ].filter(Boolean).join('\n');
    } else if (currentSpecStudioType === 'openaiWebSearch') {
      const focus = document.getElementById('spec_oaisearch_focus')?.value || '';
      features.openaiWebSearch = true;
      document.getElementById('featOpenAISearch')?.classList.add('active');
      overrideProv = 'openai';
      overrideMod = currentProvider === 'openai' ? currentModel : 'gpt-6.1-sol';
      builtPrompt = [
        `🌐 UPPDRAG MED OPENAI WEBBSÖKNING:`,
        `Fokus: ${focus}`,
        customIdea ? `Fråga / Ämne: ${customIdea}` : `Uppdrag: Sök upp aktuell information kopplad till vår konversation.`,
        ctxBlock
      ].filter(Boolean).join('\n');
    } else if (currentSpecStudioType === 'codeInterpreter') {
      const focus = document.getElementById('spec_code_focus')?.value || '';
      features.codeInterpreter = true;
      document.getElementById('featCode')?.classList.add('active');
      builtPrompt = [
        `🧮 UPPDRAG – DATAANALYS, MATEMATIK & KOD:`,
        `Arbetssätt: ${focus}`,
        customIdea ? `Uppgift: ${customIdea}` : `Uppgift: Räkna igenom och analysera siffrorna/problemet i vår pågående tråd.`,
        ctxBlock
      ].filter(Boolean).join('\n');
    }

    closeModal('specialStudioModal');
    document.getElementById('specCustomPromptInput').value = '';
    const input = document.getElementById('promptInput');
    input.value = builtPrompt;
    onPromptInput();
    await sendMessage(null, overrideProv, overrideMod);
  }

  async function generateGeminiImageOrPrompt(promptText) {
    if (!apiKeys.gemini) {
      alert('Lägg först in din Google Gemini API-nyckel under 🔑 API-nycklar (eller välj OpenAI GPT-Image-2 om du har OpenAI-nyckel).');
      return;
    }
    const thread = ensureValidActiveThread();
    const cleanKey = (apiKeys.gemini || '').replace(/\s+/g, '');
    const btn = document.getElementById('featImage');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Målar med Gemini…'; }
    try {
      // Försök anropa Imagen 3 via Gemini API om aktiverat på nyckeln, annars generera bild via Gemini 2.5 Flash image-generation / rik bildprompt
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(cleanKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: promptText }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          const raw = atob(b64);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          const imageUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
          const costUsd = 0.03;
          costLedger.providersUsd.gemini = (costLedger.providersUsd.gemini || 0) + costUsd;
          saveLedger();
          thread.messages.push({
            id: 'img_gem_' + Date.now(),
            role: 'assistant',
            provider: 'gemini',
            model: 'imagen-3.0',
            text: '🎨 Bild skapad med Google Imagen 3:\n' + promptText,
            imageUrl,
            costUsd,
            inContext: false,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
          document.getElementById('promptInput').value = '';
          onPromptInput();
          saveTree();
          renderAll();
          scrollPageTo('bottom');
          return;
        }
      }
      // Om kontot inte har Imagen-predict påslaget, skicka som vanliga Gemini-anropet
      await sendMessage();
    } catch (e) {
      await sendMessage();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🖼️ Bildstudio (Imagen / GPT-Image)'; }
    }
  }


  // ============================================================================
  // --- V578 (378) UPGRADES:
  //     1. INTERCOM-LÄGET (DOLD SLASKTRÅD "__intercom__", STATELESS + 45s FÖLJDFRÅGEFÖNSTER)
  //     2. DAGENS BRIEF + OCR-VAKTHUND (INGESTION FILTER) + LIVE-SENSORER (TID/GPS)
  //     3. KAFFESÄKRAD DUBBELLAGRING (HANDSKFACK sessionStorage + MUGGHÅLLARE localStorage + IndexedDB + Drive)
  //     4. METADATA-NORMALISERING, KATALOGSORTERING & AUTO-TRIAGE
  //     5. RUSTIKT "SLÄGGSÖK" (0ms EXAKT TEXTMATCHNING I RAM + DIREKT MASSFLYTT & NC-INTEGRATION)
  // ============================================================================

  const INTERCOM_THREAD_ID = '__intercom__';
  const INTERCOM_FOLLOWUP_MS = 45000; // 45 sekunders följdfrågefönster

  // 1. KAFFESÄKRAD DUBBELLAGRING (Tiered Caching: RAM + Handskfack sessionStorage + Mugghållare localStorage + Bagage IndexedDB)
  let intercomState = {
    brief: '',
    modelSpec: 'gemini:gemini-3.5-flash-lite',
    ttsEnabled: true,
    sensorTime: true,
    sensorGps: true,
    lastExchange: null, // { userText, botText, timestamp } — lever ENDAST i RAM i 45 sekunder!
    pendingOcrImage: null,
    isListening: false,
    recognition: null
  };

  let intercomCountdownTimer = null;
  let currentRusticQuery = '';
  let currentTreeSortMode = 'default';

  function idbOpenCockpitBackupStore() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB saknas'));
      const req = indexedDB.open('ai_cockpit_v578_vault', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbWriteVault(key, val) {
    try {
      const db = await idbOpenCockpitBackupStore();
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, key);
    } catch (e) {}
  }

  async function idbReadVault(key) {
    try {
      const db = await idbOpenCockpitBackupStore();
      return await new Promise((resolve) => {
        const tx = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  // Säkerställer att den dolda slasktråden "__intercom__" alltid finns i datastrukturen (så den synkas till Google Drive) men ALDRIG visas i vanliga trädet
  function getOrInitIntercomThread() {
    if (!treeData.children) treeData.children = [];
    let icNode = findNode(treeData, INTERCOM_THREAD_ID);
    if (!icNode) {
      icNode = {
        id: INTERCOM_THREAD_ID,
        name: '🎙️ Intercom Slasklogg (Dold)',
        type: 'thread',
        hiddenIntercom: true,
        lastModified: Date.now(),
        messages: []
      };
      treeData.children.push(icNode);
    }
    // Alla meddelanden i slaskkonversationen sätts strikt till inContext = false by default
    (icNode.messages || []).forEach(m => { m.inContext = false; });
    return icNode;
  }

  // Spara både i Handskfacket (sessionStorage) och Mugghållaren (localStorage) + Bagaget (IndexedDB - obegränsat utrymme!)
  function syncTieredCache() {
    try {
      // 1. Bagageutrymmet (IndexedDB - asynkron stordisk som sväljer 25MB+ utan 5MB-spärr!)
      idbWriteVault('tree_backup_v578', treeData);

      const icNode = getOrInitIntercomThread();
      const icConfigObj = {
        brief: intercomState.brief,
        modelSpec: intercomState.modelSpec,
        ttsEnabled: intercomState.ttsEnabled,
        sensorTime: intercomState.sensorTime,
        sensorGps: intercomState.sensorGps,
        updatedAt: Date.now()
      };
      const icConfigPayload = JSON.stringify(icConfigObj);
      try {
        sessionStorage.setItem('ai_cockpit_glovebox_ic_cfg', icConfigPayload);
        localStorage.setItem('ai_cockpit_cupholder_ic_cfg', icConfigPayload);
      } catch (e) {}

      const icLogPayload = JSON.stringify(icNode.messages || []);
      try {
        sessionStorage.setItem('ai_cockpit_glovebox_ic_log', icLogPayload);
        localStorage.setItem('ai_cockpit_cupholder_ic_log', icLogPayload);
      } catch (e) {}

      idbWriteVault('intercom_log_v578', icNode.messages || []);
      idbWriteVault('intercom_cfg_v578', icConfigObj);
    } catch (e) {}
  }

  // Auto-Recovery vid uppstart: Om Handskfacket (sessionStorage) är tomt efter krasch/stängd flik, läs direkt från Mugghållaren (localStorage) eller Bagaget (IndexedDB) och lägg i Handskfacket!
  async function recoverTieredCacheOnStartup() {
    try {
      let cfgRaw = sessionStorage.getItem('ai_cockpit_glovebox_ic_cfg');
      let recoveredFrom = null;
      if (!cfgRaw) {
        cfgRaw = localStorage.getItem('ai_cockpit_cupholder_ic_cfg');
        if (cfgRaw) {
          sessionStorage.setItem('ai_cockpit_glovebox_ic_cfg', cfgRaw);
          recoveredFrom = 'Mugghållaren (localStorage)';
        }
      }
      if (!cfgRaw) {
        const idbCfg = await idbReadVault('intercom_cfg_v578');
        if (idbCfg) {
          cfgRaw = JSON.stringify(idbCfg);
          sessionStorage.setItem('ai_cockpit_glovebox_ic_cfg', cfgRaw);
          localStorage.setItem('ai_cockpit_cupholder_ic_cfg', cfgRaw);
          recoveredFrom = 'Bagageutrymmet (IndexedDB)';
        }
      }
      if (cfgRaw) {
        const parsedCfg = JSON.parse(cfgRaw);
        intercomState.brief = parsedCfg.brief || '';
        intercomState.modelSpec = parsedCfg.modelSpec || 'gemini:gemini-3.5-flash-lite';
        intercomState.ttsEnabled = parsedCfg.ttsEnabled !== false;
        intercomState.sensorTime = parsedCfg.sensorTime !== false;
        intercomState.sensorGps = parsedCfg.sensorGps !== false;
      }

      const icNode = getOrInitIntercomThread();
      let logRaw = sessionStorage.getItem('ai_cockpit_glovebox_ic_log');
      if (!logRaw) {
        logRaw = localStorage.getItem('ai_cockpit_cupholder_ic_log');
        if (logRaw) sessionStorage.setItem('ai_cockpit_glovebox_ic_log', logRaw);
      }
      if (logRaw) {
        const parsedMsgs = JSON.parse(logRaw);
        if (Array.isArray(parsedMsgs) && parsedMsgs.length > (icNode.messages || []).length) {
          icNode.messages = parsedMsgs.map(m => ({ ...m, inContext: false }));
        }
      } else {
        const idbMsgs = await idbReadVault('intercom_log_v578');
        if (Array.isArray(idbMsgs) && idbMsgs.length > (icNode.messages || []).length) {
          icNode.messages = idbMsgs.map(m => ({ ...m, inContext: false }));
          recoveredFrom = recoveredFrom || 'IndexedDB';
        }
      }

      // Rensa alltid bort eventuella raderade noder ur lokal startdata direkt
      pruneDeletedNodesFromTree(treeData);

      // Om hela trädet ligger i IndexedDB (särskilt vid >5MB Takeout-import där localStorage bara har ett skelett), återställ men respektera alltid raderingar!
      const idbTree = await idbReadVault('tree_backup_v578');
      if (idbTree && idbTree.id === 'root') {
        pruneDeletedNodesFromTree(idbTree);
        const idbMod = idbTree.lastModified || 0;
        const curMod = treeData.lastModified || 0;
        if (treeData.isLargeIndexedDbStore || idbMod > curMod) {
          treeData = idbTree;
          recoveredFrom = 'IndexedDB-kassaskåpet';
          ensureValidActiveThread();
          renderAll();
        }
      }

      if (recoveredFrom) {
        console.log(`[AI-Cockpit v578] Auto-recovery: Skyfflade över data från ${recoveredFrom} till Handskfacket.`);
      }
      syncTieredCache();
    } catch (e) {}
  }

  // saveTree anropar nu syncTieredCache asynkront via 250ms debounce för 0ms UI-lagg

