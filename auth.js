// Add allowed roles constant at the top level
const ALLOWED_ROLES = ['admin', 'sarura'];

// Create and append modal HTML to body
function createModal() {
    const modalHTML = `
        <div id="inactivityModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50" style="display: none;">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl relative">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Session Timeout Warning</h3>
                    <button class="close-modal text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <p>Your session will expire soon due to inactivity.</p>
                <p class="mt-2">Click anywhere or move your mouse to stay logged in.</p>
                <div class="mt-4 flex justify-end">
                    <button class="stay-active bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        Stay Active
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

document.addEventListener('DOMContentLoaded', (event) => {
    // Create modal if we're not on the login page
    if (!window.location.href.includes('index.html')) {
        createModal();
    }

    // Get the modal and close button after creation
    const modal = document.getElementById("inactivityModal");
    const closeBtn = modal?.querySelector('.close-modal');
    const stayActiveBtn = modal?.querySelector('.stay-active');

    // Set timeout for inactivity
    let timeout;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes
    let countdown;
    const WARNING_TIME = 2 * 60 * 1000; // 2 minutes
    let countdownTime = WARNING_TIME;

    function startTimer() {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(function() {
            showWarning();
        }, INACTIVITY_LIMIT);
    }

    function resetTimer() {
        clearTimeout(timeout);
        countdownTime = WARNING_TIME;
        hideWarning();
        startTimer();
        clearInterval(countdown);
    }

    function showWarning() {
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            startCountdown();
        }
    }

    function hideWarning() {
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    }

    function startCountdown() {
        countdown = setInterval(() => {
            countdownTime -= 1000;
            if (countdownTime <= 0) {
                clearInterval(countdown);
                signOutUser();
            }
        }, 1000);
    }

    // Only add event listeners if we're not on the login page
    if (!window.location.href.includes('index.html')) {
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;

        // Modal event listeners
        closeBtn?.addEventListener('click', hideWarning);
        stayActiveBtn?.addEventListener('click', resetTimer);
        modal?.addEventListener('click', (event) => {
            if (event.target === modal) {
                hideWarning();
            }
        });
    }

    // Corrected auth state listener with enhanced role verification
    firebase.auth().onAuthStateChanged(async function(user) {
        const path = window.location.pathname;
        const isLoginPage = path === '/' || path.endsWith('index.html');

        if (user) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get(); // Use the globally available 'db'

                const userRole = userDoc.data()?.role;

                if (!ALLOWED_ROLES.includes(userRole)) {
                    console.log('Unauthorized role:', userRole);
                    await signOutUser();
                    return;
                }

                if (isLoginPage) {
                    window.location.replace("dashboard.html");
                }

                // If on a protected page, ensure the loading overlay is hidden
                const loadingOverlay = document.getElementById('loadingOverlay');
                if (loadingOverlay) {
                    loadingOverlay.style.display = 'none';
                }
            } catch (error) {
                console.error('Role verification error:', error);
                await signOutUser();
            }
        } else {
            if (!isLoginPage) {
                window.location.replace("index.html");
            }

            // If on a protected page and user is not logged in, ensure the loading overlay is hidden
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            // No action needed if user is unauthenticated and on the login page
        }
    });
    
    // Remove duplicate onAuthStateChanged listeners and streamline the listener
    // **Removed the second onAuthStateChanged listener to prevent conflicts**
});

// Example authentication listener
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // User is signed in.
        // ...existing code...
    } else {
        // No user is signed in.
        // ...existing code...
    }
});

// Helper function to update UI
function updateUI(userData) {
    const { name, role, logoUrl } = userData;
    const userNameEl = document.getElementById('userName');
    const userLogoEl = document.getElementById('userLogo');
    
    if (userNameEl) userNameEl.textContent = name || 'User';
    if (userLogoEl) userLogoEl.src = logoUrl || 'logo.jpg';
    if (typeof customizeDashboard === 'function') {
        customizeDashboard(role);
    }
}

// Function to sign out the user
async function signOutUser() {
    try {
        // Clear all local storage and session data
        localStorage.clear();
        sessionStorage.clear();
        
        // Sign out from Firebase
        await firebase.auth().signOut();
        
        // Force clear any cached auth state
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
        
        // Redirect to login page and prevent back navigation
        window.location.replace('index.html');
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect even if there's an error
        window.location.replace('index.html');
    }
}

// Function to customize the dashboard based on role
function customizeDashboard(role) {
    if (role === 'admin') {
        // Display admin-specific elements
        document.getElementById('adminDashboard').style.display = 'block';
    } else if (role === 'sarura') { // Changed from 'user' to 'sarura'
        // Display sarura-specific elements
        document.getElementById('saruraDashboard').style.display = 'block';
    } else {
        // Default or viewer role elements
        document.getElementById('viewerDashboard').style.display = 'block';
    }
}

// Authentication helper functions
function isLoggedIn() {
    return firebase.auth().currentUser !== null;
}

// Add a flag to track login in progress
let loginInProgress = false;

// Update loginUser function to set persistence before signing in and improve error handling
async function loginUser(email, password) {
    if (loginInProgress) {
        console.log('Login already in progress');
        return;
    }

    try {
        loginInProgress = true;
        console.log('Attempting login for:', email);

        // Set auth persistence to SESSION before sign-in
        await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

        const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
        
        // Get user role from Firestore
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get(); // Use 'db' instead of 'firebase.firestore()'

        if (!userDoc.exists) {
            throw new Error('User data not found in Firestore.');
        }

        const userRole = userDoc.data()?.role;

        if (!ALLOWED_ROLES.includes(userRole)) {
            console.log('Unauthorized role:', userRole);
            await firebase.auth().signOut();
            throw new Error('Unauthorized access. Only admin and sarura roles are allowed.');
        }

        console.log('Login successful');
        window.location.replace("dashboard.html");
        return true;
    } catch (error) {
        console.error('Login error:', error.code, error.message);
        // Map Firebase Auth error codes to user-friendly messages
        switch(error.code) {
            case 'auth/invalid-email':
                throw new Error('The email address is not valid.');
            case 'auth/user-disabled':
                throw new Error('This user has been disabled.');
            case 'auth/user-not-found':
                throw new Error('No user found with this email.');
            case 'auth/wrong-password':
                throw new Error('Incorrect password.');
            default:
                throw new Error(error.message || 'An unexpected error occurred. Please try again.');
        }
    } finally {
        loginInProgress = false;
    }
}

// Add a simple in-memory store for rate limiting (note: this will reset if the page is refreshed)
const resetRequestTimestamps = {};

async function sendPasswordReset(email, workID) {
    try {
        // Verify email and Work ID against Firestore
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', email).where('workID', '==', workID).get();

        if (querySnapshot.empty) {
            throw new Error('No matching user found.');
        }

        // Send password reset email
        await firebase.auth().sendPasswordResetEmail(email);
        console.log('Password reset email sent to:', email);

    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
}

window.auth = {
    loginUser,
    sendPasswordReset,
    // Add other functions if needed in the future
};

// Simplify the auth state listener by removing duplicates
// **This listener is now handled within DOMContentLoaded**

// Ensure only one onAuthStateChanged listener is used
firebase.auth().onAuthStateChanged(async function(user) {
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path.endsWith('index.html');

    if (user) {
        try {
            const userDocRef = db.collection('users').doc(user.uid);
            const userDoc = await userDocRef.get();

            if (userDoc.exists) {
                const userRole = userDoc.data().role;

                if (!ALLOWED_ROLES.includes(userRole)) {
                    console.log('Unauthorized role:', userRole);
                    await signOutUser();
                    return;
                }
            } else {
                console.error('User document does not exist.');
                // Handle the case where the user document is missing
                // For example, you might choose to sign out the user:
                // await signOutUser();
                // return;
            }

            if (isLoginPage) {
                window.location.replace("dashboard.html");
            }

            // Hide loading overlay if present
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Role verification error:', error);
            // Decide how to handle errors during role verification
            // You might choose not to sign out the user here
            // await signOutUser();
            // return;
        }
    } else {
        if (!isLoginPage) {
            window.location.replace("index.html");
        }

        // Hide loading overlay if present
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
});

// Remove any duplicate onAuthStateChanged listeners
// ...remove or comment out other firebase.auth().onAuthStateChanged calls...

// ...existing code...
