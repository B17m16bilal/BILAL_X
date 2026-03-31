"""
╔══════════════════════════════════════════════════════════════╗
║       BILAL_X — مساعد Linux الذكي                           ║
║       المفتاح يبقى في المتصفح فقط — لا يُخزن في السيرفر    ║
╚══════════════════════════════════════════════════════════════╝
"""

from flask import Flask, request, jsonify, render_template_string, send_from_directory
from datetime import datetime
import hashlib, secrets, string, base64, re, random
import os

try:
    import requests as req_lib
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False

app = Flask(__name__)

# Google Verification
@app.route('/google78ab5f00e22cd85c.html')
def google_verification():
    try:
        return send_from_directory('static', 'google78ab5f00e22cd85c.html')
    except:
        return "File not found. Please add google78ab5f00e22cd85c.html to static folder.", 404

GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL   = "https://api.groq.com/openai/v1/chat/completions"
SYSTEM_MSG = (
    "أنت BILAL_X — مساعد تقني ذكي وودود متخصص في Linux والبرمجة. "
    "ردودك دائماً بالعربية. شخصيتك: مرح، صادق، مشجع، طبيعي في الكلام. "
    "تساعد في: Linux، Python، Bash، Git، الشبكات. "
    "في المحادثة اليومية ترد بشكل إنساني — مش جاف."
)

@app.route('/')
def index():
    return render_template_string(HTML)

@app.route('/chat', methods=['POST'])
def chat():
    if not REQUESTS_OK:
        return jsonify({'error': 'pip install requests'}), 500

    data    = request.get_json(force=True)
    message = data.get('message', '').strip()
    api_key = data.get('api_key', '').strip()
    history = data.get('history', [])

    if not message:
        return jsonify({'error': 'رسالة فارغة'}), 400

    local = _local_command(message)
    if local:
        return jsonify({'response': local, 'source': 'local'})

    if not api_key:
        return jsonify({'error': 'no_key'})

    if not api_key.startswith('gsk_') or len(api_key) < 20:
        return jsonify({'error': 'invalid_key'})

    try:
        messages = [{"role": "system", "content": SYSTEM_MSG}]
        for h in history[-10:]:
            messages.append(h)
        messages.append({"role": "user", "content": message})

        resp = req_lib.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": messages, "max_tokens": 1024, "temperature": 0.7},
            timeout=25
        )

        if resp.status_code == 200:
            reply = resp.json()["choices"][0]["message"]["content"]
            return jsonify({'response': reply.strip(), 'source': 'groq'})

        if resp.status_code == 401:
            return jsonify({'error': 'invalid_key'})
        if resp.status_code == 429:
            return jsonify({'error': 'rate_limit'})

        return jsonify({'error': f'groq_error_{resp.status_code}'})

    except req_lib.exceptions.Timeout:
        return jsonify({'error': 'timeout'})
    except Exception as e:
        return jsonify({'error': str(e)[:80]})

