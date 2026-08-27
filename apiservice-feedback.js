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
      this.pendingRequests = new Map();
      this.cache = new Map();
      this.cacheTtl = opts.cacheTtl || (2 * 60 * 1000);
      this.defaultTimeout = opts.timeout || 15000;
    }

    log(...args) { if (this.debug) console.log('[FeedbackApi]', ...args); }
    error(...args) { console.error('[FeedbackApi]', ...args); }

    _keyFor(action, data) {
      try { return action + '|' + JSON.stringify(data || {}); } catch (e) { return action + '|' + String(data); }
    }

    // Build URLSearchParams body; objects are JSON.stringified
    _buildFormBody(action, data) {
      const body = new URLSearchParams();
      body.append('action', action);
      if (data && typeof data === 'object') {
        for (const k of Object.keys(data)) {
          const v = data[k];
          if (v === undefined || v === null) continue;
          if (typeof v === 'object') body.append(k, JSON.stringify(v));
          else body.append(k, String(v));
        }
      }
      return body;
    }

    // Generic request using fetch POST but send application/x-www-form-urlencoded (no preflight)
    async request(action, data = {}, options = {}) {
      const timeoutMs = options.timeout || this.defaultTimeout;
      const cacheKey = this._keyFor(action, data);
      const useCache = options.useCache !== false;

      if (useCache && this.cache.has(cacheKey)) {
        const entry = this.cache.get(cacheKey);
        if ((Date.now() - entry.ts) < this.cacheTtl) {
          this.log('cache hit', action);
          return Promise.resolve(entry.value);
        } else {
          this.cache.delete(cacheKey);
        }
      }

      if (this.pendingRequests.has(cacheKey)) {
        this.log('dedupe pending', action);
        return this.pendingRequests.get(cacheKey);
      }

      const promise = new Promise((resolve, reject) => {
        if (!this.BASE_URL) {
          reject(new Error('API base URL not configured (CONFIG.SCRIPT_URL missing)'));
          return;
        }

        // Build form body — stringifies nested objects (server already handles JSON strings)
        const body = this._buildFormBody(action, data);

        // Use AbortController for timeout
        const controller = new AbortController();
        const signal = controller.signal;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        // Important: set Content-Type to application/x-www-form-urlencoded (a "simple" content-type that avoids preflight)
        fetch(this.BASE_URL, {
          method: 'POST',
          // Note: application/x-www-form-urlencoded is a "simple" content type and avoids preflight.
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: body.toString(),
          mode: 'cors',
          credentials: 'omit',
          signal
        }).then(async (res) => {
          clearTimeout(timer);
          if (!res.ok) {
            const text = await res.text().catch(()=>null);
            throw new Error('Network error: ' + res.status + (text ? (' - ' + text) : ''));
          }
          // parse JSON body
          const json = await res.json().catch(async (err) => {
            const text = await res.text().catch(()=>null);
            throw new Error('Invalid JSON response' + (text ? (': ' + text) : ''));
          });

          this.log('fetch response', action, json);
          if (json && json.success === false) {
            throw new Error(json.error || 'Server reported failure');
          }
          try { this.cache.set(cacheKey, { value: json, ts: Date.now() }); } catch(e){}
          resolve(json);
        }).catch((err) => {
          clearTimeout(timer);
          if (err && err.name === 'AbortError') {
            reject(new Error('API request timeout (' + action + ')'));
          } else {
            reject(err);
          }
        });
      });

      this.pendingRequests.set(cacheKey, promise);
      promise.finally(() => this.pendingRequests.delete(cacheKey));
      return promise;
    }

    // Feedback-specific methods (unchanged)
    async processForm(formData = {}, options = {}) {
      if (!formData._submissionId) {
        formData._submissionId = 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,6);
      }
      this.log('processForm', formData);
      // note: we pass formData as a nested object; request() will JSON.stringify it into one form field
      return this.request('processForm', { formData: formData }, options);
    }

    async listFeedbacks(options = {}) {
      return this.request(options.action || 'list', {}, options);
    }
    async checkSubmission(submissionId, options = {}) {
      return this.request('checkSubmission', { submissionId: submissionId }, options);
    }
    async testConnection(options = {}) {
      try {
        const r = await this.request('test', {}, options);
        return { connected: !!r && r.success !== false, raw: r };
      } catch (err) {
        return { connected: false, error: err.message || String(err) };
      }
    }
    json(action, data = {}, options = {}) { return this.request(action, data, options); }
  }

  window.API = new FeedbackApi({ debug: false });
  window.FeedbackAPI = window.API;
  console.log('FeedbackApi initialized. Use window.API.processForm(formData). BASE_URL =', window.API.BASE_URL);
})();
