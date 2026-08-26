// Main application logic
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('feedbackForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
});

async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');

    // Validate all ratings are selected
    const ratings = getRatings();
    if (!validateRatings(ratings)) {
        showMessage('error', CONFIG.MESSAGES.error.incomplete);
        return;
    }

    // Collect form data
    const formData = {
        overallSatisfaction: parseInt(ratings.overallSatisfaction.value),
        qualityOfService: parseInt(ratings.qualityOfService.value),
        timeliness: parseInt(ratings.timeliness.value),
        staffFriendliness: parseInt(ratings.staffFriendliness.value),
        additionalComments: (document.getElementById('additionalComments') || {}).value || '',
        name: (document.getElementById('name') || {}).value || '',
        phone: (document.getElementById('phone') || {}).value.trim() || ''
    };

    // Optional: basic phone normalization (strip spaces)
    formData.phone = formData.phone.replace(/\s+/g, ' ');

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
        const result = await submitFeedback(formData);

        if (result && result.success) {
            showMessage('success', CONFIG.MESSAGES.success);
            document.getElementById('feedbackForm').reset();
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

async function submitFeedback(formData) {
    const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
    });

    // handle non-JSON gracefully
    try {
        return await response.json();
    } catch (err) {
        return { success: false, error: 'Invalid JSON response from server' };
    }
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

window.FeedbackForm = {
    handleFormSubmit,
    getRatings,
    validateRatings,
    submitFeedback,
    showMessage
};
