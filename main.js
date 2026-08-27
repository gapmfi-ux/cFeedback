// main.js — hidden-iframe form submit with modal response
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('feedbackForm');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Global listener for iframe postMessage responses
  window.addEventListener('message', function(ev) {
    // Only accept messages from your Apps Script origin
    let allowedOrigin = '';
    try {
      allowedOrigin = new URL(CONFIG.SCRIPT_URL).origin;
    } catch (err) {
      // fallback to script.google.com if CONFIG invalid
      allowedOrigin = 'https://script.google.com';
    }
    if (ev.origin !== allowedOrigin) {
      // ignore unrelated messages
      return;
    }

    const data = ev.data || {};
    if (data && typeof data === 'object') {
      // show modal with message
      if (data.success) {
        showModal('Success', data.message || 'Feedback submitted successfully.');
        // reset form
        const f = document.getElementById('feedbackForm');
        if (f) f.reset();
      } else {
        showModal('Error', data.error || 'Submission failed.');
      }

      // cleanup temporary elements if present
      removeTempSubmissionElements();
      // re-enable submit button if it exists
      const submitBtn = document.getElementById('submitBtn');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }
    }
  });
});

async function handleFormSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitBtn');

  // Validate ratings
  const ratings = getRatings();
  if (!validateRatings(ratings)) {
    showModal('Error', CONFIG.MESSAGES.error.incomplete);
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

  // Build hidden iframe (name MUST match form target)
  const iframeId = 'submission_iframe';
  // remove previous if present
  const prevI = document.getElementById(iframeId);
  if (prevI) prevI.remove();

  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = iframeId;
  iframe.name = iframeId; // critical: target uses window name
  document.body.appendChild(iframe);

  // Build hidden form targeting the iframe
  const formId = 'submission_form';
  let tempForm = document.getElementById(formId);
  if (tempForm) tempForm.remove();
  tempForm = document.createElement('form');
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

  // Disable UI while submitting
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  // Submit and wait for postMessage (Apps Script will postMessage back)
  try {
    tempForm.submit();

    // fallback timeout in case no message arrives
    const TIMEOUT_MS = 12000;
    setTimeout(() => {
      // if still present, cleanup and show timeout
      // note: message handler also calls removeTempSubmissionElements()
      if (document.getElementById(formId) || document.getElementById(iframeId)) {
        removeTempSubmissionElements();
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }
        showModal('Error', 'Submission timed out. Please try again.');
      }
    }, TIMEOUT_MS);

  } catch (err) {
    console.error('Submission error', err);
    removeTempSubmissionElements();
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Feedback'; }
    showModal('Error', CONFIG.MESSAGES.error.submission);
  }
}

function removeTempSubmissionElements() {
  const iframe = document.getElementById('submission_iframe');
  if (iframe) iframe.remove();
  const tempForm = document.getElementById('submission_form');
  if (tempForm) tempForm.remove();
}

/* Ratings helper functions (unchanged) */
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

/* Modal display helpers */
function showModal(title, message) {
  let backdrop = document.getElementById('submissionModal');
  if (!backdrop) {
    // fallback: use messageContainer if modal missing
    const mc = document.getElementById('messageContainer');
    if (mc) mc.innerHTML = `<div class="success-message">${message}</div>`;
    return;
  }
  const titleEl = document.getElementById('submissionModalTitle');
  const msgEl = document.getElementById('submissionModalMessage');
  if (titleEl) titleEl.textContent = title || '';
  if (msgEl) msgEl.innerHTML = `<div style="white-space:pre-wrap;">${escapeHtml(message)}</div>`;
  backdrop.style.display = 'flex';
}

/* Modal close hookup (close button exists in HTML) */
document.addEventListener('click', function (ev) {
  if (ev.target && ev.target.id === 'submissionModalClose') {
    const backdrop = document.getElementById('submissionModal');
    if (backdrop) backdrop.style.display = 'none';
  }
});

/* Utility */
function escapeHtml(s) {
  if (!s && s !== 0) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
