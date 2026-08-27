// main.js — iframe-postMessage submit with loading + in-page thank-you replacement
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('feedbackForm');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Global listener left for safety; main listener is attached per-submission and validated by source
  window.addEventListener('message', function(ev) {
    // ignore unrelated messages here (we handle per-submission)
    // This global listener does nothing so extension noise is ignored.
  });
});

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');

  // Validate ratings
  const ratings = getRatings();
  if (!validateRatings(ratings)) {
    showTemporaryError('Please rate all categories before submitting.');
    return;
  }

  // Collect form data
  const formData = {
    overallSatisfaction: String(ratings.overallSatisfaction.value),
    qualityOfService: String(ratings.qualityOfService.value),
    timeliness: String(ratings.timeliness.value),
    staffFriendliness: String(ratings.staffFriendliness.value),
    speedOfService: String(ratings.speedOfService.value),
    recommend: String(ratings.recommend.value),
    additionalComments: (document.getElementById('additionalComments') || {}).value || '',
    name: (document.getElementById('name') || {}).value || '',
    phone: (document.getElementById('phone') || {}).value.trim() || ''
  };

  // Ensure no leftover temp elements
  removeTempSubmissionElements();

  // Create hidden iframe (must have name so form.target works)
  const iframeId = 'submission_iframe';
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = iframeId;
  iframe.name = iframeId;
  document.body.appendChild(iframe);

  // Build hidden form targeting iframe
  const formId = 'submission_form';
  const tempForm = document.createElement('form');
  tempForm.style.display = 'none';
  tempForm.method = 'POST';
  tempForm.action = CONFIG.SCRIPT_URL;
  tempForm.target = iframe.name;
  tempForm.id = formId;

  function addInput(name, value) {
    const inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = name;
    inp.value = value !== undefined && value !== null ? value : '';
    tempForm.appendChild(inp);
  }
  Object.keys(formData).forEach(k => addInput(k, formData[k]));
  document.body.appendChild(tempForm);

  // Show loading overlay
  showLoadingOverlay('Submitting your feedback…');

  // Disable submit UI
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

  // Prepare one-time message listener that accepts ONLY messages from the iframe window
  let handled = false;
  const messageListener = function(ev) {
    try {
      // Only accept messages from the iframe window we created
      if (ev.source !== iframe.contentWindow) {
        // ignore messages from other windows / extensions
        return;
      }
    } catch (ignored) {
      // If iframe.contentWindow not accessible, ignore
      return;
    }

    handled = true;
    // Clean up timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Hide loading overlay
    hideLoadingOverlay();

    // Re-enable submit UI
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }

    const data = ev.data || {};
    if (data && typeof data === 'object' && data.success) {
      // Replace form with thank-you panel
      showThankYouReplace(data.message || 'Thank you — your feedback has been received.');
      // remove temp elements
      removeTempSubmissionElements();
    } else {
      // show error modal / message
      const err = (data && data.error) ? data.error : 'Submission failed. Please try again.';
      showTemporaryError(err);
      removeTempSubmissionElements();
    }
  };

  window.addEventListener('message', messageListener);

  // Submit the form
  try {
    tempForm.submit();
  } catch (err) {
    console.error('submit error', err);
    hideLoadingOverlay();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }
    showTemporaryError('Submission failed (client). Please try again.');
    removeTempSubmissionElements();
    window.removeEventListener('message', messageListener);
    return;
  }

  // Timeout: if no response within TIMEOUT_MS, show error and cleanup
  const TIMEOUT_MS = 12000;
  const timeoutId = setTimeout(() => {
    if (handled) return;
    hideLoadingOverlay();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }
    showTemporaryError('Submission timed out. Please try again.');
    removeTempSubmissionElements();
    try { window.removeEventListener('message', messageListener); } catch(e){}
  }, TIMEOUT_MS);
}

function removeTempSubmissionElements() {
  const iframe = document.getElementById('submission_iframe');
  if (iframe) iframe.remove();
  const tempForm = document.getElementById('submission_form');
  if (tempForm) tempForm.remove();
}

/* Helpers: ratings */
function getRatings() {
  return {
    overallSatisfaction: document.querySelector('input[name="overallSatisfaction"]:checked'),
    qualityOfService: document.querySelector('input[name="qualityOfService"]:checked'),
    timeliness: document.querySelector('input[name="timeliness"]:checked'),
    staffFriendliness: document.querySelector('input[name="staffFriendliness"]:checked'),
    speedOfService: document.querySelector('input[name="speedOfService"]:checked'),
    recommend: document.querySelector('input[name="recommend"]:checked')
  };
}
function validateRatings(ratings) {
  return Object.values(ratings).every(r => r !== null);
}

/* Loading overlay */
function showLoadingOverlay(text) {
  let ov = document.getElementById('submissionOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'submissionOverlay';
    ov.className = 'overlay-backdrop';
    ov.innerHTML = `
      <div class="overlay-card">
        <div class="spinner" aria-hidden="true"></div>
        <div style="margin-top:12px;font-weight:700;color:#1f2937;">${escapeHtml(text || 'Submitting…')}</div>
      </div>
    `;
    document.body.appendChild(ov);
  } else {
    ov.querySelector('.overlay-card div:nth-child(2)').textContent = text || 'Submitting…';
    ov.style.display = 'flex';
  }
}
function hideLoadingOverlay() {
  const ov = document.getElementById('submissionOverlay');
  if (ov) ov.style.display = 'none';
}

/* Replace form with a thank-you panel in-place */
function showThankYouReplace(message) {
  const container = document.querySelector('.container');
  if (!container) {
    // fallback to modal
    showTemporaryError(message);
    return;
  }
  container.innerHTML = `
    <div style="text-align:center;padding:28px;">
      <img id="logoImage" alt="GHP Microfinance logo" class="logo" style="width:120px;margin:0 auto 12px;" />
      <h2 style="margin-top:6px;color:#1f2937;">Thank you for your feedback!</h2>
      <p style="color:#374151;margin-top:8px;">${escapeHtml(message)}</p>
      <div style="margin-top:18px;">
        <button id="thankYouCloseBtn" class="submit-btn" style="width:auto;padding:10px 18px;">Close</button>
      </div>
      <div style="margin-top:12px;color:#94a3b8;font-size:13px;">You can close this window or return to the home page.</div>
    </div>
  `;

  // Attempt to reload logo (logo.js will set it)
  try { if (window.LogoManager && typeof window.LogoManager.loadLogo === 'function') window.LogoManager.loadLogo(); } catch(e){}

  // Close button behavior: try to close window, otherwise redirect to index.html
  const closeBtn = document.getElementById('thankYouCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      try { window.close(); } catch (e) {}
      // If window.close didn't work, redirect to index.html
      setTimeout(function() {
        if (!window.closed) window.location.href = 'index.html';
      }, 200);
    });
  }
}

/* Temporary error display (in place of previous modal) */
function showTemporaryError(message) {
  const container = document.querySelector('.container');
  if (!container) return alert(message);
  // insert a small inline error banner above the form
  let err = document.getElementById('inlineErrorBanner');
  if (!err) {
    err = document.createElement('div');
    err.id = 'inlineErrorBanner';
    err.style.margin = '10px 0';
    err.style.padding = '10px';
    err.style.borderRadius = '8px';
    err.style.background = '#fee2e2';
    err.style.color = '#b91c1c';
    container.insertBefore(err, container.firstChild);
  }
  err.textContent = message;
  setTimeout(()=> { if (err) err.remove(); }, 7000);
}

/* Utility */
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
