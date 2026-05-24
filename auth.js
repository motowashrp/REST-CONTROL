import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Protege las páginas — redirige a login si no hay sesión
export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    // Buscar perfil por UID en colección usuarios
    const q = query(collection(db, 'usuarios'), where('uid', '==', user.uid));
    const snap = await getDocs(q);
    const profile = snap.empty
      ? { nombre: user.email, email: user.email, rol: 'mesero' }
      : snap.docs[0].data();

    renderUserBar(profile);
    if (callback) callback(user, profile);
  });
}

function renderUserBar(profile) {
  const elName = document.getElementById('user-name');
  const elRole = document.getElementById('user-role');
  if (elName) elName.textContent = profile.nombre || profile.email;
  if (elRole) elRole.textContent = profile.rol || 'usuario';
}

export async function logout() {
  await signOut(auth);
  window.location.href = 'login.html';
}

// Formato pesos colombianos
export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(value);
}

// Tiempo transcurrido desde un Timestamp de Firestore
export function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 60000);
  if (diff < 1) return 'Ahora';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}
