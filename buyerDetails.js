// Initialize Firebase Auth
auth.onAuthStateChanged(user => {
  if (user) {
    const userId = user.uid;
    loadBuyerInfo(userId);
    loadOrders(userId);
    
    // Handle Add Order Form Submission
    const addOrderForm = document.getElementById('add-order-form');
    addOrderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addOrder(userId);
    });
  } else {
    // Redirect to login page or show a message
    window.location.href = 'index.html';
  }
});

// Function to load buyer information
function loadBuyerInfo(userId) {
  const userRef = db.collection('users').doc(userId);
  userRef.get().then(doc => {
    if (doc.exists) {
      const data = doc.data();
      document.getElementById('buyer-email').textContent = data.email;
      document.getElementById('buyer-contact').textContent = data.contact;
    }
  }).catch(error => {
    console.error("Error fetching user info:", error);
  });
}

// Function to load orders and pending orders
function loadOrders(userId) {
  const buyerId = new URLSearchParams(window.location.search).get('buyerId');
  const ordersRef = db.collection('users').doc(userId)
                     .collection('buyers').doc(buyerId)
                     .collection('orders');
  
  ordersRef.onSnapshot(snapshot => {
    let allOrders = [];
    let pendingOrders = [];
    let loadedOrders = [];
    
    snapshot.forEach(doc => {
      const order = { id: doc.id, ...doc.data() };
      allOrders.push(order);
      if (order.status === 'pending') {
        pendingOrders.push(order);
      } else if (order.status === 'loaded') {
        loadedOrders.push(order);
      }
    });
    
    document.getElementById('all-orders-count').textContent = allOrders.length;
    document.getElementById('pending-orders-count').textContent = pendingOrders.length;
    
    populateOrdersTable(allOrders);
  });
}

