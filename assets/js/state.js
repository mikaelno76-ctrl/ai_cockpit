/**
 * AI-Cockpit — Central State & Storage (assets/js/state.js)
 */
window.CockpitState = {
  activeView: 'chat', // 'chat' | 'rocket'
  activeThreadId: 'thread_welcome',
  lastPrunedBackup: null,

  workspaceThreads: [
    {
      id: 'thread_welcome',
      title: 'Tesla Model X — Framvagn & Kontexttest',
      folder: 'Fordon / Underhåll',
      provider: 'gemini',
      messages: [
        {
          id: 'm1',
          role: 'user',
          text: 'Vi ska gå igenom framvagnen på min svarta Tesla Model X 2016 (43 000 mil). Vilka symptom ger slitna övre länkarmar?',
          timestamp: 1729600000000,
          inContext: true
        },
        {
          id: 'm2',
          role: 'model',
          text: 'På en Model X med 43 000 mil märks slitna övre länkarmar främst genom ett tydligt knarrande eller gnisslande ljud vid låga hastigheter och rattutslag, samt glapp i spindelleden.',
          timestamp: 1729600060000,
          inContext: true
        },
        {
          id: 'm3',
          role: 'user',
          text: 'Vänta, jag råkade klistra in ett gammalt felmeddelande från Python här: SyntaxError: unexpected EOF while parsing.',
          timestamp: 1729600120000,
          inContext: true
        },
        {
          id: 'm4',
          role: 'model',
          text: 'Det ser ut som ett Python-syntaxfel där en parentes eller ett citattecken saknas på slutet. Vill du felsöka skriptet eller fortsätta med länkarmarna?',
          timestamp: 1729600180000,
          inContext: true
        },
        {
          id: 'm5',
          role: 'user',
          text: 'Strunta i Python-felet, det var fel flik! Tillbaka till bilen: vad bör jag tänka på kring däckslitage bak efter länkarmarna?',
          timestamp: 1729600240000,
          inContext: true
        },
        {
          id: 'm6',
          role: 'model',
          text: 'När framvagnen väl är justerad är det smart att göra en fyrhjulsinställning och hålla koll på cambervinkeln bak så att insidan på bakdäcken inte äts upp i förtid.',
          timestamp: 1729600300000,
          inContext: true
        }
      ]
    }
  ],

  getActiveThread() {
    return this.workspaceThreads.find(t => t.id === this.activeThreadId);
  }
};
