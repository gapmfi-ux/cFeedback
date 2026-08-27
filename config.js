// Configuration file for the feedback form 
const CONFIG = {
    // Google Apps Script Web App URL
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzJ1tOsTZ23rLudil3pLqBBlIR2KCyEUfU2VU6dWJQXJ2vnZgio3ck2dz3c26YpxFPdaQ/exec',
    
    // Rating labels
    RATING_LABELS: {
        1: 'Poor / Not at all',
        2: 'Fair / Unlikely',
        3: 'Good / Neutral',
        4: 'Very Good / Likely',
        5: 'Excellent / Extremely likely'
    },
    
    // Form fields
    FORM_FIELDS: {
        ratings: [
            'overallSatisfaction',
            'qualityOfService',
            'timeliness',
            'staffFriendliness',
            'speedOfService',
            'recommend'
        ],
        textFields: [
            'additionalComments',
            'name',
            'phone'
        ]
    },
    
    // Messages
    MESSAGES: {
        error: {
            incomplete: 'Please rate all categories before submitting.',
            submission: 'Sorry, there was an error submitting your feedback. Please try again.'
        },
        success: 'Thank you! Your feedback has been submitted successfully.'
    }
};

// Make CONFIG globally available
window.CONFIG = CONFIG;
