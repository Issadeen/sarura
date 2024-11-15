// Initialize Firebase with error handling
if (!firebase.apps.length) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Firebase initialization error:', error);
    }
}

// Create and append modal HTML to body
function createModal() {
    const modalHTML = `
        <div id="inactivityModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center">
            <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
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
            modal.classList.remove('hidden');
            startCountdown();
        }
    }

    function hideWarning() {
        if (modal) {
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

    // Corrected auth state listener
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path.endsWith('index.html');

    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            if (isLoginPage) {
                // Redirect authenticated user from login page to dashboard
                window.location.href = "dashboard.html";
            } else {
                // User is authenticated and on a protected page; no action needed
                // Optionally, you can load user-specific data here
            }
        } else {
            if (!isLoginPage) {
                // Redirect unauthenticated user from protected page to login
                window.location.href = "index.html";
            }
            // No action needed if user is unauthenticated and on the login page
        }
    });
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

// Remove duplicate onAuthStateChanged listeners and simplify the listener
firebase.auth().onAuthStateChanged(function(user) {
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path.endsWith('index.html');

    if (user) {
        if (isLoginPage) {
            // Redirect authenticated user from login page to dashboard
            window.location.replace("dashboard.html");
        }
        // User is authenticated and on a protected page; no action needed
    } else {
        if (!isLoginPage) {
            // Redirect unauthenticated user from protected page to login
            window.location.replace("index.html");
        }
        // User is unauthenticated and on the login page; no action needed
    }
});

// Function to customize the dashboard based on role
function customizeDashboard(role) {
    if (role === 'admin') {
        // Display admin-specific elements
        document.getElementById('adminDashboard').style.display = 'block';
    } else if (role === 'user') {
        // Display user-specific elements
        document.getElementById('userDashboard').style.display = 'block';
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

// Update loginUser function to set persistence before signing in
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
        console.log('Login successful');

        // No need to manually handle tokens with SESSION persistence

        // Redirect to dashboard
        window.location.replace("dashboard.html");
        return true;
    } catch (error) {
        console.error('Login error:', error.code, error.message);
        throw error;
    } finally {
        loginInProgress = false;
    }
}

// Simplify the auth state listener
firebase.auth().onAuthStateChanged(async function(user) {
    const path = window.location.pathname;
    const isLoginPage = path === '/' || path.endsWith('index.html');

    if (!user && !isLoginPage) {
        // Only redirect if not on login page and no user
        window.location.href = "index.html";
    }
});

async function logoutUser() {
    try {
        await firebase.auth().signOut();
        // Don't redirect here, let the auth state listener handle it
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
}

// Export functions for use in other files
window.auth = {
    isLoggedIn,
    loginUser,
    logoutUser
};
