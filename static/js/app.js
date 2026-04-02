/**
 * BILAL_X v2.0 — Frontend Logic
 * Features: Wizard, Chat History (IndexedDB), Web Search UI, Modes, Export
 */

// ═══════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════
let apiKey        = sessionStorage.getItem('bilalx_key') || '';
let chatHistory   = [];       // AI conversation history
let currentChatId = null;
let currentMode   = 'normal'; // normal | think | search
let isTyping      = false;
let db            = null;     // IndexedDB instance

// ═══════════════════════════════════════════════
// IndexedDB — persistent chat storage
// ═══════════════════════════════════════════════
function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('bilalx_db', 2);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('chats')) {
        const store = database.createObjectStore('chats', { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror   = () => { console.warn('IndexedDB failed, fallback to localStorage'); resolve(null); };
  });
}

async function dbSave(chat) {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction('chats', 'readwrite');
      tx.objectStore('chats').put(chat);
      tx.oncomplete = resolve;
      tx.onerror    = () => lsSave(chat);
    });
  }
  lsSave(chat);
}

async function dbGetAll() {
  if (db) {
    return new Promise((resolve) => {
      const tx   = db.transaction('chats', 'readonly');
      const req  = tx.objectStore('chats').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => resolve(lsGetAll());
    });
  }
  return lsGetAll();
}

async function dbDelete(id) {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction('chats', 'readwrite');
      tx.objectStore('chats').delete(id);
      tx.oncomplete = resolve;
    });
  }
  const chats = lsGetAll().filter(c => c.id !== id);
  localStorage.setItem('bilalx_chats', JSON.stringify(chats));
}

async function dbClear() {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction('chats', 'readwrite');
      tx.objectStore('chats').clear();
      tx.oncomplete = resolve;
    });
  }
  localStorage.removeItem('bilalx_chats');
}

// localStorage fallback
function lsSave(chat) {
  const chats = lsGetAll();
  const idx   = chats.findIndex(c => c.id === chat.id);
  if (idx >= 0) chats[idx] = chat;
  else chats.push(chat);
  try { localStorage.setItem('bilalx_chats', JSON.stringify(chats)); } catch(e) {}
}
function lsGetAll() {
  try { return JSON.parse(localStorage.getItem('bilalx_chats')) || []; }
  catch { return []; }
}

// ═══════════════════════════════════════════════
// Wizard
// ═══════════════════════════════════════════════
function goStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById('wz'+i).classList.add('hidden');
    const dot = document.querySelector('#ws'+i+' .ws-dot');
    dot.className = 'ws-dot';
    if (i < n) dot.classList.add('done');
    if (i === n) dot.classList.add('active');
  });
  document.getElementById('wz'+n).classList.remove('hidden');
  [1,2].forEach(i => {
    const line = document.getElementById('wsl'+i);
    if (line) line.classList.toggle('done', i < n);
  });
}

// ═══════════════════════════════════════════════
// Key Management
// ═══════════════════════════════════════════════
function saveKey() {
  const key   = document.getElementById('keyInput').value.trim();
  const errEl = document.getElementById('errMsg');
  if (!key.startsWith('gsk_') || key.length < 20) {
    errEl.textContent = '⚠️ المفتاح يجب أن يبدأ بـ gsk_ ويكون صالحاً';
    document.getElementById('keyInput').classList.add('error');
    return;
  }
  apiKey = key;
  sessionStorage.setItem('bilalx_key', key);
  document.getElementById('setup').style.display = 'none';
  document.getElementById('keyInput').classList.remove('error');
  errEl.textContent = '';
  updateKeyStatus(true);
}

function updateKeyStatus(hasKey) {
  const dot = document.getElementById('keyDot');
  const lbl = document.getElementById('keyLabel');
  if (hasKey && apiKey) {
    dot.classList.add('active');
    lbl.textContent = apiKey.substring(0,8) + '••••';
  } else {
    dot.classList.remove('active');
    lbl.textContent = 'لا يوجد مفتاح';
  }
}

function changeKey() {
  goStep(3);
  document.getElementById('setup').style.display = 'flex';
}

function deleteKey() {
  if (!confirm('حذف المفتاح؟')) return;
  apiKey = '';
  sessionStorage.removeItem('bilalx_key');
  updateKeyStatus(false);
  goStep(1);
  document.getElementById('setup').style.display = 'flex';
}

