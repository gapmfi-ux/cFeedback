// main.js — submit using the simple form-encoded API and show a success modal that closes the page
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('feedbackForm');
  const submitBtn = document.getElementById('submitBtn');
  const messageContainer = document.getElementById('messageContainer');

  // Wire form submit
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Wire modal close button if it exists
  const modalClose = document.getElementById('submissionModalClose');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      closeSuccessModalAndWindow();
    });
  }

  // Also allow clicking backdrop close (if user clicks on backdrop)
  const modalBackdrop = document.getElementById('submissionModal');
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (ev) => {
      if (ev.target === modalBackdrop) closeSuccessModalAndWindow();
    });
  }
});

/**
 * Handle form submission
 * @param {Event} e - Form submit event
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('submitBtn');
  const messageContainer = document.getElementById('messageContainer');
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

  // Disable submit button
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    const result = await submitFeedback(formData);

    if (result && result.success) {
      // Show modal success (will attempt to close the window when user clicks Close)
      showSuccessModal(result.message || CONFIG.MESSAGES.success);
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
  }
}

/* Helper functions (unchanged) */
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

/**
 * Submit feedback to the backend (form-encoded to avoid CORS preflight)
 * @param {Object} data - Form data to submit
 * @returns {Promise<Object>} - Parsed JSON response from the server
 */
async function submitFeedback(data) {
  const payload = new URLSearchParams();
  payload.append('action', 'processForm');

  Object.keys(data).forEach(k => {
    const v = data[k];
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      payload.append(k, JSON.stringify(v));
    } else {
      payload.append(k, String(v));
    }
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
    if (err && err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

/**
 * Show a success modal using #submissionModal and close the page when user clicks Close.
 * @param {string} message
 */
function showSuccessModal(message) {
  const modal = document.getElementById('submissionModal');
  const msgEl = document.getElementById('submissionModalMessage');
  const closeBtn = document.getElementById('submissionModalClose');

  if (!modal || !msgEl) {
    // fallback to inline message if modal not found
    showMessage('success', message || CONFIG.MESSAGES.success);
    // still attempt to close after a short timeout
    setTimeout(() => closeSuccessModalAndWindow(), 2500);
    return;
  }

  msgEl.textContent = message || CONFIG.MESSAGES.success;

  // show modal (flex to center content, form.html has style display:none initially)
  modal.style.display = 'flex';

  // ensure logo renders inside modal (if you show logo there)
  try { if (window.LogoManager && typeof window.LogoManager.loadLogo === 'function') window.LogoManager.loadLogo(); } catch(e){}

  // focus the close button for accessibility
  if (closeBtn) {
    closeBtn.focus({ preventScroll: true });
  }
}

/**
 * Attempt to close the modal AND the browser tab/window.
 * If window.close() is blocked, redirect to index.html as a fallback.
 */
function closeSuccessModalAndWindow() {
  const modal = document.getElementById('submissionModal');
  if (modal) modal.style.display = 'none';

  // First try to close the window (works for windows opened by script or some browsers)
  try {
    window.close();
  } catch (e) {
    // ignore
  }

  // If the window didn't close (most modern browsers block close on user-opened tabs),
  // navigate back to index.html after a short delay so user isn't left stranded.
  setTimeout(function() {
    try {
      if (!window.closed) {
        // Prefer closing opener if present (if form opened in a popup and parent should close)
        try {
          if (window.opener && !window.opener.closed) {
            // attempt to close the parent that opened this window (best-effort)
            try { window.opener.close(); } catch (ignore) {}
          }
        } catch (e) {}

        // finally navigate to index.html
        window.location.href = 'index.html';
      }
    } catch (err) {
      // last resort: do nothing
      console.error('close fallback failed', err);
    }
  }, 200);
}

/**
 * Show a simple inline message (error)
 * @param {string} type - 'success' or 'error'
 * @param {string} message
 */
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

// Export functions for testing or external use
window.FeedbackForm = {
  handleFormSubmit,
  getRatings,
  validateRatings,
  submitFeedback,
  showMessage,
  showSuccessModal
};