// Function to populate orders table
function populateOrdersTable(orders) {
  const tbody = document.querySelector('#orders-table-body');
  tbody.innerHTML = ''; // Clear existing rows
  
  orders.forEach(order => {
    const tr = document.createElement('tr');
    const statusClass = order.status === 'pending' ? 'text-yellow-500' : 'text-green-500';
    
    tr.innerHTML = `
      <td>${order.truckNumber}</td>
      <td>${order.product}</td>
      <td>${order.volume.toFixed(3)}</td>
      <td>${order.destination}</td>
      <td>${order.price.toFixed(3)}</td>
      <td>${(order.price * order.volume).toFixed(3)}</td>
      <td>${order.credit.toFixed(3)}</td>
      <td>${order.debitBalance.toFixed(3)}</td>
      <td class="${statusClass} font-bold">${order.status}</td>
      <td>
        ${order.status === 'pending' ? `
          <button onclick="updateOrderStatus('${order.id}', 'loaded')" 
                  class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2" 
                  title="Mark as Loaded">
            <i class="fas fa-check"></i>
          </button>
        ` : ''}
        <button onclick="editOrder('${order.id}')" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="deleteOrder('${order.id}')" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Function to add a new order
function addOrder(userId) {
  const buyerId = new URLSearchParams(window.location.search).get('buyerId');
  const truckNumber = document.getElementById('truck-number').value;
  const product = document.getElementById('product').value;
  const volume = parseFloat(document.getElementById('volume').value);
  const destination = document.getElementById('destination').value;
  const price = parseFloat(document.getElementById('price').value);
  
  const newOrder = {
    truckNumber,
    product,
    volume,
    destination,
    price,
    status: document.getElementById('status').value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  db.collection('users').doc(userId)
    .collection('buyers').doc(buyerId)
    .collection('orders').add(newOrder)
    .then(() => {
      alert('Order added successfully!');
      document.getElementById('add-order-form').reset();
    })
    .catch(error => {
      console.error("Error adding order:", error);
      alert('Failed to add order.');
    });
}

// Function to delete an order
async function deleteOrder(orderId) {
  const workId = prompt("Please enter your Work ID to confirm deletion:");
  if (!workId) return;

  const isAuthorized = await verifyUserWorkId(workId);
  if (!isAuthorized) {
    alert('Unauthorized: Invalid Work ID');
    return;
  }

  if (confirm('Are you sure you want to delete this order?')) {
    const user = firebase.auth().currentUser;
    const buyerId = new URLSearchParams(window.location.search).get('buyerId');
    if (user) {
      db.collection('users').doc(user.uid)
        .collection('buyers').doc(buyerId)
        .collection('orders').doc(orderId).delete()
        .then(() => {
          alert('Order deleted successfully!');
        })
        .catch(error => {
          console.error("Error deleting order:", error);
          alert('Failed to delete order.');
        });
    }
  }
}

// Add function to update order status
function updateOrderStatus(orderId, newStatus) {
  const user = auth.currentUser;
  const buyerId = new URLSearchParams(window.location.search).get('buyerId');
  if (!user) return;

  db.collection('users').doc(user.uid)
    .collection('buyers').doc(buyerId)
    .collection('orders').doc(orderId)
    .update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      alert('Order status updated successfully!');
    })
    .catch(error => {
      console.error("Error updating order status:", error);
      alert('Failed to update order status.');
    });
}

// Initialize page by fetching data
function initializePage(userId, companyId, buyerId) {
  fetchBuyerInfo(userId, buyerId);
  fetchOrdersCount(userId);  // Changed from companyId to userId
  fetchAndDisplayOrders(userId);  // Changed from companyId to userId
  setupFormHandler(userId);  // Changed from companyId to userId
  fetchCreditsAndBalance(userId, buyerId); // Add this line
}

let isAddCreditListenerAdded = false;

// Setup form handler
function setupFormHandler(userId) {
  elements.addOrderForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const buyerId = urlParams.get('buyerId');
    const price = Number(elements.addOrderForm.price.value);
    const volume = Number(elements.addOrderForm.volume.value);
    const total = parseFloat((price * volume).toFixed(3));
    const newOrder = {
      truckNumber: elements.addOrderForm.truckNumber.value,
      product: elements.addOrderForm.product.value,
      volume: volume,
      destination: elements.addOrderForm.destination.value,
      price: price,
      total: total,
      date: elements.addOrderForm.date.value,
      refno: elements.addOrderForm.refno.value,
      loCompany: elements.addOrderForm.loCompany.value,
      credit: Number(elements.addOrderForm.credit.value),
      debitBalance: Number(elements.addOrderForm.debitBalance.value),
      status: elements.addOrderForm.status.value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('users').doc(userId)
      .collection('buyers').doc(buyerId)
      .collection('orders')
      .add(newOrder)
      .then(() => {
        elements.addOrderForm.reset();
        elements.addOrderModal.style.display = "none";
        alert('Order added successfully!');
      })
      .catch(error => {
        console.error("Error adding order:", error);
        alert('Failed to add order.');
      });
  });

  // Remove or comment out the addCreditForm event listener here
  // if it's being added inside this function
  // elements.addCreditForm.addEventListener('submit', function(e) { ... });

  if (!isAddCreditListenerAdded) {
    elements.addCreditForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const buyerId = urlParams.get('buyerId');
        if (!firebase.auth().currentUser) return;

        const creditTransaction = {
            amount: Number(document.getElementById('credit-amount').value),
            date: document.getElementById('credit-date').value,
            bankName: document.getElementById('bank-name').value,
            reference: document.getElementById('credit-reference').value,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection('users').doc(firebase.auth().currentUser.uid)
            .collection('buyers').doc(buyerId)
            .collection('credits').add(creditTransaction)
            .then(() => {
                elements.addCreditForm.reset();
                elements.addCreditModal.style.display = "none";
                alert('Credit added successfully!');
            })
            .catch(error => {
                console.error("Error adding credit:", error);
                alert('Failed to add credit.');
            });
    });

    isAddCreditListenerAdded = true;
  }
}

// Edit order function
async function editOrder(orderId) {
  const workId = prompt("Please enter your Work ID to edit:");
  if (!workId) return;

  const isAuthorized = await verifyUserWorkId(workId);
  if (!isAuthorized) {
    alert('Unauthorized: Invalid Work ID');
    return;
  }

  const buyerId = urlParams.get('buyerId');
  if (!firebase.auth().currentUser) return;

  console.log('Editing order:', orderId); // Debug log

  db.collection('users').doc(firebase.auth().currentUser.uid)
      .collection('buyers').doc(buyerId)
      .collection('orders').doc(orderId)
      .get()
      .then(doc => {
          if (doc.exists) {
              console.log('Order data:', doc.data()); // Debug log
              const order = doc.data();
              
              // Set form values
              document.getElementById('edit-order-id').value = orderId;
              document.getElementById('edit-truck-number').value = order.truckNumber || '';
              document.getElementById('edit-product').value = order.product || '';
              document.getElementById('edit-volume').value = order.volume || 0;
              document.getElementById('edit-price').value = order.price || 0;
              document.getElementById('edit-destination').value = order.destination || '';
              document.getElementById('edit-status').value = order.status || 'pending';
              document.getElementById('edit-credit').value = order.credit || 0;
              document.getElementById('edit-debit-balance').value = order.debitBalance || 0;
              
              // Show modal
              elements.editOrderModal.style.display = "block";
          } else {
              console.log('No order found with ID:', orderId);
          }
      })
      .catch(error => {
          console.error("Error fetching order:", error);
          alert('Failed to load order details.');
      });
}

// Delete order function
async function deleteOrder(orderId) {
  const workId = prompt("Please enter your Work ID to confirm deletion:");
  if (!workId) return;

  const isAuthorized = await verifyUserWorkId(workId);
  if (!isAuthorized) {
    alert('Unauthorized: Invalid Work ID');
    return;
  }

  if (confirm('Are you sure you want to delete this order?')) {
      const user = firebase.auth().currentUser;
      const buyerId = urlParams.get('buyerId');
      if (!user) return;

      db.collection('users').doc(user.uid)
        .collection('buyers').doc(buyerId)
        .collection('orders').doc(orderId)
        .delete()
        .then(() => {
            alert('Order deleted successfully!');
        })
        .catch(error => {
            console.error("Error deleting order:", error);
            alert('Failed to delete order.');
        });
  }
}

// Modal functionality
elements.addOrderBtn.onclick = function() {
    elements.addOrderModal.style.display = "block";
}

elements.closeModalBtn.onclick = function() {
    elements.addOrderModal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == elements.addOrderModal) {
        elements.addOrderModal.style.display = "none";
    }
    if (event.target == elements.editOrderModal) {
        elements.editOrderModal.style.display = "none";
    }
    if (event.target == elements.addCreditModal) {
        elements.addCreditModal.style.display = "none";
    }
}

// Add credit modal functionality
elements.addCreditBtn.onclick = function() {
    elements.addCreditModal.style.display = "block";
}

elements.closeCreditBtn.onclick = function() {
    elements.addCreditModal.style.display = "none";
}

// Add credit form handler
// elements.addCreditForm.addEventListener('submit', function(e) {
//     e.preventDefault();
//     const buyerId = urlParams.get('buyerId');
//     if (!firebase.auth().currentUser) return;

//     const creditTransaction = {
//         amount: Number(document.getElementById('credit-amount').value),
//         date: document.getElementById('credit-date').value,
//         bankName: document.getElementById('bank-name').value,
//         reference: document.getElementById('credit-reference').value,
//         createdAt: firebase.firestore.FieldValue.serverTimestamp()
//     };

//     db.collection('users').doc(firebase.auth().currentUser.uid)
//         .collection('buyers').doc(buyerId)
//         .collection('credits').add(creditTransaction)
//         .then(() => {
//             elements.addCreditForm.reset();
//             elements.addCreditModal.style.display = "none";
//             alert('Credit added successfully!');
//         })
//         .catch(error => {
//             console.error("Error adding credit:", error);
//             alert('Failed to add credit.');
//         });
// });

// Function to fetch and display credits
function fetchCreditsAndBalance(userId, buyerId) {
    // Listen to credits collection
    db.collection('users').doc(userId)
        .collection('buyers').doc(buyerId)
        .collection('credits')
        .onSnapshot(snapshot => {
            let totalCredit = 0;
            elements.creditsTableBody.innerHTML = '';

            snapshot.forEach(doc => {
                const credit = doc.data();
                totalCredit += credit.amount;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${credit.date}</td>
                    <td>${credit.amount.toFixed(3)}</td>
                    <td>${credit.bankName}</td>
                    <td>${credit.reference}</td>
                    <td>
                        <button onclick="deleteCredit('${doc.id}')" class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                elements.creditsTableBody.appendChild(row);
            });

            // Calculate total debits (sum of all order debit balances)
            db.collection('users').doc(userId)
                .collection('buyers').doc(buyerId)
                .collection('orders')
                .get()
                .then(orderSnapshot => {
                    let totalDebit = 0;
                    orderSnapshot.forEach(doc => {
                        const order = doc.data();
                        totalDebit += order.debitBalance || 0;
                    });

                    // Update credit balance (credit - debit)
                    const balance = totalCredit - totalDebit;
                    elements.creditBalanceElem.textContent = balance.toFixed(3) + ' USD';
                });
        });
}

// Function to delete credit
async function deleteCredit(creditId) {
  const workId = prompt("Please enter your Work ID to delete credit:");
  if (!workId) return;

  const isAuthorized = await verifyUserWorkId(workId);
  if (!isAuthorized) {
    alert('Unauthorized: Invalid Work ID');
    return;
  }

  if (confirm('Are you sure you want to delete this credit transaction?')) {
    const user = firebase.auth().currentUser;
    const buyerId = urlParams.get('buyerId');
    if (!user) return;

    db.collection('users').doc(user.uid)
      .collection('buyers').doc(buyerId)
      .collection('credits').doc(creditId)
      .delete()
      .then(() => {
        alert('Credit transaction deleted successfully!');
      })
      .catch(error => {
        console.error("Error deleting credit:", error);
        alert('Failed to delete credit transaction.');
      });
  }
}

// Theme toggle functionality
const toggleTheme = document.getElementById('toggle-theme');
toggleTheme.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
});

// Particle.js configuration
particlesJS("particles-js", {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: "#4ade80" },
        shape: { type: "circle" },
        opacity: { value: 0.5, random: false, anim: { enable: false } },
        size: { value: 3, random: true, anim: { enable: false } },
        line_linked: { enable: true, distance: 150, color: "#4ade80", opacity: 0.4, width: 1 },
        move: { enable: true, speed: 2, direction: "none", random: false, straight: false, out_mode: "out", bounce: false }
    },
    interactivity: {
        detect_on: "canvas",
        events: { onhover: { enable: true, mode: "repulse" }, onclick: { enable: true, mode: "push" }, resize: true },
        modes: { repulse: { distance: 100, duration: 0.4 }, push: { particles_nb: 4 } }
    },
    retina_detect: true
});

// Generate PDF functionality
document.getElementById('generate-pdf-btn').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add Sarura logo
    const img = new Image();
    img.src = 'logo.jpg'; // Ensure the path is correct
    img.onload = function() {
        doc.addImage(img, 'JPEG', 10, 10, 50, 20);
        
        // Add company details
        doc.setFontSize(18);
        doc.text('Sarura Petroleum', 70, 20);
        
        // Add buyer details
        doc.setFontSize(12);
        doc.text('Buyer Company: ' + document.getElementById('buyer-company').textContent, 10, 40);
        doc.text('Email: ' + document.getElementById('buyer-email').textContent, 10, 50);
        doc.text('Phone: ' + document.getElementById('buyer-phone').textContent, 10, 60);
        doc.text('Contact Person: ' + document.getElementById('buyer-contact').textContent, 10, 70);
        doc.text('Credit Limit: ' + parseFloat(document.getElementById('buyer-credit').textContent).toFixed(3), 10, 80);
        doc.text('Payment Terms: ' + document.getElementById('buyer-terms').textContent, 10, 90);
        
        // Add Orders Table Header
        doc.text('Orders List', 10, 110);
        
        // Fetch orders data from the table
        const ordersTable = document.getElementById('orders-table-body');
        const rows = ordersTable.getElementsByTagName('tr');
        let yPosition = 120;
        
        for (let row of rows) {
            const cells = row.getElementsByTagName('td');
            doc.text(cells[0].textContent, 10, yPosition);
            doc.text(cells[1].textContent, 40, yPosition);
            doc.text(parseFloat(cells[2].textContent).toFixed(3), 80, yPosition);
            doc.text(cells[3].textContent, 110, yPosition);
            doc.text(parseFloat(cells[4].textContent).toFixed(3), 140, yPosition);
            doc.text(parseFloat(cells[5].textContent).toFixed(3), 170, yPosition);
            doc.text(parseFloat(cells[6].textContent).toFixed(3), 200, yPosition);
            doc.text(parseFloat(cells[7].textContent).toFixed(3), 230, yPosition);
            yPosition += 10;
            
            // Add a new page if yPosition exceeds the page height
            if (yPosition > 280) {
                doc.addPage();
                yPosition = 10;
            }
        }
        
        // Save the PDF
        doc.save('buyer_details.pdf');
    };
});

// Add event listeners after elements are defined
document.addEventListener('DOMContentLoaded', function() {
    // Edit form submit handler
    elements.editOrderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const workId = prompt("Please confirm your Work ID to save changes:");
        if (!workId) return;
    
        const isAuthorized = await verifyUserWorkId(workId);
        if (!isAuthorized) {
          alert('Unauthorized: Invalid Work ID');
          return;
        }

        const user = firebase.auth().currentUser;
        const buyerId = urlParams.get('buyerId');
        const orderId = document.getElementById('edit-order-id').value;

        if (!user) return;

        const updatedOrder = {
            truckNumber: document.getElementById('edit-truck-number').value,
            product: document.getElementById('edit-product').value,
            volume: Number(document.getElementById('edit-volume').value),
            price: Number(document.getElementById('edit-price').value),
            destination: document.getElementById('edit-destination').value,
            status: document.getElementById('edit-status').value,
            credit: Number(document.getElementById('edit-credit').value),
            debitBalance: Number(document.getElementById('edit-debit-balance').value),
            total: Number(document.getElementById('edit-volume').value) * 
                   Number(document.getElementById('edit-price').value),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Updating order with:', updatedOrder); // Debug log

        db.collection('users').doc(user.uid)
            .collection('buyers').doc(buyerId)
            .collection('orders').doc(orderId)
            .update(updatedOrder)
            .then(() => {
                elements.editOrderModal.style.display = "none";
                alert('Order updated successfully!');
            })
            .catch(error => {
                console.error("Error updating order:", error);
                alert('Failed to update order.');
            });
    });
});

// Attach the 'submit' event listener for 'addCreditForm' outside of any function,
// ensuring it's only added once when the script loads

elements.addCreditForm.addEventListener('submit', function(e) {
    e.preventDefault();

    // ...existing code to handle form submission...

    const buyerId = urlParams.get('buyerId');
    if (!firebase.auth().currentUser) return;

    const creditTransaction = {
        amount: Number(document.getElementById('credit-amount').value),
        date: document.getElementById('credit-date').value,
        bankName: document.getElementById('bank-name').value,
        reference: document.getElementById('credit-reference').value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection('users').doc(firebase.auth().currentUser.uid)
        .collection('buyers').doc(buyerId)
        .collection('credits').add(creditTransaction)
        .then(() => {
            elements.addCreditForm.reset();
            elements.addCreditModal.style.display = "none";
            alert('Credit added successfully!');
        })
        .catch(error => {
            console.error("Error adding credit:", error);
            alert('Failed to add credit.');
        });
});

// Add function to verify user's workID
async function verifyUserWorkId(inputWorkId) {
  const user = firebase.auth().currentUser;
  if (!user) return false;

  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) return false;
    
    const userData = userDoc.data();
    return userData.workId === inputWorkId;
  } catch (error) {
    console.error("Error verifying workID:", error);
    return false;
  }
}
