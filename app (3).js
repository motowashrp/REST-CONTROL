// ═══════════════════════════════════════════════
// FIREBASE CONFIG
// ═══════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, updateDoc, onSnapshot, query, where, orderBy, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB63aYv7tTWvJoRXUD3A9R_m4OGNXPcUwg",
  authDomain: "rest-control-a1a56.firebaseapp.com",
  projectId: "rest-control-a1a56",
  storageBucket: "rest-control-a1a56.firebasestorage.app",
  messagingSenderId: "322368325909",
  appId: "1:322368325909:web:d43c14ff5ef9b744e5c11c"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ═══════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════
function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(value);
}

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 60000);
  if (diff < 1) return 'Ahora';
  if (diff < 60) return `${diff} min`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

// ═══════════════════════════════════════════════
// DETECCIÓN DE PÁGINA
// ═══════════════════════════════════════════════
const page = window.location.pathname.split('/').pop() || 'login.html';

if (page === 'login.html') {
  initLogin();
} else if (page === 'setup.html') {
  initSetup();
} else {
  initApp();
}

// ═══════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════
function initLogin() {
  onAuthStateChanged(auth, user => {
    if (user) window.location.href = 'index.html';
  });

  window.login = async () => {
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errEl    = document.getElementById('error-msg');
    errEl.classList.add('hidden');

    if (!email || !password) {
      errEl.textContent = 'Por favor completa todos los campos.';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'index.html';
    } catch (e) {
      const msgs = {
        'auth/user-not-found':      'Usuario no encontrado.',
        'auth/wrong-password':      'Contraseña incorrecta.',
        'auth/invalid-email':       'Correo inválido.',
        'auth/too-many-requests':   'Demasiados intentos. Intenta más tarde.',
        'auth/invalid-credential':  'Correo o contraseña incorrectos.'
      };
      errEl.textContent = msgs[e.code] || 'Error al iniciar sesión.';
      errEl.classList.remove('hidden');
    }
  };

  document.getElementById('password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.login();
  });
}

// ═══════════════════════════════════════════════
// SETUP — CREAR ADMIN
// ═══════════════════════════════════════════════
function initSetup() {
  window.crearAdmin = async () => {
    const nombre   = document.getElementById('nombre').value.trim();
    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const msgEl    = document.getElementById('msg');

    msgEl.className = 'text-sm rounded-lg px-4 py-3 mb-4 bg-blue-50 text-blue-700';
    msgEl.textContent = 'Creando usuario...';
    msgEl.classList.remove('hidden');

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await addDoc(collection(db, 'usuarios'), {
        uid: cred.user.uid, nombre, email,
        rol: 'admin', activo: true, creadoEn: serverTimestamp()
      });
      document.getElementById('step-create').classList.add('hidden');
      document.getElementById('step-done').classList.remove('hidden');
    } catch (e) {
      const errores = {
        'auth/email-already-in-use': 'Este correo ya tiene cuenta. Ve directo al login.',
        'auth/weak-password':        'La contraseña debe tener al menos 6 caracteres.',
        'auth/invalid-email':        'El correo no es válido.'
      };
      msgEl.className = 'text-sm rounded-lg px-4 py-3 mb-4 bg-red-50 text-red-700';
      msgEl.textContent = errores[e.code] || e.message;
    }
  };
}

// ═══════════════════════════════════════════════
// APP PRINCIPAL (index.html)
// ═══════════════════════════════════════════════
let currentUser    = null;
let currentProfile = null;
let menuItems      = [];

function initApp() {
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'login.html'; return; }
    currentUser = user;

    // Buscar perfil en Firestore
    const q    = query(collection(db, 'usuarios'), where('uid', '==', user.uid));
    const snap = await getDocs(q);
    currentProfile = snap.empty
      ? { nombre: user.email, email: user.email, rol: 'mesero' }
      : snap.docs[0].data();

    // Mostrar nombre y rol en sidebar
    const elName = document.getElementById('user-name');
    const elRole = document.getElementById('user-role');
    if (elName) elName.textContent = currentProfile.nombre || currentProfile.email;
    if (elRole) elRole.textContent = currentProfile.rol || 'usuario';

    applyRoleVisibility(currentProfile.rol);
    initListeners();
  });

  window.doLogout = async () => {
    await signOut(auth);
    window.location.href = 'login.html';
  };
}

