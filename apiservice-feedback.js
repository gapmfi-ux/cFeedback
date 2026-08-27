// apiservice-feedback.js
// Lightweight Feedback API: submit feedback (fetch JSON POST, fallback to hidden-form+iframe).
class FeedbackAPI {
  constructor() {
    // Prefer CONFIG.SCRIPT_URL if defined, fallback to placeholder
    this.BASE_URL = (window.CONFIG && window.CONFIG.SCRIPT_URL) ? window.CONFIG.SCRIPT_URL : 'https://script.google.com/macros/s/YOUR_EXEC_ID/exec';
    this.pendingRequests = new Map(); // dedupe identical concurrent writes
    this.debug = false;
  }

  log(...args) { if (this.debug) console.log('[FeedbackAPI]', ...args); }
  error(...args) { console.error('[FeedbackAPI]', ...args); }

  async processForm(formData = {}, options = {}) {
    this.log('processForm called', formData);
    const timeoutMs = options.timeout || 20000;
    const payload = Object.assign({}, formData);

    // 1) Try fetch JSON POST
    const tryFetch = async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(this.BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
          mode: 'cors',
          credentials: 'omit'
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error('Network response not ok: ' + res.status);
        const json = await res.json();
        if (json && json.success) return json;
        throw new Error((json && json.error) ? json.error : 'Server returned failure');
      } catch (err) {
        clearTimeout(timer);
        this.log('fetch attempt failed, will fallback', err && err.message);
        throw err;
      }
    };

    try {
      const res = await tryFetch();
      return res;
    } catch (fetchErr) {
      // fallback to iframe form POST
      this.log('Falling back to iframe POST');
      const cacheKey = 'feedback_iframe_' + JSON.stringify(formData || {});
      if (this.pendingRequests.has(cacheKey)) {
        this.log('Deduplicating concurrent iframe request');
        return this.pendingRequests.get(cacheKey);
      }

      const promise = new Promise((resolve, reject) => {
        try {
          const nonce = Date.now() + '_' + Math.random().toString(36).slice(2,8);
          const iframeName = `fb_iframe_${nonce}`;
          const formId = `fb_form_${nonce}`;

          // create hidden iframe (name required)
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.name = iframeName;
          iframe.id = iframeName;
          document.body.appendChild(iframe);

          // create hidden form
          const form = document.createElement('form');
          form.style.display = 'none';
          form.method = 'POST';
          form.action = this.BASE_URL;
          form.target = iframeName;
          form.id = formId;

          const addInput = (name, value) => {
            const i = document.createElement('input');
            i.type = 'hidden';
            i.name = name;
            i.value = value == null ? '' : String(value);
            form.appendChild(i);
          };

          // add fields
          for (const k of Object.keys(formData || {})) addInput(k, formData[k]);

          // add submission id for trace
          const submissionId = 'sid_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
          addInput('_submissionId', submissionId);

          document.body.appendChild(form);

          // determine allowed origin
          let allowedOrigin = 'https://script.google.com';
          try { allowedOrigin = new URL(this.BASE_URL).origin; } catch (err) { /* keep default */ }

          let timeoutId = null;
          const TIMEOUT_MS = options.timeout || timeoutMs;

          const onMessage = (ev) => {
            try {
              if (ev.origin !== allowedOrigin) {
                this.log('Ignored postMessage from', ev.origin);
                return;
              }
            } catch (err) {
              this.error('Origin check failed', err);
              return;
            }

            const data = ev.data || {};
            if (data && typeof data === 'object' && (data.success !== undefined || data.error !== undefined)) {
              cleanup();
              if (data.success) resolve(data);
              else reject(new Error(data.error || 'Server reported failure'));
            } else {
              this.log('Ignored unexpected iframe payload', data);
            }
          };

          window.addEventListener('message', onMessage, false);

          const cleanup = () => {
            try { window.removeEventListener('message', onMessage); } catch(e){}
            try { if (timeoutId) clearTimeout(timeoutId); } catch(e){}
            try { if (form.parentNode) form.parentNode.removeChild(form); } catch(e){}
            try { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); } catch(e){}
          };

          timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('Submission timeout (iframe fallback)'));
          }, TIMEOUT_MS);

          // submit
          try {
            form.submit();
            this.log('Iframe form submitted; awaiting postMessage');
          } catch (err) {
            cleanup();
            reject(err);
          }

        } catch (err) {
          this.error('Iframe fallback error', err);
          reject(err);
        }
      });

      this.pendingRequests.set(cacheKey, promise);
      promise.finally(() => this.pendingRequests.delete(cacheKey));
      return promise;
    }
  }

  // Optional JSONP read helper (if you want to fetch list)
  async request(action, data = {}, options = {}) {
    const callbackName = 'fb_cb_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
    const url = new URL(this.BASE_URL);
    url.searchParams.append('action', action);
    url.searchParams.append('data', JSON.stringify(data));
    url.searchParams.append('callback', callbackName);
    const fullUrl = url.toString();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (window[callbackName]) { delete window[callbackName]; reject(new Error('JSONP timeout')); }
      }, (options.timeout || 15000));

      window[callbackName] = (resp) => {
        clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        if (resp && resp.success !== false) resolve(resp);
        else reject(new Error((resp && resp.error) || 'JSONP error'));
      };

      const script = document.createElement('script');
      script.src = fullUrl;
      script.onerror = () => { clearTimeout(timer); delete window[callbackName]; if (script.parentNode) script.parentNode.removeChild(script); reject(new Error('JSONP load error')); };
      document.head.appendChild(script);
    });
  }
}

window.FeedbackAPI = new FeedbackAPI();
