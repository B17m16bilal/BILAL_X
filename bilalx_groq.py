"""
╔══════════════════════════════════════════════════════════════╗
║       BILAL_X v2.0 — مساعد Linux الذكي                      ║
║       نسخة متطورة: بحث ويب + نماذج أذكى + أمان محسّن       ║
╚══════════════════════════════════════════════════════════════╝
"""

from flask import Flask, request, jsonify, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime
import os, re, json, time, hashlib, secrets, string, base64

try:
    import requests as req_lib
    REQUESTS_OK = True
except ImportError:
    REQUESTS_OK = False

app = Flask(__name__)

@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

GROQ_MODEL_FAST  = "llama-3.3-70b-versatile"
GROQ_MODEL_THINK = "deepseek-r1-distill-llama-70b"
GROQ_URL         = "https://api.groq.com/openai/v1/chat/completions"
DDG_URL          = "https://api.duckduckgo.com/"

SYSTEM_MSG = """أنت BILAL_X — مساعد تقني ذكي متخصص في Linux والبرمجة.

🎯 تخصصاتك: Linux، Python، Bash، Git، Docker، الشبكات، أمان الأنظمة، DevOps.

🗣️ أسلوبك:
- ردودك دائماً بالعربية الواضحة
- شخصيتك: ودود، صريح، مشجع، دقيق تقنياً
- عند شرح أوامر: دائماً ضع مثالاً عملياً بين ```
- للكود: استخدم markdown للتنسيق
- تحدث بشكل إنساني طبيعي، مش جاف
- اشرح "لماذا" وليس فقط "كيف"
"""

def sanitize_input(text, max_len=2000):
    if not text: return ""
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', str(text))
    return text.strip()[:max_len]

def validate_api_key(key):
    if not key: return False, "no_key"
    key = key.strip()
    if not key.startswith('gsk_'): return False, "invalid_format"
    if len(key) < 20 or len(key) > 200: return False, "invalid_length"
    if not re.match(r'^gsk_[a-zA-Z0-9_-]+$', key): return False, "invalid_chars"
    return True, "ok"

def search_web(query, max_results=5):
    try:
        params = {'q': query, 'format': 'json', 'no_html': '1', 'skip_disambig': '1'}
        resp = req_lib.get(DDG_URL, params=params, timeout=8,
                           headers={'User-Agent': 'BILAL_X/2.0'})
        if resp.status_code != 200:
            return {"ok": False, "error": "search_failed"}
        data = resp.json()
        results = []
        if data.get('Answer'):
            results.append({"title": "إجابة مباشرة", "snippet": data['Answer'][:400],
                             "url": "", "source": "DuckDuckGo", "type": "direct_answer"})
        if data.get('Abstract'):
            results.append({"title": data.get('Heading', query),
                             "snippet": data['Abstract'][:400],
                             "url": data.get('AbstractURL', ''),
                             "source": data.get('AbstractSource', 'DuckDuckGo'),
                             "type": "abstract"})
        for topic in data.get('RelatedTopics', [])[:max_results]:
            if isinstance(topic, dict) and topic.get('Text'):
                results.append({"title": topic.get('Text', '')[:80],
                                 "snippet": topic.get('Text', '')[:300],
                                 "url": topic.get('FirstURL', ''),
                                 "source": "DuckDuckGo", "type": "related"})
        return {"ok": True, "results": results[:max_results], "query": query}
    except Exception as e:
        return {"ok": False, "error": str(e)[:80]}

def handle_pass(args):
    try:    length = min(max(int(args[0]), 8), 64)
    except: length = 16
    chars = string.ascii_letters + string.digits + "!@#$%^&*_+-=[]{};"
    pw = ''.join(secrets.choice(chars) for _ in range(length))
    s  = sum([len(pw)>=12, any(c.isupper() for c in pw), any(c.islower() for c in pw),
              any(c.isdigit() for c in pw), any(c in "!@#$%^&*" for c in pw)])
    st = {5:"قوية جداً 💪", 4:"قوية ✅", 3:"متوسطة ⚠️"}.get(s, "ضعيفة ❌")
    return f"🔐 كلمة مرور ({length} حرف):\n\n  {pw}\n\nالقوة: {st}\nالـ Entropy: ~{length * 6:.0f} bits"

