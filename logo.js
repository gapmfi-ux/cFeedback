// Logo handling and QR code generation
document.addEventListener('DOMContentLoaded', function() {
    // Load logo from logo-data.js
    loadLogo();
    
    // Generate QR Code (optional - uncomment to enable)
    generateQRCode();
});

/**
 * Load the logo image from Base64 data
 */
function loadLogo() {
    const logoImage = document.getElementById('logoImage');
    if (logoImage && window.LOGO_DATA) {
        // Set the image source using Base64 data
        logoImage.src = `data:${LOGO_DATA.mimeType};base64,${LOGO_DATA.base64}`;
        
        // Handle image load error - fallback to file path if available
        logoImage.addEventListener('error', function() {
            console.warn('Base64 logo failed to load, trying file path...');
            if (LOGO_DATA.filePath) {
                this.src = LOGO_DATA.filePath;
            }
            
            // If still failing, hide and show text-only
            this.addEventListener('error', function() {
                this.style.display = 'none';
                console.warn('Logo image failed to load. Please check the image data.');
            });
        });
    } else {
        console.warn('Logo data not found. Please ensure logo-data.js is loaded.');
    }
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
function updateLogo(base64Data, mimeType = 'image/jpeg') {
    const logoImage = document.getElementById('logoImage');
    if (logoImage) {
        logoImage.src = `data:${mimeType};base64,${base64Data}`;
    }
}

// Export functions for use in other scripts
window.LogoManager = {
    loadLogo,
    generateQRCode,
    updateLogo
};
