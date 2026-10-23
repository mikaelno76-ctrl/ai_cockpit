/**
 * AI-Cockpit — Huvudapplikation, Vy-växlare & Trädrendering (assets/js/app.js)
 */
window.CockpitApp = {
  switchView(viewName) {
    CockpitState.activeView = viewName;
    const viewChat = document.getElementById('viewChat');
    const viewRocket = document.getElementById('viewRocket');
    const tabChat = document.getElementById('tabBtnChat');
    const tabRocket = document.getElementById('tabBtnRocket');

    if (viewName === 'rocket') {
      viewChat.classList.add('hidden');
      viewRocket.classList.remove('hidden');
      tabChat.classList.remove('active');
      tabRocket.classList.add('active');
    } else {
      viewRocket.classList.add('hidden');
      viewChat.classList.remove('hidden');
      tabRocket.classList.remove('active');
      tabChat.classList.add('active');
    }
  },

  renderTree() {
    const container = document.getElementById('treeContainer');
    const groups = {};
    CockpitState.workspaceThreads.forEach(t => {
      const f = t.folder || 'Osorterat';
      if (!groups[f]) groups[f] = [];
      groups[f].push(t);
    });

    container.innerHTML = Object.keys(groups).map(folderName => {
      const itemsHtml = groups[folderName].map(t => `
        <div class="thread-item ${t.id === CockpitState.activeThreadId ? 'active' : ''}" onclick="CockpitApp.selectThread('${t.id}')">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${this.escapeHtml(t.title)}</span>
          <span class="provider-badge">${this.escapeHtml(t.provider)}</span>
        </div>
      `).join('');

      return `
        <div class="folder-group">
          <div class="folder-title">📁 ${this.escapeHtml(folderName)}</div>
          ${itemsHtml}
        </div>
      `;
    }).join('');
  },

  renderMessages() {
    const thread = CockpitState.getActiveThread();
    const listEl = document.getElementById('messagesList');
    if (!thread) {
      listEl.innerHTML = '';
      return;
    }

    document.getElementById('activeThreadTitle').textContent = thread.title;
    document.getElementById('activeThreadFolder').textContent = `(${thread.folder})`;

    let activeCount = 0;
    let activeChars = 0;

    listEl.innerHTML = thread.messages.map(m => {
      if (m.inContext) {
        activeCount++;
        activeChars += m.text.length;
      }
      return `
        <div class="msg-card ${m.role} ${m.inContext ? '' : 'out-of-context'}">
          <div class="msg-header">
            <span class="msg-role">${m.role === 'user' ? 'Du' : 'AI'}</span>
            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
              <input type="checkbox" ${m.inContext ? 'checked' : ''} onchange="CockpitApp.toggleMessageContext('${m.id}', this.checked)" />
              <span>Med i kontext</span>
            </label>
          </div>
          <div class="msg-body">${this.escapeHtml(m.text)}</div>
          ${(!m.inContext && m.pruneReason) ? `<div class="prune-reason-badge">🧹 ${this.escapeHtml(m.pruneReason)}</div>` : ''}
        </div>
      `;
    }).join('');

    const estTokens = Math.round(activeChars / 4);
    document.getElementById('contextCounter').textContent =
      `${activeCount} / ${thread.messages.length} i kontext (~${estTokens} tokens)`;
  },

  toggleMessageContext(msgId, checked) {
    const thread = CockpitState.getActiveThread();
    if (!thread) return;
    const msg = thread.messages.find(m => m.id === msgId);
    if (msg) {
      msg.inContext = checked;
      if (checked) delete msg.pruneReason;
      this.renderMessages();
    }
  },

  selectThread(id) {
    CockpitState.activeThreadId = id;
    this.switchView('chat');
    this.renderAll();
  },

  createNewThread() {
    const title = prompt("Namn på ny tråd:", "Ny diskussion");
    if (!title) return;
    const folder = prompt("Mapp i trädet:", "Allmänt") || "Allmänt";
    const newT = {
      id: 't_' + Date.now(),
      title,
      folder,
      provider: 'cockpit',
      messages: []
    };
    CockpitState.workspaceThreads.push(newT);
    CockpitState.activeThreadId = newT.id;
    this.switchView('chat');
    this.renderAll();
  },

  sendMessage() {
    const input = document.getElementById('promptInput');
    const txt = input.value.trim();
    if (!txt) return;
    const thread = CockpitState.getActiveThread();
    if (!thread) return;

    const activeContextCount = thread.messages.filter(m => m.inContext).length;

    thread.messages.push({
      id: 'm_' + Date.now(),
      role: 'user',
      text: txt,
      timestamp: Date.now(),
      inContext: true
    });

    thread.messages.push({
      id: 'm_' + (Date.now() + 1),
      role: 'model',
      text: `[Svar genererat med ${activeContextCount + 1} aktiva kontext-meddelanden i ryggen.]`,
      timestamp: Date.now() + 10,
      inContext: true
    });

    input.value = '';
    this.renderMessages();
  },

  exportWorkspace() {
    const blob = new Blob([JSON.stringify({ threads: CockpitState.workspaceThreads }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-cockpit-modular-backup.json';
    a.click();
  },

  showToast(msg, showUndo = false) {
    const bar = document.getElementById('toast-bar');
    const undoBtn = document.getElementById('toast-undo-btn');
    document.getElementById('toast-text').textContent = msg;
    undoBtn.style.display = showUndo ? 'inline-flex' : 'none';
    bar.style.display = 'flex';
    setTimeout(() => { bar.style.display = 'none'; }, 7500);
  },

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  renderAll() {
    this.renderTree();
    this.renderMessages();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  CockpitApp.renderAll();
});
