// api-feedback.js
// Standalone JSONP API client focused on Feedback functionality only.
// Usage: window.API.processForm(formData). Returns a Promise resolved with server response.

(function () {
  class FeedbackApi {
    constructor(opts = {}) {
      // Prefer CONFIG.SCRIPT_URL if available
      this.BASE_URL = (window.CONFIG && window.CONFIG.SCRIPT_URL) ? window.CONFIG.SCRIPT_URL : (opts.baseUrl || '');
      if (!this.BASE_URL) {
        console.warn('FeedbackApi: BASE_URL is empty. Set CONFIG.SCRIPT_URL or pass baseUrl option.');
      }

      this.debug = !!opts.debug;
      this.pendingRequests = new Map(); // dedupe concurrent identical requests
      this.cache = new Map();           // optional caching
      this.cacheTtl = opts.cacheTtl || (2 * 60 * 1000); // 2 minutes default
      this.defaultTimeout = opts.timeout || 15000; // ms
    }

    log(...args) { if (this.debug) console.log('[FeedbackApi]', ...args); }
    error(...args) { console.error('[FeedbackApi]', ...args); }

    _keyFor(action, data) {
      try { return action + '|' + JSON.stringify(data || {}); } catch (e) { return action + '|' + String(data); }
    }

    // JSONP request via script tag. Returns Promise resolved with server response.
    request(action, data = {}, options = {}) {
      const timeoutMs = options.timeout || this.defaultTimeout;
      const cacheKey = this._keyFor(action, data);
      const useCache = options.useCache !== false;

      // Cache lookup
      if (useCache && this.cache.has(cacheKey)) {
        const entry = this.cache.get(cacheKey);
        if ((Date.now() - entry.ts) < this.cacheTtl) {
          this.log('cache hit', action);
          return Promise.resolve(entry.value);
        } else {
          this.cache.delete(cacheKey);
        }
      }

      // Deduplicate in-flight identical requests
      if (this.pendingRequests.has(cacheKey)) {
        this.log('dedupe pending', action);
        return this.pendingRequests.get(cacheKey);
      }

      const promise = new Promise((resolve, reject) => {
        if (!this.BASE_URL) {
          reject(new Error('API base URL not configured (CONFIG.SCRIPT_URL missing)'));
          return;
        }

        const callbackName = '__fb_cb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8);
        let script = null;
        let timeoutId = null;

        const cleanup = () => {
          try { if (window[callbackName]) delete window[callbackName]; } catch(e) {}
          try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch(e){}
          try { if (timeoutId) clearTimeout(timeoutId); } catch(e){}
        };

        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('API request timeout (' + action + ')'));
        }, timeoutMs);

        window[callbackName] = (resp) => {
          cleanup();
          this.log('jsonp callback', action, resp);
          if (!resp) {
            reject(new Error('Empty response'));
            return;
          }
          if (resp && resp.success === false) {
            reject(new Error(resp.error || 'Server reported failure'));
            return;
          }
          try { this.cache.set(cacheKey, { value: resp, ts: Date.now() }); } catch(e) {}
          resolve(resp);
        };

        try {
          const urlObj = new URL(this.BASE_URL);
          urlObj.searchParams.append('action', action);
          if (data && Object.keys(data).length) {
            urlObj.searchParams.append('data', JSON.stringify(data));
          }
          urlObj.searchParams.append('callback', callbackName);
          if (options.forceNoCache) urlObj.searchParams.append('_', Date.now().toString(36));

          const fullUrl = urlObj.toString();
          script = document.createElement('script');
          script.src = fullUrl;
          script.async = true;
          script.onerror = function () {
            cleanup();
            reject(new Error('Network error loading JSONP script (' + action + ')'));
          };

          document.head.appendChild(script);
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

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

    // Get list of feedbacks; server may return array or { success: true, rows: [...] }
    async listFeedbacks(options = {}) {
      return this.request(options.action || 'list', {}, options);
    }

    // Check a submission by id
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
    jsonp(action, data = {}, options = {}) {
      return this.request(action, data, options);
    }
  }

  // Expose
  window.API = new FeedbackApi({ debug: false });
  window.FeedbackAPI = window.API;

  console.log('FeedbackApi initialized. Use window.API.processForm(formData). BASE_URL =', window.API.BASE_URL);
})();