function applyRoleVisibility(rol) {
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',').map(r => r.trim());
    if (!allowed.includes(rol)) el.style.display = 'none';
  });
}

// ── Navegación ────────────────────────────────
window.showSection = (id, el) => {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  if (el) el.classList.add('active');
};

// ── Listeners Firestore ───────────────────────
function initListeners() {
  onSnapshot(collection(db, 'mesas'), snap => {
    const mesas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMesas(mesas);
    renderStatsMesas(mesas);
  });

  onSnapshot(query(collection(db, 'pedidos'), orderBy('creadoEn', 'desc')), snap => {
    const pedidos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderKanban(pedidos);
    renderCaja(pedidos);
    renderReportes(pedidos);
  });

  onSnapshot(collection(db, 'menu'), snap => {
    menuItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderMenu(menuItems, 'todos');
    renderCategorias(menuItems);
  });

  onSnapshot(collection(db, 'inventario'), snap => {
    renderInventario(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  onSnapshot(collection(db, 'usuarios'), snap => {
    renderUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── MESAS ─────────────────────────────────────
function renderMesas(mesas) {
  const grid = document.getElementById('grid-mesas');
  if (!mesas.length) {
    grid.innerHTML = `<div class="col-span-5 text-sm text-gray-400">
      Sin mesas. <button onclick="crearMesasSeed()" class="text-green-600 underline">Crear 10 mesas de ejemplo</button>
    </div>`;
    return;
  }
  grid.innerHTML = mesas.sort((a, b) => a.numero - b.numero).map(m => {
    const estilos = {
      libre:     'bg-white border-gray-200 text-gray-700 hover:border-gray-300',
      ocupada:   'bg-green-50 border-green-400 text-green-800',
      reservada: 'bg-amber-50 border-amber-400 text-amber-800'
    };
    const detalle = m.estado === 'ocupada'   ? `${m.personas || 0} personas` :
                    m.estado === 'reservada' ? (m.hora || '') : 'Disponible';
    return `<div onclick="accionMesa('${m.id}','${m.estado}')"
      class="border rounded-xl p-4 text-center cursor-pointer transition-all hover:shadow-sm ${estilos[m.estado] || estilos.libre}">
      <div class="text-lg font-semibold">Mesa ${m.numero}</div>
      <div class="text-xs mt-1 capitalize">${m.estado}</div>
      <div class="text-xs mt-0.5 opacity-70">${detalle}</div>
    </div>`;
  }).join('');
}

function renderStatsMesas(mesas) {
  const ocupadas   = mesas.filter(m => m.estado === 'ocupada').length;
  const reservadas = mesas.filter(m => m.estado === 'reservada').length;
  document.getElementById('stats-mesas').innerHTML = [
    { label: 'Ocupadas',  value: ocupadas,   sub: `de ${mesas.length}` },
    { label: 'Libres',    value: mesas.length - ocupadas - reservadas },
    { label: 'Reservadas',value: reservadas },
    { label: 'Ocupación', value: mesas.length ? Math.round((ocupadas / mesas.length) * 100) + '%' : '0%' }
  ].map(s => `<div class="stat-card">
    <div class="text-xs text-gray-500">${s.label}</div>
    <div class="text-2xl font-semibold text-gray-900 mt-1">${s.value}</div>
    ${s.sub ? `<div class="text-xs text-gray-400 mt-0.5">${s.sub}</div>` : ''}
  </div>`).join('');
}

window.accionMesa = async (id, estado) => {
  const ref = doc(db, 'mesas', id);
  if (estado === 'libre') {
    const personas = prompt('¿Cuántas personas?');
    if (!personas || isNaN(personas)) return;
    await updateDoc(ref, { estado: 'ocupada', personas: parseInt(personas), ocupadaEn: serverTimestamp() });
  } else if (estado === 'ocupada') {
    if (confirm('¿Liberar esta mesa?')) {
      await updateDoc(ref, { estado: 'libre', personas: 0 });
    }
  }
};

window.crearMesasSeed = async () => {
  for (let i = 1; i <= 10; i++) {
    await addDoc(collection(db, 'mesas'), { numero: i, estado: 'libre', personas: 0 });
  }
};

// ── PEDIDOS KANBAN ────────────────────────────
function renderKanban(pedidos) {
  const cols = { espera: [], cocina: [], listo: [] };
  pedidos.filter(p => !['pagado','cancelado'].includes(p.estado)).forEach(p => {
    if (cols[p.estado]) cols[p.estado].push(p);
  });
  ['espera','cocina','listo'].forEach(estado => {
    document.getElementById('col-' + estado).innerHTML =
      cols[estado].map(p => `
        <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div class="flex justify-between items-start mb-2">
            <span class="font-medium text-sm">Mesa ${p.mesa}</span>
            <span class="text-xs text-gray-400">${timeAgo(p.creadoEn)}</span>
          </div>
          <div class="text-xs text-gray-500 mb-3">${(p.items||[]).map(i=>`${i.cantidad}x ${i.nombre}`).join(', ')}</div>
          ${p.nota ? `<div class="text-xs text-amber-600 mb-2">📝 ${p.nota}</div>` : ''}
          <div class="flex justify-between items-center">
            <span class="text-sm font-medium text-green-700">${formatCOP(p.total||0)}</span>
            <div class="flex gap-1">
              ${estado !== 'listo' ? `<button onclick="avanzarPedido('${p.id}','${estado}')" class="text-xs bg-green-600 text-white px-2.5 py-1 rounded-lg">→ Avanzar</button>` : ''}
              ${estado === 'listo' ? `<button onclick="cobrarPedido('${p.id}')" class="text-xs bg-blue-600 text-white px-2.5 py-1 rounded-lg">Cobrar</button>` : ''}
            </div>
          </div>
        </div>`).join('') || '<p class="text-xs text-gray-400 py-2">Sin pedidos</p>';
  });
}

window.avanzarPedido = async (id, estadoActual) => {
  const sig = { espera: 'cocina', cocina: 'listo' };
  if (sig[estadoActual]) await updateDoc(doc(db, 'pedidos', id), { estado: sig[estadoActual] });
};

window.cobrarPedido = async (id) => {
  const metodo  = prompt('Método de pago:\n1 - Efectivo\n2 - Tarjeta\n3 - Nequi');
  const opciones = { '1':'efectivo','2':'tarjeta','3':'nequi', efectivo:'efectivo', tarjeta:'tarjeta', nequi:'nequi' };
  const pago = opciones[metodo?.toLowerCase().trim()];
  if (!pago) return;
  await updateDoc(doc(db, 'pedidos', id), { estado: 'pagado', metodoPago: pago, pagadoEn: serverTimestamp() });
};

window.abrirModalPedido = async () => {
  const mesasSnap = await getDocs(query(collection(db, 'mesas'), where('estado','==','ocupada')));
  const mesas = mesasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!mesas.length) { alert('No hay mesas ocupadas. Primero ocupa una mesa.'); return; }

  const opsMesas = mesas.map(m => `<option value="${m.numero}">Mesa ${m.numero} (${m.personas} personas)</option>`).join('');
  const opsItems = menuItems.filter(i => i.disponible).map(i =>
    `<label class="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-gray-50 px-1 rounded">
      <input type="checkbox" value="${i.id}" data-nombre="${i.nombre}" data-precio="${i.precio}" class="item-check accent-green-600">
      <span>${i.nombre}</span>
      <span class="ml-auto text-green-700 font-medium">${formatCOP(i.precio)}</span>
    </label>`
  ).join('');

  showModal(`
    <h3 class="text-base font-semibold mb-4">Nuevo pedido</h3>
    <div class="space-y-3">
      <div><label class="text-xs text-gray-500">Mesa</label>
        <select id="m-mesa" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">${opsMesas}</select></div>
      <div><label class="text-xs text-gray-500">Platos</label>
        <div class="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">${opsItems || '<p class="text-sm text-gray-400 p-2">No hay platos disponibles.</p>'}</div></div>
      <div><label class="text-xs text-gray-500">Nota especial (opcional)</label>
        <input id="m-nota" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ej: sin cebolla..."></div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal()" class="text-sm px-4 py-2 border border-gray-200 rounded-lg">Cancelar</button>
      <button onclick="guardarPedido()" class="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Crear pedido</button>
    </div>`);
};

window.guardarPedido = async () => {
  const mesa   = document.getElementById('m-mesa').value;
  const nota   = document.getElementById('m-nota').value;
  const checks = [...document.querySelectorAll('.item-check:checked')];
  if (!checks.length) { alert('Selecciona al menos un plato.'); return; }
  const items = checks.map(c => ({ id: c.value, nombre: c.dataset.nombre, precio: parseFloat(c.dataset.precio), cantidad: 1 }));
  const total = items.reduce((s, i) => s + i.precio, 0);
  await addDoc(collection(db, 'pedidos'), {
    mesa, items, total, nota, estado: 'espera',
    creadoEn: serverTimestamp(), creadoPor: currentUser.uid
  });
  closeModal();
  showSection('pedidos', document.querySelectorAll('.nav-item')[1]);
};

// ── MENÚ ──────────────────────────────────────
function renderCategorias(items) {
  const cats = ['todos', ...new Set(items.map(i => i.categoria).filter(Boolean))];
  document.getElementById('cats-menu').innerHTML = cats.map(c =>
    `<button onclick="filterMenu('${c}',this)"
      class="${c==='todos' ? 'bg-green-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-green-50'} text-xs px-4 py-1.5 rounded-full transition-colors">
      ${c}
    </button>`
  ).join('');
}

window.filterMenu = (cat, el) => {
  document.querySelectorAll('#cats-menu button').forEach(b => {
    b.className = 'border border-gray-200 text-gray-600 hover:bg-green-50 text-xs px-4 py-1.5 rounded-full transition-colors';
  });
  el.className = 'bg-green-600 text-white text-xs px-4 py-1.5 rounded-full transition-colors';
  renderMenu(menuItems, cat);
};

function renderMenu(items, cat = 'todos') {
  const filtered = cat === 'todos' ? items : items.filter(i => i.categoria === cat);
  document.getElementById('grid-menu').innerHTML = filtered.map(i => `
    <div class="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div class="flex justify-between items-start mb-1">
        <div class="font-medium text-sm text-gray-900">${i.nombre}</div>
        <span class="badge ${i.disponible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}">${i.disponible ? 'disponible' : 'agotado'}</span>
      </div>
      <div class="text-xs text-gray-500 mb-3">${i.descripcion || ''}</div>
      <div class="flex justify-between items-center">
        <span class="text-sm font-semibold text-green-700">${formatCOP(i.precio)}</span>
        <button onclick="toggleDisponible('${i.id}',${i.disponible})" class="text-xs text-gray-400 hover:text-gray-700">
          ${i.disponible ? 'Marcar agotado' : 'Disponible'}
        </button>
      </div>
    </div>`).join('') || '<p class="text-sm text-gray-400 col-span-3">Sin platos.</p>';
}

window.toggleDisponible = async (id, actual) => {
  await updateDoc(doc(db, 'menu', id), { disponible: !actual });
};

window.abrirModalMenu = () => {
  showModal(`
    <h3 class="text-base font-semibold mb-4">Agregar plato al menú</h3>
    <div class="space-y-3">
      <div><label class="text-xs text-gray-500">Nombre *</label>
        <input id="mn-nombre" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ej: Bandeja Paisa"></div>
      <div><label class="text-xs text-gray-500">Descripción</label>
        <input id="mn-desc" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ingredientes principales"></div>
      <div><label class="text-xs text-gray-500">Categoría</label>
        <input id="mn-cat" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="entradas / principales / bebidas / postres"></div>
      <div><label class="text-xs text-gray-500">Precio (COP) *</label>
        <input id="mn-precio" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="38000"></div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal()" class="text-sm px-4 py-2 border border-gray-200 rounded-lg">Cancelar</button>
      <button onclick="guardarMenu()" class="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Guardar</button>
    </div>`);
};

window.guardarMenu = async () => {
  const nombre = document.getElementById('mn-nombre').value.trim();
  const precio = parseFloat(document.getElementById('mn-precio').value);
  if (!nombre || !precio) { alert('Nombre y precio son obligatorios.'); return; }
  await addDoc(collection(db, 'menu'), {
    nombre, descripcion: document.getElementById('mn-desc').value,
    categoria: document.getElementById('mn-cat').value,
    precio, disponible: true, creadoEn: serverTimestamp()
  });
  closeModal();
};

// ── CAJA ──────────────────────────────────────
function renderCaja(pedidos) {
  const pagados    = pedidos.filter(p => p.estado === 'pagado');
  const pendientes = pedidos.filter(p => !['pagado','cancelado'].includes(p.estado));
  const totalHoy   = pagados.reduce((s, p) => s + (p.total||0), 0);
  const efectivo   = pagados.filter(p => p.metodoPago === 'efectivo').reduce((s,p) => s+(p.total||0), 0);
  const digital    = pagados.filter(p => ['tarjeta','nequi'].includes(p.metodoPago)).reduce((s,p) => s+(p.total||0), 0);

  document.getElementById('stats-caja').innerHTML = [
    { label: 'Total hoy',          value: formatCOP(totalHoy) },
    { label: 'Efectivo',           value: formatCOP(efectivo) },
    { label: 'Tarjeta / Nequi',    value: formatCOP(digital) },
    { label: 'Cuentas pendientes', value: pendientes.length }
  ].map(s => `<div class="stat-card">
    <div class="text-xs text-gray-500">${s.label}</div>
    <div class="text-xl font-semibold text-gray-900 mt-1">${s.value}</div>
  </div>`).join('');

  const colores = {
    espera:'bg-gray-100 text-gray-600', cocina:'bg-amber-100 text-amber-700',
    listo:'bg-blue-100 text-blue-700',  pagado:'bg-green-100 text-green-700',
    cancelado:'bg-red-100 text-red-600'
  };
  document.getElementById('tabla-caja').innerHTML = pedidos.slice(0,30).map(p => `
    <tr class="border-b border-gray-50 hover:bg-gray-50">
      <td class="px-4 py-3 text-xs text-gray-400 font-mono">#${p.id.slice(-5).toUpperCase()}</td>
      <td class="px-4 py-3 text-sm">Mesa ${p.mesa}</td>
      <td class="px-4 py-3 text-xs text-gray-500">${(p.items||[]).map(i=>`${i.cantidad}x ${i.nombre}`).join(', ')}</td>
      <td class="px-4 py-3 text-sm font-medium text-right">${formatCOP(p.total||0)}</td>
      <td class="px-4 py-3 text-center"><span class="badge ${colores[p.estado]||''}">${p.estado}</span></td>
      <td class="px-4 py-3 text-right text-xs">
        ${!['pagado','cancelado'].includes(p.estado) ? `<button onclick="cobrarPedido('${p.id}')" class="text-green-600 hover:underline">Cobrar</button>` : ''}
      </td>
    </tr>`).join('');
}

// ── INVENTARIO ────────────────────────────────
function renderInventario(inv) {
  document.getElementById('tabla-inv').innerHTML = inv.map(i => {
    const pct   = Math.min(100, Math.round((i.stock / (i.stockMax||1)) * 100));
    const color = pct > 50 ? 'bg-green-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-400';
    const badge = pct > 50 ? 'bg-green-100 text-green-800' : pct > 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
    const label = pct > 50 ? 'ok' : pct > 20 ? 'bajo' : 'crítico';
    return `<tr class="border-b border-gray-50 hover:bg-gray-50">
      <td class="px-4 py-3 text-sm font-medium">${i.nombre}</td>
      <td class="px-4 py-3 text-sm">${i.stock}</td>
      <td class="px-4 py-3 text-xs text-gray-500">${i.unidad||''}</td>
      <td class="px-4 py-3 w-32"><div class="h-1.5 bg-gray-100 rounded-full"><div class="${color} h-1.5 rounded-full" style="width:${pct}%"></div></div></td>
      <td class="px-4 py-3 text-center"><span class="badge ${badge}">${label}</span></td>
      <td class="px-4 py-3 text-right"><button onclick="editarStock('${i.id}',${i.stock})" class="text-xs text-gray-400 hover:text-gray-700">Editar</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-gray-400">Sin productos.</td></tr>';
}

window.editarStock = async (id, stockActual) => {
  const nuevo = prompt(`Stock actual: ${stockActual}\nNuevo stock:`);
  if (nuevo === null || isNaN(nuevo)) return;
  await updateDoc(doc(db, 'inventario', id), { stock: parseFloat(nuevo) });
};

window.abrirModalInventario = () => {
  showModal(`
    <h3 class="text-base font-semibold mb-4">Agregar producto</h3>
    <div class="space-y-3">
      <div><label class="text-xs text-gray-500">Nombre *</label>
        <input id="inv-nombre" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Ej: Arroz blanco"></div>
      <div class="grid grid-cols-2 gap-3">
        <div><label class="text-xs text-gray-500">Stock inicial</label>
          <input id="inv-stock" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="0"></div>
        <div><label class="text-xs text-gray-500">Stock máximo</label>
          <input id="inv-max" type="number" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="20"></div>
      </div>
      <div><label class="text-xs text-gray-500">Unidad</label>
        <input id="inv-unidad" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="kg / unidades / litros"></div>
    </div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal()" class="text-sm px-4 py-2 border border-gray-200 rounded-lg">Cancelar</button>
      <button onclick="guardarInventario()" class="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Guardar</button>
    </div>`);
};

window.guardarInventario = async () => {
  const nombre = document.getElementById('inv-nombre').value.trim();
  if (!nombre) { alert('El nombre es obligatorio.'); return; }
  await addDoc(collection(db, 'inventario'), {
    nombre, stock: parseFloat(document.getElementById('inv-stock').value)||0,
    stockMax: parseFloat(document.getElementById('inv-max').value)||10,
    unidad: document.getElementById('inv-unidad').value,
    creadoEn: serverTimestamp()
  });
  closeModal();
};

// ── REPORTES ──────────────────────────────────
function renderReportes(pedidos) {
  const pagados     = pedidos.filter(p => p.estado === 'pagado');
  const totalVentas = pagados.reduce((s, p) => s + (p.total||0), 0);
  const ticketProm  = pagados.length ? totalVentas / pagados.length : 0;

  document.getElementById('stats-reportes').innerHTML = [
    { label: 'Ventas totales',       value: formatCOP(totalVentas) },
    { label: 'Órdenes completadas',  value: pagados.length },
    { label: 'Ticket promedio',      value: formatCOP(ticketProm) },
    { label: 'Platos en carta',      value: menuItems.length }
  ].map(s => `<div class="stat-card">
    <div class="text-xs text-gray-500">${s.label}</div>
    <div class="text-xl font-semibold text-gray-900 mt-1">${s.value}</div>
  </div>`).join('');

  const dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const ventasDia = Array(7).fill(0);
  pagados.forEach(p => {
    if (!p.pagadoEn) return;
    const d    = p.pagadoEn.toDate ? p.pagadoEn.toDate() : new Date(p.pagadoEn);
    const diff = Math.floor((Date.now() - d) / 86400000);
    if (diff < 7) ventasDia[6 - diff] += p.total||0;
  });
  const maxV   = Math.max(...ventasDia, 1);
  const labels = Array.from({length:7}, (_,i) => { const d = new Date(); d.setDate(d.getDate()-(6-i)); return dias[d.getDay()]; });
  document.getElementById('chart-ventas').innerHTML = ventasDia.map((v,i) =>
    `<div class="flex flex-col items-center gap-1 flex-1">
      <div class="w-full bg-green-500 rounded-t" style="height:${Math.max(4,Math.round((v/maxV)*100))}px"></div>
      <div class="text-xs text-gray-400">${labels[i]}</div>
    </div>`
  ).join('');

  const conteo = {};
  pagados.forEach(p => (p.items||[]).forEach(i => { conteo[i.nombre] = (conteo[i.nombre]||0) + i.cantidad; }));
  const top  = Object.entries(conteo).sort((a,b) => b[1]-a[1]).slice(0,5);
  const maxP = Math.max(...top.map(t=>t[1]),1);
  document.getElementById('top-platos').innerHTML = top.map(([n,v]) =>
    `<div class="flex items-center gap-3">
      <div class="text-xs text-gray-700 w-32 truncate">${n}</div>
      <div class="flex-1 h-1.5 bg-gray-100 rounded-full"><div class="h-1.5 bg-green-500 rounded-full" style="width:${Math.round((v/maxP)*100)}%"></div></div>
      <div class="text-xs text-gray-500 w-4 text-right">${v}</div>
    </div>`
  ).join('') || '<p class="text-xs text-gray-400">Sin datos todavía.</p>';
}

// ── USUARIOS ──────────────────────────────────
function renderUsuarios(users) {
  const colores = { admin:'bg-purple-100 text-purple-800', gerente:'bg-blue-100 text-blue-800', mesero:'bg-green-100 text-green-800', cajero:'bg-amber-100 text-amber-800', cocina:'bg-red-100 text-red-800' };
  document.getElementById('lista-usuarios').innerHTML = users.map(u => `
    <div class="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-4">
      <div class="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-800 flex-shrink-0">
        ${(u.nombre||u.email||'?').charAt(0).toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-900 truncate">${u.nombre||'Sin nombre'}</div>
        <div class="text-xs text-gray-400 truncate">${u.email||''}</div>
      </div>
      <span class="badge ${colores[u.rol]||'bg-gray-100 text-gray-600'}">${u.rol||'sin rol'}</span>
      <div class="w-2 h-2 rounded-full flex-shrink-0 ${u.activo ? 'bg-green-400':'bg-gray-300'}"></div>
    </div>`).join('') || '<p class="text-sm text-gray-400">Sin usuarios.</p>';
}

window.abrirModalUsuario = () => {
  showModal(`
    <h3 class="text-base font-semibold mb-4">Nuevo usuario</h3>
    <div class="space-y-3">
      <div><label class="text-xs text-gray-500">Nombre completo *</label>
        <input id="u-nombre" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Juan Pérez"></div>
      <div><label class="text-xs text-gray-500">Correo *</label>
        <input id="u-email" type="email" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="juan@restaurante.com"></div>
      <div><label class="text-xs text-gray-500">Contraseña temporal *</label>
        <input id="u-pass" type="password" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" placeholder="Mínimo 6 caracteres"></div>
      <div><label class="text-xs text-gray-500">Rol *</label>
        <select id="u-rol" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1">
          <option value="mesero">Mesero</option>
          <option value="cajero">Cajero</option>
          <option value="cocina">Cocina</option>
          <option value="gerente">Gerente</option>
          <option value="admin">Administrador</option>
        </select></div>
    </div>
    <div id="u-error" class="hidden text-xs text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg"></div>
    <div class="flex justify-end gap-2 mt-5">
      <button onclick="closeModal()" class="text-sm px-4 py-2 border border-gray-200 rounded-lg">Cancelar</button>
      <button onclick="crearUsuario()" class="text-sm px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Crear</button>
    </div>`);
};

window.crearUsuario = async () => {
  const nombre = document.getElementById('u-nombre').value.trim();
  const email  = document.getElementById('u-email').value.trim();
  const pass   = document.getElementById('u-pass').value;
  const rol    = document.getElementById('u-rol').value;
  const errEl  = document.getElementById('u-error');
  if (!nombre || !email || !pass) { errEl.textContent = 'Completa todos los campos.'; errEl.classList.remove('hidden'); return; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await addDoc(collection(db, 'usuarios'), { uid: cred.user.uid, nombre, email, rol, activo: true, creadoEn: serverTimestamp() });
    closeModal();
  } catch (e) {
    const msgs = { 'auth/email-already-in-use':'Este correo ya está registrado.', 'auth/weak-password':'Mínimo 6 caracteres.' };
    errEl.textContent = msgs[e.code] || e.message;
    errEl.classList.remove('hidden');
  }
};

// ── MODAL ─────────────────────────────────────
window.showModal = (html) => {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
};
window.closeModal = () => {
  document.getElementById('modal-overlay').classList.add('hidden');
};
document.getElementById('modal-overlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});
