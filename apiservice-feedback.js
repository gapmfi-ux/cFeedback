// apiservice-feedback.js — fetch-based API client focused on Feedback functionality.
// Usage: window.API.processForm(formData). Returns a Promise resolved with server response.

(function () {
  class FeedbackApi {
    constructor(opts = {}) {
      this.BASE_URL = (window.CONFIG && window.CONFIG.SCRIPT_URL) ? window.CONFIG.SCRIPT_URL : (opts.baseUrl || '');
      if (!this.BASE_URL) {
        console.warn('FeedbackApi: BASE_URL is empty. Set CONFIG.SCRIPT_URL or pass baseUrl option.');
      }
      this.debug = !!opts.debug;
      this.pendingRequests = new Map(); // dedupe concurrent identical requests
      this.cache = new Map();
      this.cacheTtl = opts.cacheTtl || (2 * 60 * 1000); // 2 minutes default
      this.defaultTimeout = opts.timeout || 15000; // ms
    }

    log(...args) { if (this.debug) console.log('[FeedbackApi]', ...args); }
    error(...args) { console.error('[FeedbackApi]', ...args); }

    _keyFor(action, data) {
      try { return action + '|' + JSON.stringify(data || {}); } catch (e) { return action + '|' + String(data); }
    }

    // Generic request using fetch POST with JSON body { action, ...data }
    async request(action, data = {}, options = {}) {
      const timeoutMs = options.timeout || this.defaultTimeout;
      const cacheKey = this._keyFor(action, data);
      const useCache = options.useCache !== false;

      // cache lookup
      if (useCache && this.cache.has(cacheKey)) {
        const entry = this.cache.get(cacheKey);
        if ((Date.now() - entry.ts) < this.cacheTtl) {
          this.log('cache hit', action);
          return Promise.resolve(entry.value);
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // dedupe in-flight identical requests
      if (this.pendingRequests.has(cacheKey)) {
        this.log('dedupe pending', action);
        return this.pendingRequests.get(cacheKey);
      }

      const controller = new AbortController();
      const signal = controller.signal;

      const promise = new Promise(async (resolve, reject) => {
        if (!this.BASE_URL) {
          reject(new Error('API base URL not configured (CONFIG.SCRIPT_URL missing)'));
          return;
        }

        const body = Object.assign({}, data);
        body.action = action;

        const timer = setTimeout(() => {
          controller.abort();
        }, timeoutMs);

        try {
          const res = await fetch(this.BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            mode: 'cors',
            credentials: 'omit',
            body: JSON.stringify(body),
            signal
          });
          clearTimeout(timer);
          if (!res.ok) {
            const text = await res.text().catch(()=>null);
            reject(new Error('Network error: ' + res.status + (text ? (' - ' + text) : '')));
            return;
          }
          const json = await res.json().catch(async (err) => {
            const text = await res.text().catch(()=>null);
            throw new Error('Invalid JSON response' + (text ? (': ' + text) : ''));
          });

          this.log('fetch response', action, json);
          if (json && json.success === false) {
            reject(new Error(json.error || 'Server reported failure'));
            return;
          }

          try { this.cache.set(cacheKey, { value: json, ts: Date.now() }); } catch(e){}
          resolve(json);
        } catch (err) {
          if (err.name === 'AbortError') {
            reject(new Error('API request timeout (' + action + ')'));
          } else {
            reject(err);
          }
        }
      });

      // store pending and cleanup after done
      this.pendingRequests.set(cacheKey, promise);
      promise.finally(() => this.pendingRequests.delete(cacheKey));
      return promise;
    }

    // ---- Feedback-specific API methods ----

    // Submit feedback: sends action='processForm' with payload { formData: {...} }
    async processForm(formData = {}, options = {}) {
      if (!formData._submissionId) {
        formData._submissionId = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
      }
      this.log('processForm', formData);
      return this.request('processForm', { formData: formData }, options);
    }

    // Get list of feedbacks - server should accept action='list' and return array
    async listFeedbacks(options = {}) {
      return this.request(options.action || 'list', {}, options);
    }

    // Check submission
    async checkSubmission(submissionId, options = {}) {
      return this.request('checkSubmission', { submissionId: submissionId }, options);
    }

    // Test connectivity
    async testConnection(options = {}) {
      try {
        const r = await this.request('test', {}, options);
        return { connected: !!r && r.success !== false, raw: r };
      } catch (err) {
        return { connected: false, error: err.message || String(err) };
      }
    }

    // Convenience alias
    json(action, data = {}, options = {}) {
      return this.request(action, data, options);
    }
  }

  // Expose
  window.API = new FeedbackApi({ debug: false });
  window.FeedbackAPI = window.API;

  console.log('FeedbackApi initialized. Use window.API.processForm(formData). BASE_URL =', window.API.BASE_URL);
})();
