// Logo handling and QR code generation
document.addEventListener('DOMContentLoaded', function() {
    // Load logo from logo-data.js
    loadLogo();
    
    // Generate QR Code (optional - uncomment to enable)
    // generateQRCode();
});


function loadLogo() {
    const logoImage = document.getElementById('logoImage');

    // If no image element, nothing to do
    if (!logoImage) {
        console.warn('No #logoImage element found in DOM.');
        return;
    }

    // Validate LOGO_DATA exists and has base64
    if (window.LOGO_DATA && typeof window.LOGO_DATA.base64 === 'string' && window.LOGO_DATA.base64.length > 40) {
        const mime = window.LOGO_DATA.mimeType || 'image/png';
        const dataUri = `data:${mime};base64,${window.LOGO_DATA.base64}`;

        // Use onload/onerror to detect valid image
        const testImg = new Image();
        let settled = false;

        testImg.onload = function() {
            if (settled) return;
            settled = true;
            logoImage.src = dataUri;
            logoImage.style.display = ''; // ensure visible
        };

        testImg.onerror = function() {
            if (settled) return;
            settled = true;
            console.warn('Base64 logo failed to load or is invalid. Showing text-only logo fallback.');
            // Fallback: show text-only logo (no file fallback to avoid 404 spam)
            showTextLogo(logoImage);
        };

        // Trigger load attempt
        testImg.src = dataUri;
    } else {
        console.warn('Logo data not found or invalid. Showing text-only logo fallback.');
        showTextLogo(logoImage);
    }
}

function showTextLogo(imgElement) {
    // Hide the failed img element and replace with a text node so UI still shows branding
    imgElement.style.display = 'none';

    const parent = imgElement.parentNode;
    if (!parent) return;

    // Avoid adding multiple fallback spans
    if (parent.querySelector('.logo-text')) return;

    const span = document.createElement('div');
    span.className = 'logo-text';
    span.textContent = 'GHP Microfinance';
    span.setAttribute('aria-hidden', 'true');
    span.style.fontWeight = '700';
    span.style.fontSize = '18px';
    span.style.color = '#2d3748';
    span.style.textAlign = 'center';
    span.style.marginBottom = '8px';
    parent.insertBefore(span, imgElement);
}

/**
 * Generate QR code for the current page URL
 * Uses the free qrserver.com API
 */
function generateQRCode() {
    // Uncomment to enable QR code generation
    /*
    const qrContainer = document.getElementById('qrContainer');
    if (qrContainer) {
        const qrImage = document.createElement('img');
        const currentURL = window.location.href;
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentURL)}`;
        qrImage.style.width = '150px';
        qrImage.style.height = '150px';
        qrImage.alt = 'QR Code to this feedback form';
        qrContainer.innerHTML = '';
        qrContainer.appendChild(qrImage);
    }
    */
}

/**
 * Update logo dynamically
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} mimeType - MIME type of the image (optional)
 */
function updateLogo(base64Data, mimeType = 'image/png') {
    const logoImage = document.getElementById('logoImage');
    if (!logoImage) return;
    if (!base64Data || base64Data.length < 40) {
        console.warn('updateLogo called with invalid base64Data.');
        return;
    }
    logoImage.src = `data:${mimeType};base64,${base64Data}`;
}

// Export functions for use in other scripts
window.LogoManager = {
    loadLogo,
    generateQRCode,
    updateLogo
};