def handle_hash(args):
    t = ' '.join(args)
    if not t: return "❌ استخدام: /hash [نص]"
    return (f'🔒 تشفير: "{t[:40]}"\n\nMD5:    {hashlib.md5(t.encode()).hexdigest()}\n'
            f"SHA1:   {hashlib.sha1(t.encode()).hexdigest()}\n"
            f"SHA256: {hashlib.sha256(t.encode()).hexdigest()}")

def handle_encode(args):
    t = ' '.join(args)
    if not t: return "❌ استخدام: /encode [نص]"
    return f"🔐 Base64:\n  {base64.b64encode(t.encode()).decode()}"

def handle_decode(args):
    t = ' '.join(args)
    if not t: return "❌ استخدام: /decode [نص]"
    try:    return f"🔓 فك Base64:\n  {base64.b64decode(t + '==').decode('utf-8')}"
    except: return "❌ نص Base64 غير صالح"

def handle_ip(args):
    target = args[0] if args else ''
    try:
        url = f"https://ipapi.co/{target}/json/" if target else "https://ipapi.co/json/"
        resp = req_lib.get(url, timeout=5)
        if resp.status_code == 200:
            d = resp.json()
            return (f"🌐 IP: {d.get('ip','؟')}\nالبلد: {d.get('country_name','؟')}\n"
                    f"المدينة: {d.get('city','؟')}\nالمزود: {d.get('org','؟')}\n"
                    f"المنطقة: {d.get('timezone','؟')}")
    except: pass
    return "❌ تعذر جلب معلومات IP"

def handle_clear(args): return "CLEAR_CONSOLE"

def handle_help(args):
    return ("📚 الأوامر المتاحة:\n\n"
            "═══ أدوات ═══\n"
            "/pass [طول]    كلمة مرور قوية\n"
            "/hash [نص]     تشفير SHA/MD5\n"
            "/encode [نص]   Base64\n"
            "/decode [نص]   فك Base64\n"
            "/ip [عنوان]    معلومات IP\n"
            "/search [بحث]  بحث الويب 🔍\n\n"
            "═══ AI ═══\n"
            "/think [سؤال]  وضع التفكير العميق 🧠\n"
            "/clear         مسح الشاشة\n"
            "/help          هذه المساعدة")

COMMANDS = {
    "/pass": handle_pass, "/hash": handle_hash,
    "/encode": handle_encode, "/decode": handle_decode,
    "/ip": handle_ip, "/clear": handle_clear, "/help": handle_help,
}

def _local_command(msg):
    parts = msg.strip().split()
    if not parts: return None
    cmd = parts[0].lower()
    return COMMANDS[cmd](parts[1:]) if cmd in COMMANDS else None

def classify_query(msg):
    msg_lower = msg.lower()
    needs_search = any(k in msg_lower for k in [
        'آخر', 'أحدث', 'جديد', 'اليوم', 'حالياً', '2024', '2025',
        'latest', 'new', 'current', 'today', 'recent'])
    needs_think = any(k in msg_lower for k in [
        'اشرح', 'كيف يعمل', 'فسّر', 'قارن', 'حلل', 'لماذا',
        'خوارزمية', 'architecture', 'أفضل طريقة', 'explain'])
    return {
        "needs_search": needs_search,
        "model": GROQ_MODEL_THINK if needs_think else GROQ_MODEL_FAST,
    }

