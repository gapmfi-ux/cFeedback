// main.js — caller using FeedbackAPI.processForm(formData)
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('feedbackForm');
  if (form) form.addEventListener('submit', handleFormSubmit);
});

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');

  // Validate ratings
  const ratings = getRatings();
  if (!validateRatings(ratings)) {
    showInlineError('Please rate all categories before submitting.');
    return;
  }

  // Gather form data
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

  // Show loading
  showLoadingOverlay('Submitting your feedback…');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting...'; }

  try {
    // NOTE: use FeedbackAPI instead of API
    const res = await FeedbackAPI.processForm(formData, { timeout: 20000 });
    hideLoadingOverlay();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }

    if (res && res.success) {
      showThankYouReplace(res.message || 'Thank you — your feedback has been received.');
    } else {
      showInlineError((res && res.error) ? res.error : 'Submission failed. Please try again.');
    }
  } catch (err) {
    hideLoadingOverlay();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }
    showInlineError('Submission failed: ' + (err && err.message ? err.message : 'unknown error'));
    console.error('processForm error', err);
  }
}

/* Helpers */

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
function showThankYouReplace(message) {
  const container = document.querySelector('.container');
  if (!container) return alert(message);
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
  try { if (window.LogoManager && typeof window.LogoManager.loadLogo === 'function') window.LogoManager.loadLogo(); } catch(e){}
  const closeBtn = document.getElementById('thankYouCloseBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      try { window.close(); } catch (e) {}
      setTimeout(function() { if (!window.closed) window.location.href = 'index.html'; }, 200);
    });
  }
}
function showInlineError(message) {
  const container = document.querySelector('.container');
  if (!container) return alert(message);
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
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
