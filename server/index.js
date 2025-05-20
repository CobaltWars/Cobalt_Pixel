const express = require('express');
const path = require('path');
const admin = require('firebase-admin');
const cors = require('cors');
const app = express();

// Initialisation Firebase Admin
const serviceAccount = require('./firebase-admin-config.json'); // À créer
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://VOTRE_PROJET.firebaseio.com"
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../public')));

// Endpoint pour la réinitialisation
app.get('/api/check-reset', async (req, res) => {
  try {
    const now = new Date();
    const day = now.getDay();
    const today = now.toISOString().split('T')[0];
    
    if (day === 0 || day === 6) { // Week-end
      const snapshot = await admin.database().ref('lastReset').once('value');
      const lastReset = snapshot.val();
      
      if (lastReset !== today) {
        await admin.database().ref('pixels').remove();
        await admin.database().ref('lastReset').set(today);
        return res.json({ reset: true, message: "Tableau réinitialisé" });
      }
    }
    res.json({ reset: false });
  } catch (error) {
    console.error("Erreur reset:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Endpoint pour les batch updates
app.post('/api/update-pixels', async (req, res) => {
  try {
    const { pixels } = req.body;
    
    if (!pixels || !Array.isArray(pixels)) {
      return res.status(400).json({ error: "Format invalide" });
    }
    
    const updates = {};
    pixels.forEach(pixel => {
      if (pixel.x !== undefined && pixel.y !== undefined && pixel.color) {
        updates[`${pixel.x}_${pixel.y}`] = pixel.color;
      }
    });
    
    await admin.database().ref('pixels').update(updates);
    res.json({ success: true, updated: Object.keys(updates).length });
  } catch (error) {
    console.error("Erreur batch update:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Toutes les autres routes
app.get('*', (req, res) => {
  res.sendFile(path.join