def call_groq(api_key, messages, model=None, retries=3):
    if model is None: model = GROQ_MODEL_FAST
    for attempt in range(retries):
        try:
            resp = req_lib.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "max_tokens": 2048, "temperature": 0.7},
                timeout=30
            )
            if resp.status_code == 200:
                data = resp.json()
                return {"ok": True, "text": data["choices"][0]["message"]["content"].strip(),
                        "model": model, "tokens": data.get("usage", {}).get("total_tokens", 0)}
            if resp.status_code == 401: return {"ok": False, "error": "invalid_key"}
            if resp.status_code == 429:
                time.sleep(2 ** attempt)
                continue
            return {"ok": False, "error": f"groq_error_{resp.status_code}"}
        except req_lib.exceptions.Timeout:
            if attempt < retries - 1: time.sleep(1); continue
            return {"ok": False, "error": "timeout"}
        except Exception as e:
            return {"ok": False, "error": str(e)[:80]}
    return {"ok": False, "error": "rate_limit"}

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/chat', methods=['POST'])
@limiter.limit("40 per minute")
def chat():
    if not REQUESTS_OK:
        return jsonify({'error': 'server_error'}), 500
    data = request.get_json(force=True, silent=True)
    if not data: return jsonify({'error': 'invalid_json'}), 400

    message = sanitize_input(data.get('message', ''))
    api_key = sanitize_input(data.get('api_key', ''), max_len=200)
    history = data.get('history', [])
    mode    = data.get('mode', 'normal')

    if not message: return jsonify({'error': 'empty_message'}), 400
    if not isinstance(history, list): history = []
    history = history[-12:]

    local = _local_command(message)
    if local == "CLEAR_CONSOLE":
        return jsonify({'response': 'CLEAR_CONSOLE', 'source': 'local'})
    if local:
        return jsonify({'response': local, 'source': 'local'})

    if message.lower().startswith('/search '):
        query = message[8:].strip()
        if not query: return jsonify({'response': '❌ اكتب: /search [موضوع]', 'source': 'local'})
        result = search_web(query, max_results=6)
        return jsonify({'response': 'SEARCH_RESULTS', 'source': 'search', 'search_data': result})

    valid, key_error = validate_api_key(api_key)
    if not valid: return jsonify({'error': key_error})

    classification = classify_query(message)
    search_context = ""
    search_data = None

    if classification['needs_search']:
        sr = search_web(message, max_results=3)
        if sr['ok'] and sr.get('results'):
            search_data = sr
            snippets = "\n".join([f"- {r['title']}: {r['snippet'][:200]}" for r in sr['results'][:3]])
            search_context = f"\n\n[معلومات محدثة من الويب]:\n{snippets}"

    messages = [{"role": "system", "content": SYSTEM_MSG + search_context}]
    for h in history:
        if isinstance(h, dict) and h.get('role') in ['user', 'assistant']:
            content = sanitize_input(str(h.get('content', '')), max_len=1000)
            if content: messages.append({"role": h['role'], "content": content})
    messages.append({"role": "user", "content": message})

    model = GROQ_MODEL_THINK if mode == 'think' else classification['model']
    result = call_groq(api_key, messages, model=model)

    if result["ok"]:
        resp_data = {'response': result["text"], 'source': 'groq',
                     'model': result['model'], 'tokens': result.get('tokens', 0)}
        if search_data: resp_data['search_data'] = search_data
        return jsonify(resp_data)

    return jsonify({'error': result["error"]})

@app.route('/search', methods=['POST'])
@limiter.limit("20 per minute")
def web_search_route():
    data = request.get_json(force=True, silent=True)
    if not data: return jsonify({'error': 'invalid_json'}), 400
    query = sanitize_input(data.get('query', ''))
    if not query: return jsonify({'error': 'empty_query'}), 400
    return jsonify(search_web(query, max_results=6))

@app.route('/robots.txt')
def robots():
    return ("User-agent: *\nAllow: /\nSitemap: https://bilal-x.onrender.com/sitemap.xml\n",
            200, {'Content-Type': 'text/plain'})

@app.route('/sitemap.xml')
def sitemap():
    today = datetime.now().strftime('%Y-%m-%d')
    return (f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            f'<url><loc>https://bilal-x.onrender.com/</loc><lastmod>{today}</lastmod>'
            f'<changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>',
            200, {'Content-Type': 'application/xml'})

@app.route('/google78ab5f00e22cd85c.html')
def google_verification():
    return "google-site-verification: google78ab5f00e22cd85c.html", 200

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host='0.0.0.0', port=port)
