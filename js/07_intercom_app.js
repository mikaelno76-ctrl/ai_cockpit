function openIntercomCockpit() {
getOrInitIntercomThread();
document.getElementById('intercomBriefTextarea').value = intercomState.brief || '';
document.getElementById('intercomModelSelect').value = intercomState.modelSpec || 'gemini:gemini-3.5-flash-lite';
document.getElementById('intercomTtsChk').checked = intercomState.ttsEnabled !== false;
document.getElementById('icSensorTimeChk').checked = intercomState.sensorTime !== false;
document.getElementById('icSensorGpsChk').checked = intercomState.sensorGps !== false;
if (intercomState.sensorGps && !uiPrefs.cachedLocationText && navigator.geolocation) {
onIntercomGpsToggle(true);
}
updateIntercomSensorReadout();
updateIntercomFollowupUi();
renderIntercomLogStream();
document.getElementById('intercomOverlay').classList.add('open');
if (intercomCountdownTimer) clearInterval(intercomCountdownTimer);
intercomCountdownTimer = setInterval(updateIntercomFollowupUi, 500);
}
function closeIntercomCockpit() {
stopIntercomVoiceListen();
stopIntercomTts();
if (intercomCountdownTimer) {
clearInterval(intercomCountdownTimer);
intercomCountdownTimer = null;
}
document.getElementById('intercomOverlay').classList.remove('open');
}
function saveIntercomBriefConfig() {
intercomState.brief = document.getElementById('intercomBriefTextarea')?.value || '';
intercomState.modelSpec = document.getElementById('intercomModelSelect')?.value || 'gemini:gemini-3.5-flash-lite';
intercomState.ttsEnabled = document.getElementById('intercomTtsChk')?.checked !== false;
intercomState.sensorTime = document.getElementById('icSensorTimeChk')?.checked !== false;
intercomState.sensorGps = document.getElementById('icSensorGpsChk')?.checked !== false;
updateIntercomSensorReadout();
syncTieredCache();
}
function onIntercomBriefInput() {
const txt = document.getElementById('intercomBriefTextarea')?.value || '';
saveIntercomBriefConfig();
const alertBox = document.getElementById('intercomOcrAlert');
const alertTxt = document.getElementById('intercomOcrAlertText');
if (txt.length > 1800 && alertBox && alertTxt) {
alertTxt.innerHTML = `🛑 <strong>Stopp i maskin! (Vakthunden):</strong> Du har klistrat in ${txt.length} tecken råtext i Dagens Brief. Om Flash-Lite ska tugga igenom allt det där vid varje röstkommando tappar vi dyrbara millisekunder. Klicka nedan så komprimerar jag ner det till en ren, blixtsnabb hållpunktslista!`;
alertBox.classList.add('visible');
}
}
function handleIntercomBriefFile(event) {
const file = event.target.files?.[0];
if (!file) return;
const alertBox = document.getElementById('intercomOcrAlert');
const alertTxt = document.getElementById('intercomOcrAlertText');
if (file.type.startsWith('image/')) {
const reader = new FileReader();
reader.onload = (ev) => {
const dataUrl = String(ev.target.result || '');
const base64Data = dataUrl.split(',')[1] || '';
intercomState.pendingOcrImage = {
name: file.name,
kind: 'image',
mimeType: file.type,
base64Data
};
if (alertBox && alertTxt) {
alertTxt.innerHTML = `🛑 <strong>Stopp i maskin! Du laddade upp bilden "${escapeHtml(file.name)}":</strong><br>Det är absolut inte rekommenderat att skicka med tunga bilder i varje röstfråga när vi kör <strong>Flash 3.5 Lite</strong> för maximal snabbhet. Jag föreslår att jag läser bilden nu direkt, gör en engångs-OCR och skriver ut schemat/listan i vanlig hederlig text!`;
alertBox.classList.add('visible');
}
};
reader.readAsDataURL(file);
} else {
const reader = new FileReader();
reader.onload = (ev) => {
const rawText = String(ev.target.result || '');
const area = document.getElementById('intercomBriefTextarea');
area.value = (area.value ? area.value + '\n\n' : '') + rawText;
onIntercomBriefInput();
};
reader.readAsText(file);
}
event.target.value = '';
}
function dismissIntercomOcrAlert() {
intercomState.pendingOcrImage = null;
document.getElementById('intercomOcrAlert')?.classList.remove('visible');
}
async function distillIntercomBriefWithOcr() {
const btn = document.getElementById('btnRunBriefOcr');
const area = document.getElementById('intercomBriefTextarea');
const rawText = area.value.trim();
const imgAtt = intercomState.pendingOcrImage;
let prov = 'gemini';
let mod = 'gemini-3.8-flash';
if (!hasLiveKey('gemini')) {
const fb = ['openai', 'anthropic', 'grok'].find(p => hasLiveKey(p));
if (!fb) {
alert('Lägg in din Gemini/OpenAI API-nyckel under 🔑 API först så att jag kan köra OCR-skanningen!');
return;
}
prov = fb;
mod = PROVIDERS[prov].models[0].id;
}
btn.disabled = true;
btn.textContent = '⏳ Kör OCR-skanning & destillerar till ren text...';
const sys = [
'Du är en extremt snabb OCR- och textdestillator för en förar-cockpit.',
'Extrahera ENDAST tider, hållpunkter, platser, adresser, namn, telefonnummer eller maträtter.',
'Skala bort allt fluff och all layout. Returnera en kompakt, platt textlista så att en röstmodell kan läsa den på 1 millisekund.'
].join('\n');
const promptMsg = imgAtt
? `Gör en OCR-avläsning av denna bild (${imgAtt.name}) och skriv ut innehållet som kompakt, vanlig hederlig text för dagens brief.${rawText ? '\n\nTidigare anteckningar:\n' + rawText : ''}`
: `Destillera och komprimera följande text till en ultrakort hållpunktslista i ren text:\n\n${rawText}`;
try {
const r = await callAI(prov, mod, [{ role: 'user', text: promptMsg }], sys, {
maxTokens: 900,
noTools: true,
attachments: imgAtt ? [imgAtt] : []
});
chargeLedger(prov, mod, r.inTok ?? 400, r.outTok ?? countTokens(r.text));
area.value = r.text.trim();
intercomState.pendingOcrImage = null;
saveIntercomBriefConfig();
dismissIntercomOcrAlert();
showAutosaveToast('⚡ OCR-destillering klar! Nu ligger schemat som ren, blixtsnabb text i Dagens Brief.');
} catch (e) {
alert('OCR-skanning misslyckades: ' + e.message);
} finally {
btn.disabled = false;
btn.textContent = '⚡ Kör OCR & Destillera till ren text nu';
}
}
function onIntercomGpsToggle(checked) {
saveIntercomBriefConfig();
if (checked && navigator.geolocation) {
const el = document.getElementById('icLiveSensorReadout');
if (el) el.textContent = '⏳ Uppdaterar GPS-koordinater...';
navigator.geolocation.getCurrentPosition(async (pos) => {
const lat = pos.coords.latitude.toFixed(4);
const lon = pos.coords.longitude.toFixed(4);
let placeLabel = `${lat}, ${lon}`;
try {
const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=13`);
if (r.ok) {
const j = await r.json();
const road = j?.address?.road || j?.address?.suburb || '';
const city = j?.address?.city || j?.address?.town || j?.address?.municipality || '';
placeLabel = [road, city].filter(Boolean).join(', ') + ` (${lat}, ${lon})`;
}
} catch (e) {}
uiPrefs.cachedLocationText = placeLabel;
saveUiPrefs();
updateIntercomSensorReadout();
}, () => {
updateIntercomSensorReadout();
}, { timeout: 5000 });
}
}
function updateIntercomSensorReadout() {
const el = document.getElementById('icLiveSensorReadout');
if (!el) return;
const now = new Date();
const parts = [];
if (intercomState.sensorTime) {
parts.push(`🕒 ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })} (${now.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })})`);
}
if (intercomState.sensorGps) {
parts.push(`📍 ${uiPrefs.cachedLocationText || 'Stockholm / GPS redo'}`);
}
el.textContent = parts.join(' • ') || 'Inga live-sensorer valda';
}
function updateIntercomFollowupUi() {
updateIntercomSensorReadout();
const badge = document.getElementById('intercomWindowBadge');
const countEl = document.getElementById('intercomCountdownText');
if (!badge || !countEl) return;
if (!intercomState.lastExchange) {
badge.style.background = '#1e293b';
badge.style.color = '#94a3b8';
badge.style.borderColor = '#475569';
badge.textContent = '🧊 Stateless: Varje fråga är 100 % nollställd (Fresh start)';
countEl.textContent = '';
return;
}
const elapsed = Date.now() - intercomState.lastExchange.timestamp;
const remainingMs = INTERCOM_FOLLOWUP_MS - elapsed;
if (remainingMs <= 0) {
intercomState.lastExchange = null;
badge.style.background = '#1e293b';
badge.style.color = '#94a3b8';
badge.style.borderColor = '#475569';
badge.textContent = '🧊 Stateless: 45s-fönstret har gått ut (Nollställd)';
countEl.textContent = '';
} else {
const sec = Math.ceil(remainingMs / 1000);
badge.style.background = 'rgba(16, 185, 129, 0.22)';
badge.style.color = '#6ee7b7';
badge.style.borderColor = '#10b981';
badge.textContent = '🔥 Följdfrågefönster AKTIVT (minns senaste svaret)';
countEl.textContent = `⏱️ ${sec}s kvar innan kontexten glöms bort`;
}
}
function resetIntercomFollowupWindow() {
intercomState.lastExchange = null;
updateIntercomFollowupUi();
}
let icMediaRecorder = null;
let icAudioChunks = [];
let icAudioStream = null;
let icLiveTranscriptBuffer = '';
let icSpeechHandledResult = false;
function setIntercomPttVisuals(mode, titleText, subText, pillText) {
const pttBtn = document.getElementById('intercomPttBtn');
const pttIcon = document.getElementById('intercomPttIcon');
const pttTitle = document.getElementById('intercomPttTitle');
const pttSub = document.getElementById('intercomPttSub');
const pttPill = document.getElementById('intercomMicStatusPill');
if (mode === 'listening') {
pttBtn?.classList.add('listening');
if (pttIcon) pttIcon.textContent = '🔴';
} else if (mode === 'processing') {
pttBtn?.classList.remove('listening');
if (pttIcon) pttIcon.textContent = '⏳';
} else {
pttBtn?.classList.remove('listening');
if (pttIcon) pttIcon.textContent = '🎙️';
}
if (titleText && pttTitle) pttTitle.textContent = titleText;
if (subText && pttSub) pttSub.textContent = subText;
if (pillText && pttPill) pttPill.textContent = pillText;
}
async function toggleIntercomVoiceListen() {
if (intercomState.isListening) {
stopIntercomVoiceListen(true);
return;
}
stopIntercomTts();
icLiveTranscriptBuffer = '';
icSpeechHandledResult = false;
const isFileProtocol = window.location.protocol === 'file:';
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec && !intercomState.forceMediaRecorder) {
try {
const rec = new SpeechRec();
rec.lang = 'sv-SE';
rec.continuous = false;
rec.interimResults = true; // Visa orden live i rutan medan man pratar!
rec.maxAlternatives = 1;
intercomState.isListening = true;
intercomState.recognition = rec;
setIntercomPttVisuals(
'listening',
'🔴 LYSSNAR NU... PRATA PÅ!',
'Tryck på knappen igen när du pratat klart (eller vänta 1 sekund i tystnad)',
'🎤 Web Speech API aktivt (sv-SE) • Fångar röst...'
);
rec.onresult = (event) => {
let interim = '';
let finalTxt = '';
for (let i = event.resultIndex; i < event.results.length; i++) {
const t = event.results[i][0].transcript;
if (event.results[i].isFinal) finalTxt += t;
else interim += t;
}
const currentHeard = (finalTxt || interim).trim();
if (currentHeard) {
icLiveTranscriptBuffer = currentHeard;
const inp = document.getElementById('intercomQuickInput');
if (inp) inp.value = currentHeard;
setIntercomPttVisuals(
'listening',
'🗣️ HÖR DIG: "' + currentHeard.slice(0, 42) + (currentHeard.length > 42 ? '...' : '') + '"',
'Sluta prata eller tryck här för att skicka iväg direkt!',
'🟢 Röst detekterad!'
);
}
if (finalTxt.trim()) {
icSpeechHandledResult = true;
stopIntercomVoiceListen(false);
sendIntercomCommand(finalTxt.trim());
}
};
rec.onerror = async (errEv) => {
const errCode = errEv?.error || 'unknown';
console.warn('[Intercom SpeechRecognition Error]:', errCode);
intercomState.isListening = false;
intercomState.recognition = null;
if (errCode === 'not-allowed' || errCode === 'service-not-allowed') {
setIntercomPttVisuals(
'idle',
'⚠️ MIKROFON BLOCKERAD AV WEBBLÄSAREN',
'Klicka på hänglåset/kameran uppe i adressfältet och tillåt Mikrofon (eller kör via https:// statt file://).',
'❌ Felkod: ' + errCode
);
showAutosaveToast('🎤 Tillåt mikrofon i webbläsarens adressfält (eller skriv i rutan nedanför)!');
return;
}
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
intercomState.forceMediaRecorder = true;
await startMediaRecorderFallback();
} else {
setIntercomPttVisuals(
'idle',
'TRYCK FÖR ATT PRATA (HANDSFREE)',
'Kunde inte starta rösttolk (' + errCode + '). Prova igen eller skriv i fältet nedan.',
'⚠️ Status: ' + errCode
);
}
};
rec.onend = () => {
const leftover = icLiveTranscriptBuffer.trim();
intercomState.isListening = false;
intercomState.recognition = null;
if (!icSpeechHandledResult && leftover) {
icSpeechHandledResult = true;
setIntercomPttVisuals(
'idle',
'TRYCK FÖR ATT PRATA (HANDSFREE)',
'Skickade: "' + leftover.slice(0, 50) + '"',
'🎤 Mikrofon redo'
);
sendIntercomCommand(leftover);
} else if (!icSpeechHandledResult) {
setIntercomPttVisuals(
'idle',
'TRYCK FÖR ATT PRATA (HANDSFREE)',
isFileProtocol
? 'Tips: Öppnar du filen via file:// kan Chrome stänga av Web Speech. Tryck igen för direkt ljudinspelning!'
: 'Hörde inget tal. Tryck igen och prata direkt (eller skriv i rutan nedan).',
'🎤 Mikrofon i standby'
);
if (isFileProtocol) intercomState.forceMediaRecorder = true;
}
};
rec.start();
return;
} catch (e) {
console.warn('Kunde inte starta SpeechRecognition, växlar till MediaRecorder:', e);
}
}
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
await startMediaRecorderFallback();
return;
}
const inp = document.getElementById('intercomQuickInput');
if (inp) {
inp.focus();
showAutosaveToast('⚠️ Webbläsaren tillåter inte mikrofon på denna adress (kräver HTTPS eller localhost). Skriv direkt i rutan!');
}
}
async function startMediaRecorderFallback() {
try {
icAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
icAudioChunks = [];
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
? 'audio/webm;codecs=opus'
: (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
icMediaRecorder = mimeType ? new MediaRecorder(icAudioStream, { mimeType }) : new MediaRecorder(icAudioStream);
intercomState.isListening = true;
setIntercomPttVisuals(
'listening',
'🔴 SPELAR IN LJUD... TRYCK IGEN FÖR ATT SKICKA!',
'Prata in ditt kommando och tryck på den här stora knappen när du är klar',
'🎙️ Direkt ljudinspelning aktiv (skickas till AI vid stopp)'
);
icMediaRecorder.ondataavailable = (e) => {
if (e.data && e.data.size > 0) icAudioChunks.push(e.data);
};
icMediaRecorder.onstop = async () => {
const actualMime = icMediaRecorder?.mimeType || 'audio/webm';
const blob = new Blob(icAudioChunks, { type: actualMime });
if (icAudioStream) {
icAudioStream.getTracks().forEach(t => t.stop());
icAudioStream = null;
}
intercomState.isListening = false;
if (blob.size < 400) {
setIntercomPttVisuals('idle', 'TRYCK FÖR ATT PRATA (HANDSFREE)', 'Inspelningen var för kort. Tryck och prata igen!', '🎤 Mikrofon redo');
return;
}
setIntercomPttVisuals('processing', '⏳ TOLKAR DIN RÖST & SVARAR...', 'Skickar ljudklippet direkt till AI-co-piloten...', '⚡ Bearbetar ljud...');
const reader = new FileReader();
reader.onloadend = async () => {
const base64Audio = String(reader.result || '').split(',')[1] || '';
await sendIntercomAudioBlobToAi(base64Audio, actualMime.split(';')[0] || 'audio/webm');
};
reader.readAsDataURL(blob);
};
icMediaRecorder.start();
} catch (err) {
intercomState.isListening = false;
setIntercomPttVisuals(
'idle',
'⚠️ KUNDE INTE ÖPPNA MIKROFONEN',
'Kontrollera att du tillåtit mikrofon i webbläsaren (och att sidan inte är blockerad på file://).',
'❌ ' + (err.message || 'Mikrofon nekad')
);
showAutosaveToast('🎤 Mikrofonfel: ' + (err.message || 'Tillåt mikrofon i webbläsaren'));
}
}
function stopIntercomVoiceListen(userClickedStop = false) {
intercomState.isListening = false;
if (icMediaRecorder && icMediaRecorder.state !== 'inactive') {
try { icMediaRecorder.stop(); } catch (e) {}
return;
}
if (intercomState.recognition) {
const rec = intercomState.recognition;
intercomState.recognition = null;
try { rec.stop(); } catch (e) {}
}
if (userClickedStop && icLiveTranscriptBuffer.trim() && !icSpeechHandledResult) {
const cmd = icLiveTranscriptBuffer.trim();
icLiveTranscriptBuffer = '';
icSpeechHandledResult = true;
setIntercomPttVisuals('idle', 'TRYCK FÖR ATT PRATA (HANDSFREE)', 'Skickade: "' + cmd.slice(0, 50) + '"', '🎤 Mikrofon redo');
sendIntercomCommand(cmd);
return;
}
setIntercomPttVisuals(
'idle',
'TRYCK FÖR ATT PRATA (HANDSFREE)',
'Tryck en gång & prata (eller tryck igen för att skicka direkt) • Svarar i högtalarna',
'🎤 Mikrofon redo'
);
}
async function sendIntercomAudioBlobToAi(base64Audio, mimeType) {
saveIntercomBriefConfig();
const cleanKey = (apiKeys.gemini || '').replace(/\s+/g, '');
if (!cleanKey) {
setIntercomPttVisuals('idle', '🔑 LÄGG IN GEMINI API-NYCKEL FÖRST', 'För direkt ljudtolkning behövs din Gemini API-nyckel under 🔑 API-knappen.', '⚠️ API-nyckel saknas');
alert('Lägg in din Google Gemini API-nyckel under 🔑 API så kan Cockpiten lyssna på dina röstinspelningar direkt!');
return;
}
const now = new Date();
const metaTags = [];
if (intercomState.sensorTime) {
metaTags.push(`Aktuell tid: ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}, Datum: ${now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}`);
}
if (intercomState.sensorGps) {
metaTags.push(`GPS/Plats: ${uiPrefs.cachedLocationText || 'Stockholm'}`);
}
const sensorPrefix = metaTags.length ? `[Live-sensorer: ${metaTags.join(' | ')}]\n` : '';
let followupContext = '';
let usedFollowup = false;
if (intercomState.lastExchange && (Date.now() - intercomState.lastExchange.timestamp) < INTERCOM_FOLLOWUP_MS) {
followupContext = `\n[Föregående replik inom 45s-fönstret: Användare sa "${intercomState.lastExchange.userText}" -> Du svarade "${intercomState.lastExchange.botText}"]\n`;
usedFollowup = true;
}
const sysPrompt = [
'Du är en blixtsnabb, röststyrd AI-co-pilot i en bil-cockpit.',
'Lyssna på användarens röstinspelning. Svara i JSON med exakt två fält: {"heard": "exakt vad användaren sa på svenska", "reply": "ditt korta svar (max 2-3 meningar, ren text utan punktlistor eller tankestreck)"}.',
intercomState.brief ? `DAGENS BRIEF / SCHEMA FÖR ANVÄNDAREN:\n${intercomState.brief}` : 'DAGENS BRIEF: Inget specifikt schema inlagt ännu.'
].join('\n\n');
try {
const mObj = getModelObj('gemini', 'gemini-3.5-flash-lite');
const resolvedSlug = (await resolveAvailableGeminiModel(cleanKey, 'gemini-3.5-flash-lite', mObj)) || 'gemini-2.5-flash';
const body = {
systemInstruction: { parts: [{ text: sysPrompt }] },
contents: [{
role: 'user',
parts: [
{ text: `${sensorPrefix}${followupContext}Lyssna på ljudet och svara i JSON {"heard": "...", "reply": "..."}:` },
{ inline_data: { mime_type: mimeType, data: base64Audio } }
]
}],
generationConfig: { temperature: 0.4 }
};
if (typeof checkCircuitBreakerOrTrip === 'function') {
checkCircuitBreakerOrTrip(450, 'Intercom Röstinspelning');
}
const data = await postJson(
`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedSlug)}:generateContent?key=${encodeURIComponent(cleanKey)}`,
{}, body
);
const rawOut = (data?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
let heardText = '(Röstkommando via ljudinspelning)';
let replyText = rawOut;
const jsonMatch = rawOut.match(/\{[\s\S]*\}/);
if (jsonMatch) {
try {
const parsed = JSON.parse(jsonMatch[0]);
if (parsed.heard) heardText = parsed.heard;
if (parsed.reply) replyText = parsed.reply;
} catch (e) {}
}
replyText = String(replyText || '').replace(/\s*[-–—]\s*/g, ', ').trim();
const icThread = getOrInitIntercomThread();
const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
icThread.messages.push({ id: 'ic_u_' + Date.now(), role: 'user', text: heardText, inContext: false, usedFollowup, time: timeStr });
const costUsd = chargeLedger('gemini', 'gemini-3.5-flash-lite', data.usageMetadata?.promptTokenCount || 350, data.usageMetadata?.candidatesTokenCount || 90);
intercomState.lastExchange = { userText: heardText, botText: replyText, timestamp: Date.now() };
icThread.messages.push({
id: 'ic_b_' + Date.now(),
role: 'assistant',
provider: 'gemini',
model: resolvedSlug,
text: replyText,
costUsd,
inContext: false,
time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
});
saveTree(INTERCOM_THREAD_ID);
updateIntercomFollowupUi();
renderIntercomLogStream();
setIntercomPttVisuals('idle', 'TRYCK FÖR ATT PRATA (HANDSFREE)', 'Hörde: "' + heardText.slice(0, 50) + '"', '🟢 Svar levererat!');
speakIntercomReply(replyText);
} catch (e) {
setIntercomPttVisuals('idle', 'TRYCK FÖR ATT PRATA (HANDSFREE)', 'Fel vid ljudtolkning: ' + e.message, '⚠️ Försök igen');
}
}
function speakIntercomReply(rawText) {
if (!intercomState.ttsEnabled || !('speechSynthesis' in window)) return;
stopIntercomTts();
const cleanSpeech = String(rawText || '')
.replace(/[*#_\x60~>]/g, '')
.replace(/\s*[-–—]\s*/g, ', ')
.replace(/\n+/g, ' ')
.trim();
if (!cleanSpeech) return;
const utter = new SpeechSynthesisUtterance(cleanSpeech);
utter.lang = 'sv-SE';
utter.rate = 1.05;
window.speechSynthesis.speak(utter);
}
function stopIntercomTts() {
if ('speechSynthesis' in window) {
window.speechSynthesis.cancel();
}
}
async function sendIntercomCommand(overrideText = null) {
const inp = document.getElementById('intercomQuickInput');
const userCmd = (overrideText !== null ? overrideText : (inp?.value || '')).trim();
if (!userCmd) return;
if (inp) inp.value = '';
saveIntercomBriefConfig();
const [prov, mod] = (intercomState.modelSpec || 'gemini:gemini-3.5-flash-lite').split(':');
const sysParts = [
'Du är en blixtsnabb, röststyrd AI-co-pilot i en bil-cockpit.',
'SVARSREGLER FÖR HÖGTALARE: Svara direkt på frågan med MAX 2 till 3 korta meningar i ren löpande text. Använd ALDRIG punktlistor, tabeller, markdown-stjärnor eller tankestreck.',
intercomState.brief ? `DAGENS BRIEF / SCHEMA FÖR ANVÄNDAREN:\n${intercomState.brief}` : 'DAGENS BRIEF: Inget specifikt schema inlagt ännu.'
];
const now = new Date();
const metaTags = [];
if (intercomState.sensorTime) {
metaTags.push(`Aktuell tid: ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}, Datum: ${now.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}`);
}
if (intercomState.sensorGps) {
metaTags.push(`GPS/Plats: ${uiPrefs.cachedLocationText || 'Stockholm'}`);
}
const sensorPrefix = metaTags.length ? `[Live-sensorer: ${metaTags.join(' | ')}]\n` : '';
const historyToSend = [];
let usedFollowup = false;
if (intercomState.lastExchange && (Date.now() - intercomState.lastExchange.timestamp) < INTERCOM_FOLLOWUP_MS) {
historyToSend.push({ role: 'user', text: intercomState.lastExchange.userText });
historyToSend.push({ role: 'assistant', text: intercomState.lastExchange.botText });
usedFollowup = true;
}
historyToSend.push({ role: 'user', text: `${sensorPrefix}Användaren ropar: ${userCmd}` });
const icThread = getOrInitIntercomThread();
const timeStr = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
icThread.messages.push({
id: 'ic_u_' + Date.now(),
role: 'user',
text: userCmd,
inContext: false,
usedFollowup,
time: timeStr
});
renderIntercomLogStream();
setIntercomPttVisuals('processing', '⏳ TÄNKER UT SVAR...', 'Skickade: "' + userCmd.slice(0, 45) + '"', '⚡ Väntar på co-pilot...');
let replyText = '';
let costUsd = 0;
try {
if (hasLiveKey(prov)) {
const r = await callAI(prov, mod, historyToSend, sysParts.join('\n\n'), { maxTokens: 350, noTools: true });
replyText = r.text.replace(/\s*[-–—]\s*/g, ', ').trim();
const inTok = r.inTok ?? countTokens(sysParts.join(' ') + userCmd);
const outTok = r.outTok ?? countTokens(replyText);
costUsd = chargeLedger(prov, mod, inTok, outTok);
} else {
replyText = `Klockan är ${now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}. ${intercomState.brief ? 'Enligt dagens brief står följande på tur: ' + intercomState.brief.slice(0, 140) : 'Lägg in din Gemini API-nyckel under API-knappen eller fyll i Dagens Brief till vänster så guidar jag dig live!'}`;
}
} catch (e) {
replyText = `Kunde inte nå modellen just nu: ${e.message}`;
}
intercomState.lastExchange = {
userText: userCmd,
botText: replyText,
timestamp: Date.now()
};
icThread.messages.push({
id: 'ic_b_' + Date.now(),
role: 'assistant',
provider: prov,
model: mod,
text: replyText,
costUsd,
inContext: false, // ALLTID false i slaskkonversationen!
time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
});
saveTree(INTERCOM_THREAD_ID);
updateIntercomFollowupUi();
renderIntercomLogStream();
setIntercomPttVisuals('idle', 'TRYCK FÖR ATT PRATA (HANDSFREE)', 'Senaste fråga: "' + userCmd.slice(0, 45) + '"', '🔊 Läser upp svar...');
speakIntercomReply(replyText);
}
function renderIntercomLogStream() {
const stream = document.getElementById('intercomLogStream');
if (!stream) return;
const icThread = getOrInitIntercomThread();
const msgs = icThread.messages || [];
if (msgs.length === 0) {
stream.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); font-size:13px;">🎙️ Slaskkonversationen är redo. Alla dina röstfrågor och svar loggas här (alltid med <code>🛡️ Utanför kontext</code> som standard så att varje anrop är fjäderlätt och isolerat).</div>`;
return;
}
stream.innerHTML = '';
[...msgs].reverse().forEach(m => {
const div = document.createElement('div');
const isUser = m.role === 'user';
div.style.cssText = `padding:10px 12px; border-radius:10px; border:1px solid ${isUser ? '#334155' : '#1d4ed8'}; background:${isUser ? 'rgba(30,41,59,0.75)' : 'rgba(30,58,138,0.35)'}; font-size:13.5px; line-height:1.45;`;
const followBadge = m.usedFollowup ? '<span style="font-size:10px; background:rgba(16,185,129,0.2); color:#6ee7b7; padding:1px 6px; border-radius:4px; margin-left:6px;">🔗 45s-följdfråga</span>' : '';
const statelessBadge = '<span style="font-size:10px; background:rgba(148,163,184,0.15); color:#94a3b8; padding:1px 6px; border-radius:4px; margin-left:6px;">🛡️ Ej i kontext (Stateless)</span>';
div.innerHTML = `
<div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-muted); margin-bottom:4px;">
<span><strong>${isUser ? '🗣️ Du ropade' : '🔊 Cockpit (' + escapeHtml(m.model || 'Flash-Lite') + ')'}</strong>${followBadge}${statelessBadge}</span>
<span>${escapeHtml(m.time || '')}</span>
</div>
<div style="color:#f8fafc;">${escapeHtml(m.text)}</div>
`;
stream.appendChild(div);
});
}
function clearIntercomLogHistory() {
if (!confirm('Vill du rensa röstloggen i Intercom-slasken? (Dagens Brief ligger kvar)')) return;
const icThread = getOrInitIntercomThread();
icThread.messages = [];
intercomState.lastExchange = null;
saveTree(INTERCOM_THREAD_ID);
renderIntercomLogStream();
updateIntercomFollowupUi();
}
recoverTieredCacheOnStartup();
initGdriveUiFromConfig();
checkRememberedFileHandleOnStart();
populateModelSelectors();
renderAll();