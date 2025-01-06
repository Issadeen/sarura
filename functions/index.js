
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

admin.initializeApp();

// Replace with your secret key
const RECAPTCHA_SECRET_KEY = 'YOUR_SECRET_KEY';

exports.verifyRecaptcha = functions.https.onCall(async (data, context) => {
    const token = data.token;

    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: 'POST',
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const recaptchaValidation = await response.json();
    return recaptchaValidation;
});