/**
 * AI-Cockpit — Smart Auto-rensa Kontext (assets/js/context-pruner.js)
 */
window.CockpitPruner = {
  async autoPruneCurrentThread() {
    const thread = CockpitState.getActiveThread();
    if (!thread || thread.messages.length <= 3) {
      alert("Tråden är så kort att alla meddelanden redan behövs i kontexten.");
      return;
    }

    // Spara tilstånd för Ångra-knappen
    CockpitState.lastPrunedBackup = {
      threadId: thread.id,
      states: thread.messages.map(m => ({
        id: m.id,
        inContext: m.inContext,
        pruneReason: m.pruneReason
      }))
    };

    const apiKey = document.getElementById('apiKeyInput').value.trim();

    if (apiKey) {
      try {
        const payloadMessages = thread.messages.map((m, idx) => ({
          id: m.id,
          index: idx,
          role: m.role,
          preview: m.text.slice(0, 220)
        }));

        const sysPrompt = `Du är en kontext-städare i AI-Cockpit.
Regler:
1. Rör ALDRIG första meddelandet (index 0) eller de sista 2 meddelandena.
2. Identifiera meddelanden i mitten som är avslutade felsökningar, felklistrade stickspår eller utdaterat brus.
Returnera ENDAST giltig JSON: {"disable": [{"id": "m3", "reason": "Avklarat Python-stickspår"}]}`;

        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: sysPrompt + "\n\nMeddelanden:\n" + JSON.stringify(payloadMessages) }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        const result = await resp.json();
        const rawJson = result.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = JSON.parse(rawJson);

        let savedChars = 0;
        let count = 0;
        (parsed.disable || []).forEach(item => {
          const msg = thread.messages.find(m => m.id === item.id);
          if (msg && msg.inContext) {
            msg.inContext = false;
            msg.pruneReason = item.reason || "Auto-urkopplad av Flash-Lite";
            savedChars += msg.text.length;
            count++;
          }
        });

        CockpitApp.renderMessages();
        const estTokens = Math.round(savedChars / 4);
        CockpitApp.showToast(`🧹 ${count} inlägg urkopplade ur kontexten (sparade ~${estTokens} tokens).`, true);
        return;
      } catch (err) {
        console.warn("API-anrop föll tillbaka på lokal heuristik:", err);
      }
    }

    // Lokal reserv-heuristik (fungerar direkt utan API-nyckel)
    let prunedCount = 0;
    let savedChars = 0;
    const total = thread.messages.length;

    thread.messages.forEach((m, idx) => {
      if (idx === 0 || idx >= total - 2) return;

      const lower = m.text.toLowerCase();
      const isDeadEnd =
        lower.includes('råkade klistra in') ||
        lower.includes('strunta i') ||
        lower.includes('syntaxerror') ||
        lower.includes('fel flik') ||
        (idx < total - 3 && m.text.length < 180);

      if (isDeadEnd && m.inContext) {
        m.inContext = false;
        m.pruneReason = "Flash-Lite: Identifierat som avklarat sidospår / gammal felsökning";
        prunedCount++;
        savedChars += m.text.length;
      }
    });

    CockpitApp.renderMessages();
    const estTokens = Math.max(15, Math.round(savedChars / 4));
    CockpitApp.showToast(`🧹 ${prunedCount} inlägg togs bort ur aktiv kontext (sparade ~${estTokens} tokens).`, true);
  },

  undoLastPrune() {
    const backup = CockpitState.lastPrunedBackup;
    if (!backup) return;
    const thread = CockpitState.workspaceThreads.find(t => t.id === backup.threadId);
    if (thread) {
      backup.states.forEach(st => {
        const m = thread.messages.find(x => x.id === st.id);
        if (m) {
          m.inContext = st.inContext;
          m.pruneReason = st.pruneReason;
        }
      });
      CockpitApp.renderMessages();
    }
    document.getElementById('toast-bar').style.display = 'none';
  },

  restoreAllContext() {
    const thread = CockpitState.getActiveThread();
    if (!thread) return;
    thread.messages.forEach(m => {
      m.inContext = true;
      delete m.pruneReason;
    });
    CockpitApp.renderMessages();
  }
};
