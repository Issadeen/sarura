// Remove the authentication check from here
// document.addEventListener('DOMContentLoaded', function() {
//     auth.checkAuth();
// });

// This file is no longer needed if all authentication checks are handled in auth.js

// Add this script to all pages that need protection
document.addEventListener('DOMContentLoaded', function() {
    // Add logout handler to logout buttons
    const logoutButtons = document.querySelectorAll('#logoutButton');
    logoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            auth.logoutUser();
        });
    });
});
