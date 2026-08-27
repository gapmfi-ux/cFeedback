// Main application logic
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('feedbackForm');
    const submitBtn = document.getElementById('submitBtn');
    const messageContainer = document.getElementById('messageContainer');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
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
        // NOTE: use phone (your form.html has phone field). If your form uses 'email', change this key to email.
        phone: (document.getElementById('phone') || {}).value || '',
        // optional client id to help server-side de-dupe
        _submissionId: 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8)
    };
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const result = await submitFeedback(formData);
        
        if (result && result.success) {
            showMessage('success', CONFIG.MESSAGES.success);
            if (form) form.reset();
        } else {
            throw new Error(result && result.error ? result.error : 'Submission failed');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('error', CONFIG.MESSAGES.error.submission);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
    }
}

/**
 * Get all rating values from the form
 * @returns {Object} - Object containing selected rating inputs
 */
function getRatings() {
    return {
        overallSatisfaction: document.querySelector('input[name="overallSatisfaction"]:checked'),
        qualityOfService: document.querySelector('input[name="qualityOfService"]:checked'),
        timeliness: document.querySelector('input[name="timeliness"]:checked'),
        staffFriendliness: document.querySelector('input[name="staffFriendliness"]:checked')
    };
}

/**
 * Validate that all ratings are selected
 * @param {Object} ratings - Rating objects
 * @returns {boolean} - True if all ratings are selected
 */
function validateRatings(ratings) {
    return Object.values(ratings).every(r => r !== null);
}

/**
 * Submit feedback to the backend (form-encoded to avoid CORS preflight)
 * @param {Object} data - Form data to submit
 * @returns {Promise<Object>} - Parsed JSON response from the server
 */
async function submitFeedback(data) {
    // Build form-encoded payload. We include an "action" param the Apps Script expects.
    const payload = new URLSearchParams();
    payload.append('action', 'processForm');

    // Add nested fields as top-level params. Apps Script will read them via e.parameter.
    Object.keys(data).forEach(k => {
        const v = data[k];
        if (v === null || v === undefined) return;
        // If the value is an object (unlikely here), stringify it
        if (typeof v === 'object') {
            payload.append(k, JSON.stringify(v));
        } else {
            payload.append(k, String(v));
        }
    });

    // Use AbortController for a simple timeout
    const controller = new AbortController();
    const timeoutMs = 20000; // 20s
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            mode: 'cors',
            credentials: 'omit',
            headers: {
                // application/x-www-form-urlencoded is a "simple" content-type (no preflight)
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
 * Show a message to the user
 * @param {string} type - 'success' or 'error'
 * @param {string} message - Message to display
 */
function showMessage(type, message) {
    const messageContainer = document.getElementById('messageContainer');
    const className = type === 'success' ? 'success-message' : 'error-message';
    const icon = type === 'success' ? '✅' : '❌';
    
    messageContainer.innerHTML = `
        <div class="${className}">
            ${icon} ${message}
        </div>
    `;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            messageContainer.innerHTML = '';
        }, 5000);
    }
}

// Export functions for testing or external use
window.FeedbackForm = {
    handleFormSubmit,
    getRatings,
    validateRatings,
    submitFeedback,
    showMessage
};
