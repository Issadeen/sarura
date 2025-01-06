// ...existing code...

document.getElementById('newBuyerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const companyName = e.target.companyName.value;
    const contactPerson = e.target.contactPerson.value;
    const email = e.target.email.value;
    const phone = e.target.phone.value;
    const address = e.target.address.value;
    const paymentTerms = e.target.paymentTerms.value;
    const creditLimit = Number(e.target.creditLimit.value);
    const notes = e.target.notes.value;

    const user = firebase.auth().currentUser;
    if (!user) {
        alert('User not authenticated');
        return;
    }

    try {
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('buyers')
            .add({
                companyName,
                contactPerson,
                email,
                phone,
                address,
                paymentTerms,
                creditLimit,
                notes,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        alert('Buyer created successfully');
        e.target.reset();
    } catch (error) {
        console.error('Error adding buyer:', error);
        alert('Failed to create buyer');
    }
});

// ...existing code...