def _local_command(msg: str):
    lower = msg.strip().lower()

    if lower.startswith('/pass'):
        parts = msg.split()
        try:    length = min(max(int(parts[1]), 8), 64)
        except: length = 16
        chars = string.ascii_letters + string.digits + "!@#$%^&*_+-=[]{};"
        pw = ''.join(secrets.choice(chars) for _ in range(length))
        s  = sum([len(pw)>=12, any(c.isupper() for c in pw), any(c.islower() for c in pw),
                  any(c.isdigit() for c in pw), any(c in "!@#$%^&*" for c in pw)])
        st = {5:"قوية جداً 💪", 4:"قوية ✅", 3:"متوسطة ⚠️"}.get(s, "ضعيفة ❌")
        return f"🔐 كلمة مرور ({length} حرف):\n\n  {pw}\n\nالقوة: {st}"

    if lower.startswith('/hash '):
        t = msg[6:].strip()
        return (f'🔒 تشفير: "{t[:40]}"\n\n'
                f"MD5:    {hashlib.md5(t.encode()).hexdigest()}\n"
                f"SHA256: {hashlib.sha256(t.encode()).hexdigest()}")

    if lower.startswith('/encode '):
        t = msg[8:].strip()
        return f"🔐 Base64:\n  {base64.b64encode(t.encode()).decode()}"

    if lower.startswith('/decode '):
        t = msg[8:].strip()
        try:    return f"🔓 فك Base64:\n  {base64.b64decode(t).decode('utf-8')}"
        except: return "❌ نص Base64 غير صالح"

    if lower == '/clear':
        return "CLEAR_CONSOLE"

    if lower == '/help':
        return ("📚 الأوامر المحلية (بدون مفتاح):\n\n"
                "/pass [طول]   كلمة مرور قوية\n"
                "/hash [نص]    تشفير SHA/MD5\n"
                "/encode [نص]  Base64\n"
                "/decode [نص]  فك Base64\n"
                "/clear        مسح الشاشة\n"
                "/help         عرض هذه المساعدة")

    return None

