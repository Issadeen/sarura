document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firestore and Auth
    const db = firebase.firestore();
    const auth = firebase.auth();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await fetchBuyersData(user);
        } else {
            // User not logged in, redirect to login page
            window.location.replace("index.html");
        }
    });
});

async function fetchBuyersData(user) {
    try {
        // Get buyers collection reference
        const buyersRef = db.collection('users').doc(user.uid).collection('buyers');
        const buyersSnapshot = await buyersRef.get();
        
        const buyersData = [];
        let index = 1;

        for (const doc of buyersSnapshot.docs) {
            const buyer = { id: doc.id, ...doc.data() };
            
            // Get orders from the buyer's 'orders' subcollection
            const ordersRef = db.collection('users').doc(user.uid)
                              .collection('buyers').doc(buyer.id)
                              .collection('orders');
            
            // Get all orders count
            const ordersSnapshot = await ordersRef.get();
            const totalOrders = ordersSnapshot.size;
            
            // Get pending orders count
            const pendingOrdersSnapshot = await ordersRef.where('status', '==', 'pending').get();
            const pendingOrders = pendingOrdersSnapshot.size;

            buyersData.push({
                index: index++,
                companyName: buyer.companyName,
                totalOrders,
                pendingOrders,
                id: buyer.id
            });
        }
        
        populateBuyersTable(buyersData);
    } catch (error) {
        console.error('Error fetching buyers data:', error);
        alert('Error loading buyers data. Please try refreshing the page.');
    }
}

function populateBuyersTable(buyers) {
    const tbody = document.getElementById('buyersTableBody');
    tbody.innerHTML = buyers.map(buyer => `
        <tr class="border-b border-gray-200 dark:border-gray-700">
            <td class="py-3 dark:text-gray-200">${buyer.index}</td>
            <td class="py-3 dark:text-gray-200">${buyer.companyName}</td>
            <td class="py-3 dark:text-gray-200">${buyer.totalOrders}</td>
            <td class="py-3 dark:text-gray-200">${buyer.pendingOrders}</td>
            <td class="py-3">
                <button onclick="viewBuyerDetails('${buyer.id}')" class="text-blue-500 hover:text-blue-700">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function viewBuyerDetails(buyerId) {
    // Navigate to the buyer's detail page
    window.location.href = `buyerDetails.html?buyerId=${buyerId}`;
}

function editBuyer(buyerId) {
    // Implement edit functionality
    console.log('Edit buyer:', buyerId);
}

function deleteBuyer(buyerId) {
    // Implement delete functionality
    console.log('Delete buyer:', buyerId);
}

// Removed Generate PDF functionality
