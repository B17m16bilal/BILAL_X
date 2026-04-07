/* ════════════════════════════════════════════
   BILAL_X v3.0 — Frontend Logic
   ════════════════════════════════════════════ */

// ══════════════ STATE ══════════════
let apiKey    = '';
let chatMode  = 'normal';
let history   = [];
let isLoading = false;
let menuOpen  = false;

const MODES = {
  normal: { label: '⚡ سريع', color: '#e8ff00' },
  think:  { label: '🧠 تفكير عميق', color: '#aa88ff' },
  search: { label: '🔍 بحث الويب', color: '#44aaff' },
};

// ══════════════ SCREENS ══════════════

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    // Force scroll to top on screen change
    el.scrollTop = 0;
  }
}

function showTerms() {
  showScreen('screen-terms');
  const body = document.getElementById('terms-scroll');
  body.addEventListener('scroll', checkTermsScroll);
  // Check if already scrollable
  setTimeout(checkTermsScroll, 200);
}

function checkTermsScroll() {
  const el = document.getElementById('terms-scroll');
  const hint = document.getElementById('scroll-hint');
  const actions = document.getElementById('terms-actions');
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  if (atBottom) {
    hint.style.display = 'none';
    actions.style.display = 'flex';
  }
}

function toggleAccept() {
  const check = document.getElementById('terms-check');
  document.getElementById('btn-accept').disabled = !check.checked;
}

function showSetup() {
  showScreen('screen-setup');
  // Check if key already saved
  const saved = sessionStorage.getItem('bx_key');
  if (saved) {
    document.getElementById('api-key-input').value = saved;
    validateKey(saved);
  }
}

function showChat() {
  showScreen('screen-chat');
  document.getElementById('status-dot').className = 'status-dot online';
  document.getElementById('msg-input').focus();
}

// ══════════════ API KEY ══════════════

function validateKey(val) {
  const btn = document.getElementById('btn-start');
  const err = document.getElementById('key-error');
  val = val.trim();
  if (!val) { err.textContent = ''; btn.disabled = true; return; }
  if (!val.startsWith('gsk_')) {
    err.textContent = 'المفتاح يجب أن يبدأ بـ gsk_';
    btn.disabled = true;
  } else if (val.length < 20) {
    err.textContent = 'المفتاح قصير جداً';
    btn.disabled = true;
  } else {
    err.textContent = '';
    btn.disabled = false;
  }
}

function submitKey() {
  const val = document.getElementById('api-key-input').value.trim();
  if (!val.startsWith('gsk_') || val.length < 20) return;
  apiKey = val;
  sessionStorage.setItem('bx_key', val);
  showChat();
}

function toggleKeyVisibility() {
  const inp = document.getElementById('api-key-input');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

function changeKey() {
  closeMenu();
  apiKey = '';
  sessionStorage.removeItem('bx_key');
  showScreen('screen-setup');
  document.getElementById('api-key-input').value = '';
  document.getElementById('btn-start').disabled = true;
}

// ══════════════ MENU ══════════════

function toggleMenu() {
  menuOpen = !menuOpen;
  document.getElementById('dropdown-menu').classList.toggle('open', menuOpen);
}

function closeMenu() {
  menuOpen = false;
  document.getElementById('dropdown-menu').classList.remove('open');
}

document.addEventListener('click', e => {
  if (menuOpen && !e.target.closest('#dropdown-menu') && !e.target.closest('#menu-btn')) {
    closeMenu();
  }
});

// ══════════════ MODE ══════════════

function setMode(mode, btn) {
  chatMode = mode;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('mode-label').textContent = MODES[mode].label;
  closeMenu();
}

// ══════════════ CHAT ══════════════

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
}

function quickPrompt(text) {
  document.getElementById('msg-input').value = text;
  sendMessage();
}

async function sendMessage() {
  if (isLoading) return;
  const input = document.getElementById('msg-input');
  const msg   = input.value.trim();
  if (!msg) return;

  // Hide welcome
  const welcome = document.getElementById('welcome-msg');
  if (welcome) welcome.remove();

  input.value = '';
  input.style.height = 'auto';

  addMessage('user', msg);
  history.push({ role: 'user', content: msg });

  const thinking = addThinking();
  setLoading(true);

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: msg,
        api_key: apiKey,
        history: history.slice(-12),
        mode: chatMode,
      })
    });

    const data = await res.json();
    thinking.remove();
    setLoading(false);

    if (data.error) {
      const errMsg = errorMsg(data.error);
      addMessage('bot', errMsg, true);
    } else if (data.response === 'CLEAR_CONSOLE') {
      clearChat();
    } else {
      let text = data.response;
      addMessage('bot', text);
      history.push({ role: 'assistant', content: text });
      if (data.search_data) addSearchResults(data.search_data);
      saveHistory();
    }
  } catch (e) {
    thinking.remove();
    setLoading(false);
    addMessage('bot', '❌ خطأ في الاتصال. تحقق من إنترنتك.', true);
  }
}

function setLoading(state) {
  isLoading = state;
  const btn  = document.getElementById('send-btn');
  const dot  = document.getElementById('status-dot');
  btn.disabled = state;
  dot.className = 'status-dot ' + (state ? 'thinking' : 'online');
}

