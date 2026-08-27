// main.js — submit using form-encoded POST, replace page with a locked Thank You view (no close/redirect)
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

  // Collect form data
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
      // Replace the page with a minimal locked thank-you view (no close/redirect)
      showThankYouPageLocked(result.message || CONFIG.MESSAGES.success);
      if (form) form.reset();
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

/* --- Replace page with a locked Thank You content (no close/redirect) --- */
function showThankYouPageLocked(message) {
  const container = document.querySelector('.container');
  if (!container) {
    // fallback: show alert only
    alert(message || CONFIG.MESSAGES.success);
    // do not redirect or auto-close
    return;
  }

  container.innerHTML = `
    <div style="text-align:center;padding:40px 18px;">
      <img id="logoImage" alt="GHP Microfinance logo" class="logo" style="width:120px;margin:0 auto 12px;" />
      <h2 style="margin-top:6px;color:#1f2937;">Thank you for your feedback!</h2>
      <p id="thankYouMessage" style="color:#374151;margin-top:8px;">${escapeHtml(message || CONFIG.MESSAGES.success)}</p>
      <p style="color:#9ca3af;margin-top:18px;font-size:13px;font-weight:600;">Back navigation is disabled — you cannot return to the form.</p>
    </div>
  `;

  // Try to (re)load logo into new markup
  try { if (window.LogoManager && typeof window.LogoManager.loadLogo === 'function') window.LogoManager.loadLogo(); } catch(e){}

  // Lock browser back navigation so user cannot go back to the form
  lockBackNavigation();
}

/* --- Lock back navigation after submission --- */
function lockBackNavigation() {
  try {
    // Replace current history entry with a locked marker, then push a thankyou entry.
    history.replaceState({submittedLocked: true}, document.title, location.href);
    history.pushState({thankyou: true}, document.title, location.href);

    // When a popstate occurs (user presses Back), re-push the thankyou state to keep them here.
    window.addEventListener('popstate', function (e) {
      try {
        // If the user tries to go back to the locked state, move them forward again
        if (e.state && e.state.submittedLocked) {
          history.pushState({thankyou: true}, document.title, location.href);
        } else {
          // For any popstate (defensive): always restore thankyou state
          history.pushState({thankyou: true}, document.title, location.href);
        }
      } catch (err) {
        // ignore any errors
        console.error('popstate handler error', err);
      }
    }, { once: false });
  } catch (err) {
    // history manipulation may fail in some contexts; we silently ignore
    console.warn('Could not lock back navigation', err);
  }
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

/* --- util --- */
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
  showThankYouPageLocked
};
