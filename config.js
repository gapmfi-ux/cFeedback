// Configuration file for the feedback form
const CONFIG = {
    // Google Apps Script Web App URL
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzJ1tOsTZ23rLudil3pLqBBlIR2KCyEUfU2VU6dWJQXJ2vnZgio3ck2dz3c26YpxFPdaQ/exec',
    
    // Rating labels
    RATING_LABELS: {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent'
    },
    
    // Form fields
    FORM_FIELDS: {
        ratings: [
            'overallSatisfaction',
            'qualityOfService',
            'timeliness',
            'staffFriendliness'
        ],
        textFields: [
            'additionalComments',
            'name',
            'email'
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
