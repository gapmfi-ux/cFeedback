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
        additionalComments: document.getElementById('additionalComments').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value
    };
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    
    try {
        const result = await submitFeedback(formData);
        
        if (result.success) {
            showMessage('success', CONFIG.MESSAGES.success);
            form.reset();
        } else {
            throw new Error(result.error || 'Submission failed');
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
 * Submit feedback to the backend
 * @param {Object} formData - Form data to submit
 * @returns {Promise} - Response from the server
 */
async function submitFeedback(formData) {
    const response = await fetch(CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
    });
    
    return await response.json();
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