function addMessage(role, text, isError = false) {
  const msgs = document.getElementById('messages');
  const div  = document.createElement('div');
  div.className = `msg ${role}`;

  const roleEl = document.createElement('div');
  roleEl.className = 'msg-role';
  roleEl.textContent = role === 'user' ? 'أنت' : 'BILAL_X';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  if (isError) bubble.style.borderColor = 'var(--red)';
  bubble.innerHTML = renderMarkdown(text);

  // Add copy buttons to code blocks
  bubble.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-code-btn';
    btn.textContent = 'نسخ';
    btn.onclick = () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ تم';
        setTimeout(() => btn.textContent = 'نسخ', 2000);
      });
    };
    pre.style.position = 'relative';
    pre.appendChild(btn);
  });

  div.appendChild(roleEl);
  div.appendChild(bubble);
  msgs.appendChild(div);
  scrollToBottom();
  return div;
}

function addThinking() {
  const msgs = document.getElementById('messages');
  const div  = document.createElement('div');
  div.className = 'msg bot';

  const roleEl = document.createElement('div');
  roleEl.className = 'msg-role';
  roleEl.textContent = 'BILAL_X';

  const bubble = document.createElement('div');
  bubble.className = 'thinking-bubble';
  bubble.innerHTML = '<span></span><span></span><span></span>';

  div.appendChild(roleEl);
  div.appendChild(bubble);
  msgs.appendChild(div);
  scrollToBottom();
  return div;
}

function addSearchResults(data) {
  if (!data?.results?.length) return;
  const msgs = document.getElementById('messages');
  const last = msgs.lastElementChild;
  if (!last) return;
  const div = document.createElement('div');
  div.className = 'search-results';
  div.innerHTML = `<div class="search-results-title">🔍 نتائج البحث: ${data.query}</div>`;
  data.results.slice(0, 3).forEach(r => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = r.url
      ? `<a href="${r.url}" target="_blank">${r.title}</a><p>${r.snippet.substring(0, 100)}...</p>`
      : `<strong>${r.title}</strong><p>${r.snippet.substring(0, 120)}...</p>`;
    div.appendChild(item);
  });
  const lastBubble = last.querySelector('.msg-bubble');
  if (lastBubble) lastBubble.appendChild(div);
}

function scrollToBottom() {
  const msgs = document.getElementById('messages');
  msgs.scrollTop = msgs.scrollHeight;
}

// ══════════════ MARKDOWN ══════════════

function renderMarkdown(text) {
  if (!text) return '';

  // Code blocks
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<pre><code class="language-${lang}">${escaped}</code></pre>`;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Headers
  text = text.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Unordered lists
  text = text.replace(/^\s*[-*] (.*)/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Numbered lists
  text = text.replace(/^\d+\. (.*)/gm, '<li>$1</li>');

  // Line breaks (preserve paragraphs)
  text = text.split('\n\n').map(p => {
    if (p.startsWith('<') || p.trim() === '') return p;
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  return text;
}

// ══════════════ ERROR MESSAGES ══════════════

function errorMsg(code) {
  const map = {
    'no_key':         '🔑 لا يوجد مفتاح API. أضف مفتاح Groq من الإعدادات.',
    'invalid_format': '🔑 صيغة المفتاح خاطئة. يجب أن يبدأ بـ gsk_',
    'invalid_key':    '🔑 المفتاح غير صالح أو منتهي الصلاحية.',
    'rate_limit':     '⏳ تجاوزت الحد المسموح. انتظر قليلاً ثم أعد المحاولة.',
    'timeout':        '⌛ انتهت مهلة الطلب. تحقق من إنترنتك.',
    'server_error':   '⚠️ خطأ في السيرفر. حاول لاحقاً.',
  };
  return map[code] || `❌ خطأ: ${code}`;
}

// ══════════════ UTILITIES ══════════════

function clearChat() {
  closeMenu();
  history = [];
  const msgs = document.getElementById('messages');
  msgs.innerHTML = `
    <div class="welcome-msg" id="welcome-msg">
      <div class="welcome-logo">[BX]</div>
      <h3>أهلاً، كيف أقدر أساعدك؟</h3>
      <p>اسألني عن Linux، Bash، Python، Docker، الشبكات، أو أي شيء تقني</p>
      <div class="quick-prompts">
        <button onclick="quickPrompt('اشرح لي الفرق بين chmod و chown في Linux')">chmod vs chown</button>
        <button onclick="quickPrompt('كيف أكتب Bash script يراقب استهلاك الـ CPU؟')">CPU monitor script</button>
        <button onclick="quickPrompt('ما أفضل طريقة لتأمين سيرفر Ubuntu؟')">تأمين سيرفر</button>
        <button onclick="quickPrompt('/help')">الأوامر المتاحة</button>
      </div>
    </div>`;
  localStorage.removeItem('bx_history');
}

function exportChat() {
  closeMenu();
  if (!history.length) return;
  const text = history.map(h =>
    `[${h.role === 'user' ? 'أنت' : 'BILAL_X'}]\n${h.content}`
  ).join('\n\n──────────────\n\n');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `bilalx-chat-${Date.now()}.txt`;
  a.click(); URL.revokeObjectURL(url);
}

function saveHistory() {
  try {
    localStorage.setItem('bx_history', JSON.stringify(history.slice(-20)));
  } catch(e) {}
}

function loadHistory() {
  try {
    const saved = localStorage.getItem('bx_history');
    if (saved) history = JSON.parse(saved);
  } catch(e) {}
}

function showAboutPopup() {
  closeMenu();
  document.getElementById('about-overlay').classList.add('open');
}

function closeAboutPopup() {
  document.getElementById('about-overlay').classList.remove('open');
}

// ══════════════ INIT ══════════════

(function init() {
  loadHistory();

  // If key exists in session, skip setup
  const saved = sessionStorage.getItem('bx_key');
  if (saved && saved.startsWith('gsk_') && saved.length > 20) {
    apiKey = saved;
  }

  // Always show splash first
  showScreen('screen-about');
})();
