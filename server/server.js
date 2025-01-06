const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
app.use(cors({
    origin: 'https://sarurapetroleumltd.com',
    optionsSuccessStatus: 200
}));

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Verification endpoint
app.get('/api/verify/:docId', async (req, res) => {
    try {
        const docId = req.params.docId;
        
        // Validate document ID format (SP-TYPE-NUMBER)
        const docIdPattern = /^SP-(PFI|INV|DN)-(.+)$/;
        const match = docId.match(docIdPattern);
        
        if (!match) {
            return res.status(400).json({
                isValid: false,
                error: 'Invalid document ID format'
            });
        }

        const [_, type, number] = match;
        const collection = getCollectionName(type);
        
        // Search for document in Firebase
        const snapshot = await db.collectionGroup(collection)
            .where(getNumberField(type), '==', number)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({
                isValid: false,
                error: 'Document not found'
            });
        }

        const doc = snapshot.docs[0].data();
        
        // Return verification response
        res.json({
            isValid: true,
            type: type,
            documentNumber: doc[getNumberField(type)],
            issuedOn: doc.created_at,
            verifiedAt: new Date().toISOString(),
            customerName: getCustomerName(doc, type),
            verificationId: docId
        });

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            isValid: false,
            error: 'Internal server error'
        });
    }
});

function getCollectionName(type) {
    const collections = {
        'PFI': 'proformaInvoices',
        'INV': 'invoices',
        'DN': 'deliveryNotes'
    };
    return collections[type] || 'unknown';
}

function getNumberField(type) {
    const fields = {
        'PFI': 'pfiNumber',
        'INV': 'invoice_number',
        'DN': 'delivery_number'
    };
    return fields[type] || 'unknown';
}

function getCustomerName(doc, type) {
    switch(type) {
        case 'PFI':
            return doc.billTo || 'N/A';
        case 'INV':
            return doc.customer_name || 'N/A';
        case 'DN':
            return doc.receiver_name || 'N/A';
        default:
            return 'N/A';
    }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Verification server running on port ${PORT}`);
});
