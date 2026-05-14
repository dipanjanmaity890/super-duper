// backend/src/config/firebaseAdmin.js
// Initializes Firebase Admin SDK using GOOGLE_APPLICATION_CREDENTIALS env var
// OR a service account JSON string stored in FIREBASE_SERVICE_ACCOUNT env var

let admin = null;

function getAdmin() {
  if (admin) return admin;

  try {
    admin = require('firebase-admin');

    if (admin.apps.length) return admin;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Service account JSON stored as env var string (used in Cloud Run)
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'fanpulse-app-live',
      });
    } else {
      // Local: uses GOOGLE_APPLICATION_CREDENTIALS file path or ADC
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'fanpulse-app-live',
      });
    }

    console.log('[Firebase Admin] Initialized');
  } catch (err) {
    console.error('[Firebase Admin] Init failed:', err.message);
    admin = null;
  }

  return admin;
}

module.exports = { getAdmin };
