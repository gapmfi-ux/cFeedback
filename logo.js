// Logo handling and QR code generation
document.addEventListener('DOMContentLoaded', function() {
    // Handle logo image fallback
    const logoImage = document.getElementById('logoImage');
    if (logoImage) {
        logoImage.addEventListener('error', function() {
            // If image fails to load, hide it and show text-only
            this.style.display = 'none';
        });
    }
    
    // Generate QR Code (optional - uncomment to enable)
    generateQRCode();
});

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
 * Update logo dynamically (if needed)
 * @param {string} imageUrl - URL of the logo image
 */
function updateLogo(imageUrl) {
    const logoImage = document.getElementById('logoImage');
    if (logoImage) {
        logoImage.src = imageUrl;
    }
}

// Export functions for use in other scripts
window.LogoManager = {
    generateQRCode,
    updateLogo
};
