/**
 * AI-Cockpit — Filimportörer för Grok, ChatGPT & Native JSON (assets/js/importers.js)
 */
window.CockpitImporters = {
  /**
   * Parser för Grok Takeout (prod-grok-backend.json)
   */
  parseGrokTakeout(jsonData) {
    if (!jsonData || !Array.isArray(jsonData.conversations)) {
      throw new Error("Saknar 'conversations'-array i Grok-exporten.");
    }

    const threads = [];
    for (const entry of jsonData.conversations) {
      const convMeta = entry.conversation || {};
      const threadId = convMeta.id || 'grok_' + Math.random().toString(36).slice(2, 9);
      const title = convMeta.title || 'Grok-konversation';
      const messages = [];

      if (Array.isArray(entry.responses)) {
        for (const r of entry.responses) {
          const resp = r.response || r;
          if (!resp || typeof resp.message !== 'string') continue;

          const role = (resp.sender === 'human' || resp.sender === 'user') ? 'user' : 'model';
          let timestamp = Date.now();
          if (resp.create_time?.$date?.$numberLong) {
            timestamp = parseInt(resp.create_time.$date.$numberLong, 10);
          } else if (resp.create_time) {
            timestamp = new Date(resp.create_time).getTime() || Date.now();
          }

          messages.push({
            id: resp._id || 'gmsg_' + Math.random().toString(36).slice(2, 9),
            role: role,
            text: resp.message,
            timestamp: timestamp,
            inContext: true
          });
        }
      }

      messages.sort((a, b) => a.timestamp - b.timestamp);
      threads.push({
        id: threadId,
        title: title,
        folder: 'Importerat / Grok',
        provider: 'grok',
        messages: messages
      });
    }
    return threads;
  },

  /**
   * Snabbimport via filväljaren i toppen
   */
  handleQuickFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        // 1. Grok Takeout
        if (data && Array.isArray(data.conversations)) {
          const grokThreads = this.parseGrokTakeout(data);
          CockpitState.workspaceThreads.push(...grokThreads);
          if (grokThreads.length > 0) CockpitState.activeThreadId = grokThreads[0].id;
          CockpitApp.switchView('chat');
          CockpitApp.renderAll();
          CockpitApp.showToast(`Importerade ${grokThreads.length} trådar från Grok Takeout!`, false);
        }
        // 2. Native AI-Cockpit backup
        else if (data && Array.isArray(data.threads)) {
          CockpitState.workspaceThreads = data.threads;
          if (CockpitState.workspaceThreads.length > 0) {
            CockpitState.activeThreadId = CockpitState.workspaceThreads[0].id;
          }
          CockpitApp.switchView('chat');
          CockpitApp.renderAll();
          CockpitApp.showToast(`Läste in Cockpit-backup (${CockpitState.workspaceThreads.length} trådar).`, false);
        }
        // 3. ChatGPT conversations.json
        else if (Array.isArray(data)) {
          let count = 0;
          data.forEach(conv => {
            const msgs = [];
            if (conv.mapping) {
              Object.values(conv.mapping).forEach(node => {
                const m = node.message;
                if (m && m.content && Array.isArray(m.content.parts)) {
                  const txt = m.content.parts.join('\n').trim();
                  if (txt && (m.author.role === 'user' || m.author.role === 'assistant')) {
                    msgs.push({
                      id: m.id,
                      role: m.author.role === 'user' ? 'user' : 'model',
                      text: txt,
                      timestamp: (m.create_time || 0) * 1000,
                      inContext: true
                    });
                  }
                }
              });
            }
            if (msgs.length > 0) {
              msgs.sort((a, b) => a.timestamp - b.timestamp);
              CockpitState.workspaceThreads.push({
                id: conv.id || 'gpt_' + Math.random().toString(36).slice(2, 8),
                title: conv.title || 'ChatGPT-tråd',
                folder: 'Importerat / ChatGPT',
                provider: 'chatgpt',
                messages: msgs
              });
              count++;
            }
          });
          CockpitApp.switchView('chat');
          CockpitApp.renderAll();
          CockpitApp.showToast(`Importerade ${count} trådar från ChatGPT!`, false);
        } else {
          // Skicka vidare till Trestegsraketen om strukturen är okänd/rå
          CockpitApp.switchView('rocket');
          CockpitRocket.loadSampleTakeoutDump();
          CockpitApp.showToast("Okänd råstruktur — öppnade Trestegsraketen för semantisk sortering.", false);
        }
      } catch (err) {
        alert("Kunde inte tolka JSON-filen: " + err.message);
      }
    };
    reader.readAsText(file);
  }
};
