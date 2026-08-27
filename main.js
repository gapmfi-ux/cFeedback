// main.js — submit using the simple form-encoded API, show loading, then replace page with a thank-you view
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('feedbackForm');
  if (form) form.addEventListener('submit', handleFormSubmit);
});

/**
 * Handle form submission
 * @param {Event} e - Form submit event
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const form = document.getElementById('feedbackForm');

  // Validate all ratings are selected
  const ratings = getRatings();
  if (!validateRatings(ratings)) {
    showMessage('error', CONFIG.MESSAGES.error.incomplete);
    return;
  }

  // Collect form data (match the names used in your form.html)
  const formData = {
    overallSatisfaction: (ratings.overallSatisfaction && ratings.overallSatisfaction.value) || '',
    qualityOfService: (ratings.qualityOfService && ratings.qualityOfService.value) || '',
    timeliness: (ratings.timeliness && ratings.timeliness.value) || '',
    staffFriendliness: (ratings.staffFriendliness && ratings.staffFriendliness.value) || '',
    speedOfService: (document.querySelector('input[name="speedOfService"]:checked') || {}).value || '',
    recommend: (document.querySelector('input[name="recommend"]:checked') || {}).value || '',
    additionalComments: (document.getElementById('additionalComments') || {}).value || '',
    name: (document.getElementById('name') || {}).value || '',
    phone: (document.getElementById('phone') || {}).value || '',
    // optional client id to help server-side de-dupe
    _submissionId: 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8)
  };

  // Disable submit button and show loading
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }
  showLoadingOverlay('Submitting your feedback…');

  try {
    const result = await submitFeedback(formData);

    if (result && result.success) {
      // Replace the page with a thank-you view
      showThankYouPage(result.message || CONFIG.MESSAGES.success);
    } else {
      throw new Error(result && result.error ? result.error : 'Submission failed');
    }
  } catch (error) {
    console.error('Error:', error);
    showMessage('error', CONFIG.MESSAGES.error.submission);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Feedback';
    }
    hideLoadingOverlay();
  }
}

/* --- Helpers: ratings/validation --- */
function getRatings() {
  return {
    overallSatisfaction: document.querySelector('input[name="overallSatisfaction"]:checked'),
    qualityOfService: document.querySelector('input[name="qualityOfService"]:checked'),
    timeliness: document.querySelector('input[name="timeliness"]:checked'),
    staffFriendliness: document.querySelector('input[name="staffFriendliness"]:checked')
  };
}
function validateRatings(ratings) {
  return Object.values(ratings).every(r => r !== null);
}

/* --- Submit to backend as form-encoded to avoid preflight --- */
async function submitFeedback(data) {
  const payload = new URLSearchParams();
  payload.append('action', 'processForm');

  Object.keys(data).forEach(k => {
    const v = data[k];
    if (v === null || v === undefined) return;
    if (typeof v === 'object') payload.append(k, JSON.stringify(v));
    else payload.append(k, String(v));
  });

  const controller = new AbortController();
  const timeoutMs = 20000; // 20s
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: payload.toString(),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!res.ok) {
      const txt = await res.text().catch(()=>null);
      throw new Error('Network error: ' + res.status + (txt ? (' - ' + txt) : ''));
    }

    const json = await res.json().catch(async (err)=>{
      const txt = await res.text().catch(()=>null);
      throw new Error('Invalid JSON response' + (txt ? (': ' + txt) : ''));
    });

    return json;
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
}

/* --- Loading overlay --- */
function showLoadingOverlay(text) {
  let ov = document.getElementById('submissionOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'submissionOverlay';
    ov.className = 'overlay-backdrop';
    ov.innerHTML = `
      <div class="overlay-card" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <div style="margin-top:12px;font-weight:700;color:#1f2937;">${escapeHtml(text || 'Submitting…')}</div>
      </div>
    `;
    document.body.appendChild(ov);
  } else {
    const d = ov.querySelector('.overlay-card div:nth-child(2)');
    if (d) d.textContent = text || 'Submitting…';
    ov.style.display = 'flex';
  }
}
function hideLoadingOverlay() {
  const ov = document.getElementById('submissionOverlay');
  if (ov) ov.style.display = 'none';
}

/* --- Replace page with Thank You content --- */
function showThankYouPage(message) {
  const container = document.querySelector('.container');
  if (!container) {
    // fallback to modal alert
    alert(message || CONFIG.MESSAGES.success);
    closePageAfterDelay();
    return;
  }

  container.innerHTML = `
    <div style="text-align:center;padding:28px;">
      <img id="logoImage" alt="GHP Microfinance logo" class="logo" style="width:120px;margin:0 auto 12px;" />
      <h2 style="margin-top:6px;color:#1f2937;">Thank you for your feedback!</h2>
      <p id="thankYouMessage" style="color:#374151;margin-top:8px;">${escapeHtml(message || CONFIG.MESSAGES.success)}</p>
      <div style="margin-top:18px;">
        <button id="thankYouCloseBtn" class="submit-btn" style="width:auto;padding:10px 18px;">Close</button>
      </div>
      <div style="margin-top:12px;color:#94a3b8;font-size:13px;">You can close this window or return to the home page.</div>
    </div>
  `;

  // Try to (re)load logo into new markup
  try { if (window.LogoManager && typeof window.LogoManager.loadLogo === 'function') window.LogoManager.loadLogo(); } catch(e){}

  const closeBtn = document.getElementById('thankYouCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      closePageAndFallback();
    });
  }

  // Auto-close after a short delay if you want (optional). Comment out if not desired:
  // setTimeout(() => { closePageAndFallback(); }, 8000);
}

/* --- Close helpers --- */
function closePageAndFallback() {
  try { window.close(); } catch (e) { /* ignore */ }
  // If not closed, redirect after short delay
  setTimeout(() => {
    try {
      if (!window.closed) window.location.href = 'index.html';
    } catch (e) {
      window.location.href = 'index.html';
    }
  }, 200);
}
function closePageAfterDelay() {
  setTimeout(() => closePageAndFallback(), 2000);
}

/* --- Inline message (errors) --- */
function showMessage(type, message) {
  const messageContainer = document.getElementById('messageContainer');
  const className = type === 'success' ? 'success-message' : 'error-message';
  const icon = type === 'success' ? '✅' : '❌';

  if (!messageContainer) {
    alert(message);
    return;
  }

  messageContainer.innerHTML = `
    <div class="${className}">
      ${icon} ${message}
    </div>
  `;

  if (type === 'success') {
    setTimeout(() => { if (messageContainer) messageContainer.innerHTML = ''; }, 5000);
  }
}

/* --- small util --- */
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* export for tests */
window.FeedbackForm = {
  handleFormSubmit,
  getRatings,
  validateRatings,
  submitFeedback,
  showMessage,
  showThankYouPage
};