function toggleEye() {
  const inp = document.getElementById('keyInput');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// ═══════════════════════════════════════════════
// Mode Switching
// ═══════════════════════════════════════════════
const modeConfig = {
  normal: { label: '💬 وضع المحادثة',     color: '#39d353' },
  think:  { label: '🧠 وضع التفكير العميق', color: '#e3b341' },
  search: { label: '🔍 وضع البحث',         color: '#58a6ff' },
};

function setMode(mode) {
  currentMode = mode;
  ['Normal','Think','Search'].forEach(m => {
    document.getElementById('mode'+m).classList.remove('active');
  });
  document.getElementById('mode'+mode.charAt(0).toUpperCase()+mode.slice(1)).classList.add('active');
  const cfg = modeConfig[mode];
  document.getElementById('modeText').textContent = cfg.label;
  document.getElementById('modeIndicator').style.borderColor = cfg.color;
  document.getElementById('inp').placeholder =
    mode === 'search' ? '🔍 ابحث عن أي موضوع...' :
    mode === 'think'  ? '🧠 اسألني سؤالاً معقداً...' :
    'اكتب سؤالك... (Enter للإرسال)';
}

// ═══════════════════════════════════════════════
// Chat History UI
// ═══════════════════════════════════════════════
function toggleHistory() {
  const panel = document.getElementById('historyPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderHistoryList();
}

async function renderHistoryList(filter = '') {
  const all  = await dbGetAll();
  const list = document.getElementById('hpList');
  document.getElementById('chatCount').textContent = `${all.length} محادثة`;

  const filtered = filter
    ? all.filter(c => c.title.includes(filter) || c.preview?.includes(filter))
    : all;

  filtered.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));

  if (filtered.length === 0) {
    list.innerHTML = '<div class="hp-empty">لا توجد محادثات بعد</div>';
    return;
  }
  list.innerHTML = filtered.map(c => `
    <div class="hp-item ${c.id === currentChatId ? 'active' : ''}" onclick="loadChat('${c.id}')">
      <div class="hp-info">
        <div class="hp-title">${esc(c.title)}</div>
        <div class="hp-meta">
          <span class="hp-date">${c.dateStr || ''}</span>
          <span class="hp-msgs">${c.msgCount || 0} رسالة</span>
        </div>
        ${c.preview ? `<div class="hp-preview">${esc(c.preview)}</div>` : ''}
      </div>
      <button class="hp-del" onclick="deleteChat(event,'${c.id}')">✕</button>
    </div>`).join('');
}

function filterChats(val) {
  renderHistoryList(val);
}

async function loadChat(id) {
  const all  = await dbGetAll();
  const chat = all.find(c => c.id === id);
  if (!chat) return;
  await saveCurrentChat();
  currentChatId = id;
  chatHistory   = chat.history ? [...chat.history] : [];

  const msgsEl = document.getElementById('msgs');
  msgsEl.innerHTML = '';
  (chat.messages || []).forEach(m => {
    if (m.role === 'user') addMsg(esc(m.content), true, null, false);
    else addMsg(renderMarkdown(m.content), false, m.source || 'groq', false);
  });
  renderHistoryList();
}

async function saveCurrentChat() {
  if (!currentChatId || chatHistory.length === 0) return;
  const allMsgs = [...document.querySelectorAll('.msg')];
  const messages = [];
  allMsgs.forEach(el => {
    const isUser = el.classList.contains('user');
    const bbl    = el.querySelector('.bbl');
    if (bbl && !el.classList.contains('welcome-msg')) {
      messages.push({ role: isUser ? 'user' : 'assistant', content: bbl.textContent.trim() });
    }
  });

  const firstUser = chatHistory.find(h => h.role === 'user');
  const title     = firstUser ? firstUser.content.substring(0,50) : 'محادثة جديدة';
  const preview   = chatHistory.slice(-1)[0]?.content?.substring(0,80) || '';

  await dbSave({
    id:        currentChatId,
    title,
    preview,
    history:   [...chatHistory],
    messages,
    msgCount:  chatHistory.length,
    dateStr:   new Date().toLocaleDateString('ar-SA'),
    timestamp: Date.now(),
  });
  renderHistoryList();
}

function generateId() { return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,6); }

async function newChat() {
  await saveCurrentChat();
  currentChatId = generateId();
  chatHistory   = [];
  document.getElementById('msgs').innerHTML = `
    <div class="msg bot">
      <div class="av bot-av">$_</div>
      <div class="bbl">🐧 <b>محادثة جديدة</b><br>اسألني أي شيء! اكتب <code>/help</code> للأوامر.</div>
    </div>`;
  renderHistoryList();
}

async function deleteChat(e, id) {
  e.stopPropagation();
  await dbDelete(id);
  if (currentChatId === id) await newChat();
  else renderHistoryList();
}

async function clearAllChats() {
  if (!confirm('حذف جميع المحادثات نهائياً؟')) return;
  await dbClear();
  await newChat();
}

