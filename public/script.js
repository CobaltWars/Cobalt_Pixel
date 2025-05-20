// Références aux éléments DOM
const pixelBoard = document.getElementById('pixelBoard');
const colorPicker = document.getElementById('colorPicker');
const clearBtn = document.getElementById('clearBtn');
const brushSize = document.getElementById('brushSize');
const resetNotification = document.getElementById('resetNotification');

// Configuration
const boardSize = 50;
let pixelsBatch = [];
let isDrawing = false;
let lastSent = Date.now();

// Initialiser le tableau
function initBoard() {
  pixelBoard.innerHTML = '';
  
  for (let y = 0; y < boardSize; y++) {
    for (let x = 0; x < boardSize; x++) {
      const pixel = document.createElement('div');
      pixel.className = 'pixel';
      pixel.dataset.x = x;
      pixel.dataset.y = y;
      
      // Gestion des événements
      pixel.addEventListener('mousedown', () => {
        isDrawing = true;
        updatePixel(x, y);
      });
      
      pixel.addEventListener('mouseenter', () => {
        if (isDrawing) updatePixel(x, y);
      });
      
      pixelBoard.appendChild(pixel);
    }
  }
  
  // Arrêter de dessiner quand la souris est relâchée
  document.addEventListener('mouseup', () => {
    isDrawing = false;
    sendBatchUpdate();
  });
  
  // Écouter les changements dans Firebase
  firebase.database().ref('pixels').on('value', (snapshot) => {
    const pixels = snapshot.val() || {};
    Object.keys(pixels).forEach(key => {
      const [x, y] = key.split('_');
      const pixel = document.querySelector(`.pixel[data-x="${x}"][data-y="${y}"]`);
      if (pixel) {
        pixel.style.backgroundColor = pixels[key];
      }
    });
  });
}

// Mettre à jour un pixel (avec la taille du pinceau)
function updatePixel(x, y) {
  const size = parseInt(brushSize.value);
  const color = colorPicker.value;
  
  for (let dx = 0; dx < size; dx++) {
    for (let dy = 0; dy < size; dy++) {
      const nx = parseInt(x) + dx;
      const ny = parseInt(y) + dy;
      
      if (nx >= 0 && nx < boardSize && ny >= 0 && ny < boardSize) {
        const pixel = document.querySelector(`.pixel[data-x="${nx}"][data-y="${ny}"]`);
        if (pixel) {
          pixel.style.backgroundColor = color;
          pixelsBatch.push({ x: nx, y: ny, color });
        }
      }
    }
  }
  
  // Envoyer le batch toutes les 500ms ou si le batch est trop grand
  if (Date.now() - lastSent > 500 || pixelsBatch.length > 20) {
    sendBatchUpdate();
  }
}

// Envoyer les mises à jour par batch
function sendBatchUpdate() {
  if (pixelsBatch.length === 0) return;
  
  fetch('/api/update-pixels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pixels: pixelsBatch })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      pixelsBatch = [];
      lastSent = Date.now();
    }
  })
  .catch(error => {
    console.error('Erreur batch update:', error);
  });
}

// Vérifier la réinitialisation hebdomadaire
function checkReset() {
  fetch('/api/check-reset')
    .then(response => response.json())
    .then(data => {
      if (data.reset) {
        showNotification('Le tableau a été réinitialisé pour le week-end !');
      }
      
      // Afficher notification du jeudi au samedi
      const now = new Date();
      const day = now.getDay();
      if (day >= 4 || day <= 6) {
        showNotification('Le tableau sera réinitialisé ce week-end !');
      }
    });
}

// Afficher une notification
function showNotification(message) {
  resetNotification.textContent = message;
  resetNotification.classList.remove('hidden');
  setTimeout(() => {
    resetNotification.classList.add('hidden');
  }, 5000);
}

// Effacer le tableau
clearBtn.addEventListener('click', () => {
  if (confirm('Voulez-vous vraiment effacer tout le tableau ?')) {
    firebase.database().ref('pixels').remove();
  }
});

// Initialiser l'application
document.addEventListener('DOMContentLoaded', () => {
  initBoard();
  checkReset();
  // Vérifier toutes les heures
  setInterval(checkReset, 3600000);
});