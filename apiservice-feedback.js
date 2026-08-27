// apiservice-feedback.js (fetch-only)
class FeedbackAPI {
  constructor() {
    this.BASE_URL = (window.CONFIG && window.CONFIG.SCRIPT_URL) ? window.CONFIG.SCRIPT_URL : 'https://script.google.com/macros/s/YOUR_EXEC_ID/exec';
    this.debug = false;
  }
  log(...args){ if(this.debug) console.log('[FeedbackAPI]', ...args); }
  error(...args){ console.error('[FeedbackAPI]', ...args); }

  // processForm: send JSON POST to server, expect JSON response { success: true/false, ... }
  async processForm(formData = {}, options = {}) {
    const timeoutMs = options.timeout || 20000;
    const controller = new AbortController();
    const timer = setTimeout(()=> controller.abort(), timeoutMs);

    try {
      this.log('POST', this.BASE_URL, formData);
      const res = await fetch(this.BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'processForm', formData: formData }),
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        // try to parse JSON error if available
        let text = await res.text().catch(()=>null);
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch(e){}
        const errMsg = parsed && parsed.error ? parsed.error : `Network response not ok: ${res.status}`;
        throw new Error(errMsg);
      }
      const json = await res.json();
      return json;
    } catch (err) {
      clearTimeout(timer);
      this.error('processForm fetch error', err);
      throw err;
    }
  }
}

window.FeedbackAPI = new FeedbackAPI();