// ═══════════════════════════════════════════════
// Markdown Renderer (basic)
// ═══════════════════════════════════════════════
function renderMarkdown(text) {
  if (!text) return '';
  let t = esc(text);

  // Code blocks
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
    `<div class="code-block"><div class="code-header"><span class="code-lang">${lang||'code'}</span>` +
    `<button class="copy-btn" onclick="copyCode(this)">نسخ</button></div>` +
    `<pre><code>${code.trim()}</code></pre></div>`);

  // Inline code
  t = t.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  // Headers
  t = t.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  t = t.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  t = t.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');

  // Lists
  t = t.replace(/^[•\-] (.+)$/gm, '<li>$1</li>');
  t = t.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`);

  // Numbered lists
  t = t.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Line breaks
  t = t.replace(/\n/g, '<br>');

  return t;
}

function copyCode(btn) {
  const code = btn.closest('.code-block').querySelector('code').textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'تم ✓';
    setTimeout(() => btn.textContent = 'نسخ', 2000);
  });
}

// ═══════════════════════════════════════════════
// Search Results Renderer
// ═══════════════════════════════════════════════
function renderSearchResults(data) {
  if (!data || !data.results || data.results.length === 0) {
    return '<div class="no-results">❌ لم يتم العثور على نتائج</div>';
  }
  const direct = data.results.find(r => r.type === 'direct_answer');
  let html = `<div class="search-header">🔍 نتائج البحث: "<b>${esc(data.query)}</b>"</div>`;

  if (direct) {
    html += `<div class="search-direct"><div class="sd-label">⚡ إجابة مباشرة</div><div>${esc(direct.snippet)}</div></div>`;
  }

  html += '<div class="search-results">';
  data.results.filter(r => r.type !== 'direct_answer').forEach((r, i) => {
    html += `
      <div class="sr-item">
        <div class="sr-title">${esc(r.title)}</div>
        <div class="sr-snippet">${esc(r.snippet)}</div>
        ${r.url ? `<a href="${r.url}" target="_blank" rel="noopener noreferrer" class="sr-link">🔗 ${esc(r.source)}</a>` : ''}
      </div>`;
  });
  html += '</div>';
  return html;
}

// ═══════════════════════════════════════════════
// Message Rendering
// ═══════════════════════════════════════════════
function addMsg(html, isUser, source, scroll = true) {
  const d = document.createElement('div');
  d.className = 'msg ' + (isUser ? 'user' : 'bot');

  let meta = '';
  if (!isUser) {
    if (source === 'groq')  meta = '<div class="msg-meta"><span class="src-tag groq">🤖 Groq AI</span></div>';
    if (source === 'local') meta = '<div class="msg-meta"><span class="src-tag local">⚙️ محلي</span></div>';
    if (source === 'search') meta = '<div class="msg-meta"><span class="src-tag search">🔍 بحث الويب</span></div>';
    if (source === 'think') meta = '<div class="msg-meta"><span class="src-tag think">🧠 تفكير عميق</span></div>';
  }

  d.innerHTML = `
    <div class="av ${isUser ? 'user-av' : 'bot-av'}">${isUser ? 'أنت' : '$_'}</div>
    <div class="bbl">${html}${meta}</div>`;

  document.getElementById('msgs').appendChild(d);
  if (scroll) d.scrollIntoView({ behavior: 'smooth', block: 'end' });
  return d;
}

// ═══════════════════════════════════════════════
// Typing Indicator
// ═══════════════════════════════════════════════
let typingEl = null;
function showTyping() {
  typingEl = document.createElement('div');
  typingEl.className = 'msg bot typing-msg';
  typingEl.innerHTML = `
    <div class="av bot-av">$_</div>
    <div class="bbl">
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <div class="typing-label" id="typingLabel">يفكر...</div>
    </div>`;
  document.getElementById('msgs').appendChild(typingEl);
  typingEl.scrollIntoView({ behavior: 'smooth' });
}
function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }
function setTypingLabel(t) { const el = document.getElementById('typingLabel'); if (el) el.textContent = t; }

// ═══════════════════════════════════════════════
// Send Message
// ═══════════════════════════════════════════════
async function send() {
  const inp = document.getElementById('inp');
  const msg = inp.value.trim();
  if (!msg || isTyping) return;

  const isLocal = msg.startsWith('/') && !msg.startsWith('/search');
  if (!isLocal && !apiKey) { changeKey(); return; }

  inp.value = '';
  inp.style.height = 'auto';
  addMsg(esc(msg), true);
  isTyping = true;
  document.getElementById('sendBtn').disabled = true;
  showTyping();

  if (currentMode === 'search' && !msg.startsWith('/')) {
    setTypingLabel('يبحث في الويب...');
  } else if (currentMode === 'think') {
    setTypingLabel('يفكر بعمق...');
  }

  try {
    const payload = {
      message: msg,
      api_key: apiKey,
      history: chatHistory.slice(-12),
      mode:    currentMode,
    };

    // Auto-search mode
    if (currentMode === 'search' && !msg.startsWith('/')) {
      payload.message = '/search ' + msg;
    }

    const r = await fetch('/chat', {
      method:  'POST',
      headers: {'Content-Type': 'application/json'},
      body:    JSON.stringify(payload),
    });
    const d = await r.json();
    hideTyping();

    // Error handling
    if (d.error === 'invalid_key' || d.error === 'invalid_format') {
      changeKey();
      document.getElementById('errMsg').textContent = '❌ المفتاح غير صالح';
      return;
    }
    if (d.error === 'rate_limit') {
      addMsg('⏳ تجاوزت الحد المسموح، انتظر قليلاً.', false, 'local');
      return;
    }
    if (d.error === 'timeout') {
      addMsg('⚠️ انتهت مهلة الاتصال، حاول مجدداً.', false, 'local');
      return;
    }
    if (d.error) {
      addMsg(`⚠️ خطأ: ${d.error}`, false, 'local');
      return;
    }

    // CLEAR_CONSOLE
    if (d.response === 'CLEAR_CONSOLE') {
      document.getElementById('msgs').innerHTML = '';
      addMsg('🧹 تم مسح الشاشة', false, 'local');
      chatHistory = [];
      return;
    }

    // Search Results
    if (d.source === 'search' && d.search_data) {
      const searchHtml = renderSearchResults(d.search_data);
      addMsg(searchHtml, false, 'search');
      chatHistory.push({ role: 'user', content: msg });
      chatHistory.push({ role: 'assistant', content: `[نتائج بحث: ${d.search_data.query}]` });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      await saveCurrentChat();
      return;
    }

    if (d.response) {
      const src = currentMode === 'think' ? 'think' : (d.source || 'groq');

      // Show search context if any
      if (d.search_data && d.source === 'groq') {
        const contextHtml = `<div class="search-context">🔍 استخدم معلومات محدثة من الويب</div>`;
        addMsg(contextHtml + renderMarkdown(d.response), false, src);
      } else {
        addMsg(d.source === 'local' ? esc(d.response) : renderMarkdown(d.response), false, src);
      }

      if (d.source !== 'local') {
        chatHistory.push({ role: 'user', content: msg });
        chatHistory.push({ role: 'assistant', content: d.response });
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
        await saveCurrentChat();
      }

      // Token info
      if (d.tokens) updateTokenInfo(d.tokens, d.model);
    }

  } catch(e) {
    hideTyping();
    addMsg('⚠️ خطأ في الاتصال بالسيرفر', false, 'local');
  } finally {
    isTyping = false;
    document.getElementById('sendBtn').disabled = false;
  }
}

function q(val) {
  document.getElementById('inp').value = val;
  send();
}

function quickSearch(query) {
  setMode('search');
  document.getElementById('inp').value = query;
  send();
}

// Token counter in header
let totalTokens = 0;
function updateTokenInfo(tokens, model) {
  totalTokens += tokens;
}

// Quick search toggle
function toggleSearchBar() {
  const qs = document.getElementById('quickSearch');
  qs.classList.toggle('hidden');
  if (!qs.classList.contains('hidden')) {
    document.getElementById('searchInput').focus();
  }
}

function doSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  document.getElementById('inp').value = '/search ' + q;
  document.getElementById('quickSearch').classList.add('hidden');
  send();
}

// ═══════════════════════════════════════════════
// Export Chat
// ═══════════════════════════════════════════════
function exportChat() {
  const msgs = document.querySelectorAll('.msg:not(.welcome-msg)');
  if (msgs.length === 0) { alert('لا توجد رسائل للتصدير'); return; }

  let text = `BILAL_X v2.0 — تصدير المحادثة\n`;
  text += `التاريخ: ${new Date().toLocaleString('ar-SA')}\n`;
  text += '═'.repeat(50) + '\n\n';

  msgs.forEach(m => {
    const isUser = m.classList.contains('user');
    const content = m.querySelector('.bbl').innerText.trim();
    text += `${isUser ? '👤 أنت' : '🤖 BILAL_X'}:\n${content}\n\n${'─'.repeat(30)}\n\n`;
  });

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `bilalx_chat_${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════
function esc(t) {
  return String(t||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Auto-resize textarea
const inp = document.getElementById('inp');
inp.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});
inp.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
});

// Quick search enter
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
  if (e.key === 'Escape') toggleSearchBar();
});

// ═══════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════
async function init() {
  await initDB();
  currentChatId = generateId();
  renderHistoryList();
  if (apiKey) {
    document.getElementById('setup').style.display = 'none';
    updateKeyStatus(true);
  } else {
    goStep(1);
  }
}

init();
