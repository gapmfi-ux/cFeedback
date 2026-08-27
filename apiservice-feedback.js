// api-feedback.js
if (!window.API) {
  throw new Error('API core must be loaded before api-feedback.js');
}


// Feedback API convenience wrappers
API.processForm = async function(formData = {}, options = {}) {
  // Wrap or normalize formData if needed:
  // The server accepts either data.formData or top-level fields depending on implementation.
  // We send { formData: {...} } to follow server's JSONP handler convention.
  return this.request('processForm', { formData: formData }, options);
};

API.listFeedbacks = async function(options = {}) {
  // returns { success: true, rows: [...] } or similar depending on server
  return this.request('list', {}, options);
};

API.checkSubmission = async function(submissionId, options = {}) {
  return this.request('checkSubmission', { submissionId: submissionId }, options);
};