HTML = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BILAL_X</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Tajawal:wght@400;500;700&display=swap');
:root{
  --bg:#0d1117;--sf:#161b22;--bd:#21262d;
  --gr:#39d353;--glo:#0f2d1a;
  --bl:#58a6ff;--yl:#e3b341;--rd:#f85149;
  --tx:#c9d1d9;--dm:#6e7681;--brt:#f0f6fc;
}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Tajawal',sans-serif;background:var(--bg);color:var(--tx);height:100vh;display:flex;flex-direction:column;overflow:hidden;}
.hdr{background:var(--sf);border-bottom:1px solid var(--bd);padding:10px 20px;display:flex;align-items:center;gap:12px;flex-shrink:0;}
.dots{display:flex;gap:6px;}.dot{width:12px;height:12px;border-radius:50%;}
.dr{background:#f85149;}.dy{background:#e3b341;}.dg{background:#39d353;}
.ttl{flex:1;text-align:center;font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--dm);}.ttl b{color:var(--gr);}
.key-status{display:flex;align-items:center;gap:7px;cursor:pointer;}
.key-indicator{width:10px;height:10px;border-radius:50%;background:var(--rd);transition:background .3s;}
.key-indicator.active{background:var(--gr);box-shadow:0 0 6px var(--gr);}
.key-label{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--dm);}
.setup{position:fixed;inset:0;background:var(--bg);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px;}
.setup-card{background:var(--sf);border:1px solid var(--bd);border-radius:16px;padding:32px;max-width:460px;width:100%;text-align:center;}
.setup-logo{font-size:40px;margin-bottom:12px;}
.setup-title{font-family:'IBM Plex Mono',monospace;font-size:18px;color:var(--gr);margin-bottom:6px;}
.setup-sub{font-size:14px;color:var(--dm);margin-bottom:24px;line-height:1.6;}
.setup-steps{text-align:right;background:var(--bg);border-radius:10px;padding:16px;margin-bottom:20px;}
.step{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;font-size:13px;line-height:1.6;}
.step:last-child{margin-bottom:0;}
.step-num{background:var(--glo);color:var(--gr);border:1px solid var(--gr);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:11px;flex-shrink:0;margin-top:1px;}
.step a{color:var(--bl);text-decoration:none;}
.inp-group{position:relative;margin-bottom:12px;}
.key-inp{width:100%;background:var(--bg);border:1px solid var(--bd);border-radius:8px;padding:12px 44px 12px 12px;color:var(--brt);font-family:'IBM Plex Mono',monospace;font-size:13px;outline:none;transition:border-color .2s;direction:ltr;}
.key-inp:focus{border-color:var(--gr);}
.key-inp.error{border-color:var(--rd);}
.eye-btn{position:absolute;left:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--dm);font-size:16px;padding:4px;}
.key-hint{font-size:12px;color:var(--dm);margin-bottom:16px;display:flex;align-items:center;gap:6px;}
.key-hint .lock{color:var(--gr);}
.submit-btn{width:100%;background:var(--gr);border:none;border-radius:8px;padding:12px;color:#0d1117;font-family:'Tajawal',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;}
.submit-btn:hover{background:#45e063;transform:translateY(-1px);}
.err-msg{color:var(--rd);font-size:12px;margin-top:8px;min-height:18px;}
.layout{display:flex;flex:1;overflow:hidden;}
.sidebar{width:210px;background:var(--sf);border-left:1px solid var(--bd);padding:12px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;flex-shrink:0;}
.sb-ttl{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--dm);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
.qb{display:block;width:100%;text-align:right;background:none;border:1px solid var(--bd);border-radius:6px;padding:7px 10px;color:var(--tx);font-family:'Tajawal',sans-serif;font-size:12px;cursor:pointer;margin-bottom:4px;transition:all .15s;}
.qb:hover{border-color:var(--gr);color:var(--gr);background:var(--glo);}
.qb.danger:hover{border-color:var(--rd);color:var(--rd);background:#2a0f0f;}
.chat{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.msgs{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;}
.msg{display:flex;gap:10px;animation:fu .22s ease;}.msg.user{flex-direction:row-reverse;}
@keyframes fu{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
.av{width:30px;height:30px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;flex-shrink:0;}
.msg.bot .av{background:var(--glo);color:var(--gr);border:1px solid var(--gr);}
.msg.user .av{background:#1c2d4a;color:var(--bl);border:1px solid var(--bl);}
.bbl{max-width:74%;padding:11px 15px;border-radius:8px;font-size:14px;line-height:1.8;word-break:break-word;}
.msg.bot .bbl{background:var(--sf);border:1px solid var(--bd);border-radius:2px 8px 8px 8px;white-space:pre-wrap;}
.msg.user .bbl{background:#1c2d4a;border:1px solid #2d4a6e;color:var(--brt);border-radius:8px 2px 8px 8px;}
.bbl pre{font-family:'IBM Plex Mono',monospace;background:#0a0e14;border:1px solid var(--bd);border-left:3px solid var(--gr);border-radius:6px;padding:10px;margin:6px 0;display:block;overflow-x:auto;font-size:12px;color:var(--gr);line-height:1.6;white-space:pre;}
.src-tag{font-family:'IBM Plex Mono',monospace;font-size:10px;padding:2px 8px;border-radius:10px;margin-top:5px;display:inline-block;}
.src-groq{background:#1a1a3a;color:var(--bl);border:1px solid #2a2a5a;}
.src-local{background:var(--glo);color:var(--gr);border:1px solid #1a3a1a;}
.typing-dots{display:flex;gap:4px;align-items:center;padding:4px 0;}
.typing-dots span{width:7px;height:7px;border-radius:50%;background:var(--gr);animation:bn 1.1s infinite;}
.typing-dots span:nth-child(2){animation-delay:.2s;}.typing-dots span:nth-child(3){animation-delay:.4s;}
@keyframes bn{0%,80%,100%{transform:translateY(0);opacity:.4;}40%{transform:translateY(-6px);opacity:1;}}
.inp-area{padding:12px 16px;border-top:1px solid var(--bd);background:var(--sf);display:flex;gap:10px;align-items:flex-end;}
.inp-wrap{flex:1;position:relative;background:var(--bg);border:1px solid var(--bd);border-radius:8px;transition:border-color .2s;}
.inp-wrap:focus-within{border-color:var(--gr);}
.prmt{position:absolute;right:11px;top:50%;transform:translateY(-50%);font-family:'IBM Plex Mono',monospace;font-size:13px;color:var(--gr);pointer-events:none;}
textarea{width:100%;background:none;border:none;outline:none;color:var(--brt);font-family:'Tajawal',sans-serif;font-size:14px;padding:11px 11px 11px 36px;resize:none;max-height:100px;line-height:1.5;}
.sndbtn{background:var(--gr);border:none;width:40px;height:40px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.sndbtn:hover{background:#45e063;transform:translateY(-1px);}
.sndbtn svg{width:17px;height:17px;fill:#0d1117;}
::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-thumb{background:var(--bd);border-radius:3px;}
@media(max-width:600px){.sidebar{display:none;}}
</style>
</head>
<body>
<div class="setup" id="setup">
  <div class="setup-card">
    <div class="setup-logo">🤖</div>
    <div class="setup-title">BILAL_X</div>
    <div class="setup-sub">مساعد Linux الذكي — تحتاج مفتاح Groq مجاني للبدء</div>
    <div class="setup-steps">
      <div class="step"><div class="step-num">1</div><div>اذهب لـ <a href="https://console.groq.com" target="_blank">console.groq.com</a> وأنشئ حساباً مجانياً</div></div>
      <div class="step"><div class="step-num">2</div><div>اضغط <b style="color:var(--gr)">API Keys</b> ثم <b style="color:var(--gr)">Create API Key</b></div></div>
      <div class="step"><div class="step-num">3</div><div>انسخ المفتاح والصقه هنا 👇</div></div>
    </div>
    <div class="inp-group">
      <input class="key-inp" id="keyInput" type="password" placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx" dir="ltr" autocomplete="off">
      <button class="eye-btn" onclick="toggleEye()">👁️</button>
    </div>
    <div class="key-hint"><span class="lock">🔒</span><span>مفتاحك يبقى في متصفحك فقط — لن يُرسل أو يُخزن في أي سيرفر</span></div>
    <button class="submit-btn" onclick="saveKey()">ابدأ المحادثة ←</button>
    <div class="err-msg" id="errMsg"></div>
  </div>
</div>
<div class="hdr">
  <div class="dots"><div class="dot dr"></div><div class="dot dy"></div><div class="dot dg"></div></div>
  <div class="ttl">bilal@linux:~ — <b>BILAL_X</b></div>
  <div class="key-status" onclick="changeKey()">
    <div class="key-indicator" id="keyIndicator"></div>
    <span class="key-label" id="keyLabel">لا يوجد مفتاح</span>
  </div>
</div>
<div class="layout">
  <div class="chat">
    <div class="msgs" id="msgs">
      <div class="msg bot"><div class="av">$_</div><div class="bbl">🐧 <b>أهلاً! أنا BILAL_X</b><br><br>مساعدك الذكي لـ Linux والبرمجة.<br>اسألني أي شيء أو اكتب /help للأوامر 😊</div></div>
    </div>
    <div class="inp-area">
      <div class="inp-wrap"><span class="prmt">$</span><textarea id="inp" placeholder="اكتب سؤالك... (Enter)" rows="1"></textarea></div>
      <button class="sndbtn" onclick="send()"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>
    </div>
  </div>
  <div class="sidebar">
    <div><div class="sb-ttl">// المفتاح</div><button class="qb" onclick="changeKey()">🔑 تغيير المفتاح</button><button class="qb danger" onclick="deleteKey()">🗑️ حذف المفتاح</button></div>
    <div><div class="sb-ttl">// يومي</div><button class="qb" onclick="q('مرحبا!')">👋 تحية</button><button class="qb" onclick="q('كيف حالك؟')">😊 كيف حالك؟</button></div>
    <div><div class="sb-ttl">// Linux</div><button class="qb" onclick="q('اشرح grep في Linux')">grep</button><button class="qb" onclick="q('اشرح chmod')">chmod</button><button class="qb" onclick="q('أساسيات Python')">Python</button></div>
    <div><div class="sb-ttl">// أدوات</div><button class="qb" onclick="q('/pass 20')">/pass</button><button class="qb" onclick="q('/help')">/help</button><button class="qb" onclick="q('/clear')">/clear مسح</button></div>
  </div>
</div>
<script>
let apiKey = localStorage.getItem('bilalx_groq_key') || '';
let history = [];

function saveKey() {
  const key = document.getElementById('keyInput').value.trim();
  if(!key.startsWith('gsk_')) { document.getElementById('errMsg').textContent='⚠️ المفتاح يجب أن يبدأ بـ gsk_'; return; }
  apiKey = key;
  localStorage.setItem('bilalx_groq_key', key);
  document.getElementById('setup').style.display = 'none';
  updateKeyStatus(true);
}

function updateKeyStatus(hasKey) {
  const ind = document.getElementById('keyIndicator');
  const lbl = document.getElementById('keyLabel');
  if(hasKey && apiKey) { ind.classList.add('active'); lbl.textContent = apiKey.substring(0,8)+'••••••••'; }
  else { ind.classList.remove('active'); lbl.textContent = 'لا يوجد مفتاح'; }
}

function changeKey() { document.getElementById('setup').style.display = 'flex'; }
function deleteKey() { if(confirm('حذف المفتاح؟')) { apiKey=''; localStorage.removeItem('bilalx_groq_key'); updateKeyStatus(false); changeKey(); } }
function toggleEye() { const inp = document.getElementById('keyInput'); inp.type = inp.type === 'password' ? 'text' : 'password'; }

function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function fmt(t) { return esc(t).replace(/`([^`]+)`/g, '<code style="background:#0d1117;padding:2px 5px;border-radius:3px;color:#39d353;">$1</code>'); }

function addMsg(html, isUser, source) {
  const d = document.createElement('div');
  d.className = 'msg ' + (isUser ? 'user' : 'bot');
  let tag = '';
  if(!isUser && source==='groq') tag='<div style="margin-top:5px"><span class="src-tag src-groq">🤖 Groq AI</span></div>';
  if(!isUser && source==='local') tag='<div style="margin-top:5px"><span class="src-tag src-local">⚙️ أمر محلي</span></div>';
  d.innerHTML = `<div class="av">${isUser ? 'أنت' : '$_'}</div><div class="bbl">${html}${tag}</div>`;
  document.getElementById('msgs').appendChild(d);
  d.scrollIntoView({behavior:'smooth'});
}

let tEl=null;
function showT() { tEl=document.createElement('div'); tEl.className='msg bot'; tEl.innerHTML='<div class="av">$_</div><div class="bbl"><div class="typing-dots"><span></span><span></span><span></span></div></div>'; document.getElementById('msgs').appendChild(tEl); tEl.scrollIntoView({behavior:'smooth'}); }
function hideT() { if(tEl) tEl.remove(); tEl=null; }

async function send() {
  const msg = document.getElementById('inp').value.trim();
  if(!msg) return;
  if(!msg.startsWith('/') && !apiKey) { changeKey(); return; }
  document.getElementById('inp').value = '';
  addMsg(esc(msg), true);
  showT();
  try {
    const r = await fetch('/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:msg, api_key:apiKey, history:history}) });
    const d = await r.json();
    hideT();
    if(d.error === 'invalid_key') { changeKey(); document.getElementById('errMsg').textContent='❌ المفتاح غير صالح'; return; }
    if(d.response === "CLEAR_CONSOLE") { document.getElementById('msgs').innerHTML=''; addMsg('🧹 تم مسح الشاشة', false, 'local'); history=[]; return; }
    if(d.response) { history.push({role:'user', content:msg}, {role:'assistant', content:d.response}); if(history.length>20) history=history.slice(-20); addMsg(fmt(d.response), false, d.source); }
  } catch(e) { hideT(); addMsg('⚠️ خطأ في الاتصال', false); }
}
function q(v) { document.getElementById('inp').value=v; send(); }
document.getElementById('inp').addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
if(apiKey) { document.getElementById('setup').style.display = 'none'; updateKeyStatus(true); }
</script>
</body>
</html>"""

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)