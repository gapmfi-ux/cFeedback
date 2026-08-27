// main.js — hidden-iframe form submit (avoids CORS preflight)
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('feedbackForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Listen to messages from iframe (Apps Script response)
    window.addEventListener('message', function(ev) {
        // Optional: restrict origin to script.google.com or exact web app origin
        // const SCRIPT_ORIGIN = 'https://script.google.com';
        // if (ev.origin !== SCRIPT_ORIGIN) return;

        const data = ev.data || {};
        if (data && typeof data === 'object') {
            if (data.success) {
                showMessage('success', data.message || 'Feedback submitted successfully.');
                // reset form
                const f = document.getElementById('feedbackForm');
                if (f) f.reset();
            } else {
                showMessage('error', data.error || 'Submission failed.');
            }
        }
    });
});

/**
 * Handle form submission by building a hidden form and posting to the Apps Script URL inside a hidden iframe.
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');

    // Validate ratings
    const ratings = getRatings();
    if (!validateRatings(ratings)) {
        showMessage('error', CONFIG.MESSAGES.error.incomplete);
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

    // Prepare hidden iframe
    const iframeId = 'submission_iframe';
    let iframe = document.getElementById(iframeId);
    if (iframe) iframe.remove(); // remove old
    iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.id = iframeId;
    document.body.appendChild(iframe);

    // Build a temporary form targeting the iframe
    const tempForm = document.createElement('form');
    tempForm.style.display = 'none';
    tempForm.method = 'POST';
    tempForm.action = CONFIG.SCRIPT_URL; // must be exact web app URL
    tempForm.target = iframeId;

    // Helper to add inputs
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
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    // Submit the form (the iframe will load the Apps Script HTML, which will postMessage back)
    try {
        tempForm.submit();

        // Set a timeout in case postMessage never comes back
        const TIMEOUT_MS = 10000;
        let resolved = false;
        const timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Feedback';
            showMessage('error', 'Submission timed out. Please try again.');
            // cleanup
            tempForm.remove();
            // keep iframe for possible later messages, or remove it
            iframe.remove();
        }, TIMEOUT_MS);

        // We rely on the window 'message' listener to show success/error when iframe posts back.
        // When a message arrives (see above listener), it will reset the form and show messages.
        // Here we just wait; the listener handles UI update.
        // To ensure cleanup after a message, the message listener could remove the iframe/form.
        const messageHandler = function(ev) {
            // Accept the message (no strict origin check here; optional to check ev.origin)
            const data = ev.data || {};
            if (data && typeof data === 'object') {
                clearTimeout(timeoutId);
                resolved = true;
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Feedback';
                // cleanup
                tempForm.remove();
                try { iframe.remove(); } catch(e){}
                // remove this handler (we used a global listener earlier; we can keep it)
                // window.removeEventListener('message', messageHandler);
            }
        };
        // add a one-time listener too (in addition to global) to ensure cleanup
        window.addEventListener('message', messageHandler, { once: true });

    } catch (err) {
        console.error('Submission error', err);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
        showMessage('error', CONFIG.MESSAGES.error.submission);
    }
}

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

function showMessage(type, message) {
    const messageContainer = document.getElementById('messageContainer');
    const className = type === 'success' ? 'success-message' : 'error-message';
    const icon = type === 'success' ? '✅' : '❌';
    messageContainer.innerHTML = `<div class="${className}">${icon} ${message}</div>`;
    if (type === 'success') {
        setTimeout(() => { messageContainer.innerHTML = ''; }, 5000);
    }
}
