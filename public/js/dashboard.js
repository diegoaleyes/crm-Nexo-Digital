// public/js/dashboard.js

// Importamos 'auth' y 'db' desde nuestro archivo firebase-config.js
import { auth, db } from './firebase-config.js';

// Importamos las funciones específicas de autenticación y firestore desde Firebase CDN
// ¡Asegúrate de que la versión (11.10.0) sea la misma que en firebase-config.js!
import {
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {
    collection, // Para hacer referencia a una colección (ej. 'clients')
    addDoc,     // Para añadir un nuevo documento a una colección
    query,      // Para construir consultas a la base de datos
    where,      // Para filtrar consultas (ej. clientes de un solo negocio)
    orderBy,    // Para ordenar los resultados
    onSnapshot, // Para escuchar cambios en tiempo real en una colección
    deleteDoc,  // Para eliminar un documento
    doc,        // Para hacer referencia a un documento específico
    getDoc,     // Para obtener un documento por su ID
    updateDoc,   // Para actualizar un documento existente
     getDocs // ⬅️ ESTA LÍNEA DEBE ESTAR
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';


// ----------------------------------------------------
// 1. OBTENER LOS ELEMENTOS HTML QUE VAMOS a usar (Actualizado para el Modal)
// ----------------------------------------------------
const logoutBtn = document.querySelector('#logout-btn');
const openAddClientModalBtn = document.querySelector('#open-add-client-modal-btn'); // Nuevo botón para abrir modal
const clientModal = document.querySelector('#client-modal');           // El modal completo
const closeClientModalBtn = document.querySelector('#close-client-modal-btn'); // Botón para cerrar modal
const clientForm = document.querySelector('#client-form');             // El formulario dentro del modal
const modalTitle = document.querySelector('#modal-title');             // Título del modal
const modalSubmitBtn = document.querySelector('#modal-submit-btn');    // Botón de enviar del modal

const clientIdHidden = document.querySelector('#client-id-hidden');    // Campo oculto para ID del cliente (editar)
const modalClientName = document.querySelector('#modal-client-name');
const modalClientEmail = document.querySelector('#modal-client-email');
const modalClientPhone = document.querySelector('#modal-client-phone'); // Corrected typo here
const modalClientCompany = document.querySelector('#modal-client-company');
const modalClientNotes = document.querySelector('#modal-client-notes');

const clientsTableBody = document.querySelector('#clients-table-body');
const noClientsMessage = document.querySelector('#no-clients-message');

let currentBusinessId = null; // Variable para guardar el ID del negocio del usuario logueado
let editingClientId = null;   // Variable para saber si estamos editando un cliente

// ----------------------------------------------------
// 2. PROTECCIÓN DEL DASHBOARD Y CARGA DE DATOS AL INICIAR SESIÓN
// ----------------------------------------------------
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Si no hay usuario logueado, redirige a la página de login
        window.location.href = 'auth.html';
    } else {
        // Si hay usuario logueado, guarda su UID como el businessId
        console.log('Usuario autenticado en el Dashboard:', user.email, 'UID:', user.uid);
        currentBusinessId = user.uid; // El UID del usuario es el ID del negocio

        // Llama a la función para cargar y escuchar los clientes
        listenForClients(currentBusinessId);
        console.log("📡 Ejecutando listenForClients...");

        listenForAppointments(); // ← activa la carga visual de citas

    }
});


// ----------------------------------------------------
// 3. LÓGICA PARA ABRIR Y CERRAR EL MODAL
// ----------------------------------------------------
// Abrir modal para AÑADIR un nuevo cliente
if (openAddClientModalBtn) {
    openAddClientModalBtn.addEventListener('click', () => {
        clientModal.classList.remove('hidden'); // Mostrar el modal
        modalTitle.textContent = 'Añadir Nuevo Cliente'; // Cambiar título
        modalSubmitBtn.textContent = 'Añadir Cliente';  // Cambiar texto del botón
        clientForm.reset();                          // Limpiar formulario
        editingClientId = null;                      // Asegurarse de que no estamos en modo edición
        clientIdHidden.value = '';                   // Limpiar el ID oculto
    });
}

// Cerrar modal
if (closeClientModalBtn) {
    closeClientModalBtn.addEventListener('click', () => {
        clientModal.classList.add('hidden'); // Ocultar el modal
    });
}

// Cerrar modal al hacer clic fuera de él
if (clientModal) {
    clientModal.addEventListener('click', (e) => {
        if (e.target === clientModal) { // Si el clic es directamente en el fondo del modal
            clientModal.classList.add('hidden');
        }
    });
}


// ----------------------------------------------------
// 4. LÓGICA PARA AÑADIR O ACTUALIZAR UN CLIENTE (AHORA CON EL FORMULARIO DEL MODAL)
// ----------------------------------------------------
if (clientForm) { // Ahora usamos clientForm que es el del modal
    clientForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Obtener los valores del formulario del modal
        const clientData = {
            name: modalClientName.value,
            email: modalClientEmail.value,
            phone: modalClientPhone.value,
            company: modalClientCompany.value,
            notes: modalClientNotes.value
        };

        if (!currentBusinessId) {
            alert('Error: No se pudo determinar el ID de tu negocio. Por favor, recarga la página.');
            return;
        }

        try {
            if (editingClientId) {
                // Si estamos editando, actualizamos el documento existente
                const clientRef = doc(db, 'clients', editingClientId);
                await updateDoc(clientRef, clientData);
                alert('¡Cliente actualizado exitosamente!');
            } else {
                // Si no estamos editando, añadimos un nuevo documento
                await addDoc(collection(db, 'clients'), {
                    ...clientData, // Copiamos todos los datos del cliente
                    businessId: currentBusinessId, // Vinculamos el cliente al negocio
                    createdAt: new Date() // Para saber cuándo se añadió el cliente
                });
                alert('¡Cliente añadido exitosamente!');
            }

            clientForm.reset();          // Limpiar el formulario
            clientModal.classList.add('hidden'); // Ocultar el modal
            editingClientId = null;      // Resetear el modo edición
            clientIdHidden.value = '';   // Limpiar el ID oculto
        } catch (err) {
            console.error('Error al guardar cliente:', err);
            alert('Error al guardar cliente: ' + err.message);
        }
    });
}



// ----------------------------------------------------
// 6. LÓGICA PARA ABRIR MODAL EN MODO EDICIÓN Y PRE-LLENAR DATOS
// ----------------------------------------------------
const openEditClientModal = async (clientId) => {
    try {
        const clientRef = doc(db, 'clients', clientId);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
            const client = clientSnap.data();
            editingClientId = clientId; // Guardar el ID del cliente que estamos editando
            clientIdHidden.value = clientId; // Guardar también en el campo oculto

            // Rellenar el formulario del modal con los datos del cliente
            modalClientName.value = client.name || '';
            modalClientEmail.value = client.email || '';
            modalClientPhone.value = client.phone || ''; // CORRECCIÓN AQUÍ: quitado 'Z'
            modalClientCompany.value = client.company || '';
            modalClientNotes.value = client.notes || '';

            modalTitle.textContent = 'Editar Cliente';      // Cambiar título del modal
            modalSubmitBtn.textContent = 'Actualizar Cliente'; // Cambiar texto del botón
            clientModal.classList.remove('hidden'); // Mostrar el modal
        } else {
            alert('El cliente no fue encontrado.');
            console.error('No se encontró el documento para editar:', clientId);
        }
    } catch (err) {
        console.error('Error al cargar datos del cliente para edición:', err);
        alert('Error al cargar cliente para edición: ' + err.message);
    }
};

// === FICHA DETALLADA DEL CLIENTE (MODAL INFO) ===

const clientInfoPanel = document.querySelector('#client-info-panel');
const closeClientInfoPanelBtn = document.querySelector('#close-client-info-panel');

function openClientInfoPanel(clientId) {
    window.activeClientId = clientId;

  const clientRef = doc(db, 'clients', clientId);
  getDoc(clientRef).then(clientSnap => {
    if (!clientSnap.exists()) return alert('Cliente no encontrado.');

    const client = clientSnap.data();

    // Rellenar datos básicos
    document.querySelector('#info-name').textContent     = client.name     || '';
    document.querySelector('#info-email').textContent    = client.email    || '';
    document.querySelector('#info-phone').textContent    = client.phone    || '';
    document.querySelector('#info-company').textContent  = client.company  || '';
    document.querySelector('#info-address').textContent  = client.address  || '—';
    document.querySelector('#info-dni').textContent      = client.dni      || '—';
    document.querySelector('#info-notes').textContent    = client.notes    || 'Sin notas';

    // Documentos (ej: contrato PDF)
    const docContainer = document.querySelector('#info-documents');
    docContainer.innerHTML = '';
    if (client.contractUrl) {
      const link = document.createElement('a');
      link.href = client.contractUrl;
      link.target = '_blank';
      link.className = 'text-green-400 hover:text-green-200 underline block';
      link.textContent = '📄 Ver contrato PDF';
      docContainer.appendChild(link);
    }

    // Citas del cliente
    const q = query(collection(db, 'appointments'), where('clientId', '==', clientId));
    getDocs(q).then(snapshot => {
      const apptContainer = document.querySelector('#info-appointments');
      apptContainer.innerHTML = '';
      snapshot.forEach(doc => {
        const appt = doc.data();
        const apptDate = new Date(appt.date);
        const formatted = apptDate.toLocaleDateString('es-ES', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        const div = document.createElement('div');
        div.className = 'text-gray-300';
        div.textContent = `${formatted} — ${appt.type || 'Cita'} — ${appt.location || 'Sin ubicación'}`;
        apptContainer.appendChild(div);
      });
    });

    // Campaña asociada
    document.querySelector('#info-campaigns').textContent = client.campaign || '—';

    // Mostrar el panel
    clientInfoPanel.classList.remove('hidden');
  });
}

// Cerrar el panel
closeClientInfoPanelBtn?.addEventListener('click', () => {
  clientInfoPanel.classList.add('hidden');
});
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js';

const storage = getStorage();

document.querySelector('#upload-client-doc-btn')?.addEventListener('click', async () => {
  const fileInput = document.querySelector('#upload-client-doc');
  const file = fileInput?.files[0];
  const clientId = window.activeClientId;


  if (!file || !clientId) {
    alert('Selecciona un archivo PDF y asegurate de tener un cliente válido.');
    return;
  }

  if (file.type !== 'application/pdf') {
    alert('Solo se permiten archivos PDF.');
    return;
  }

  try {
    const storageRef = ref(storage, `contracts/${clientId}.pdf`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Guardamos el enlace en Firestore
    const clientRef = doc(db, 'clients', clientId);
    await updateDoc(clientRef, { contractUrl: url });

    // Mostrar en ficha
    const docContainer = document.querySelector('#info-documents');
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.className = 'text-green-400 hover:text-green-200 underline block';
    link.textContent = '📄 Ver contrato PDF';
    docContainer.innerHTML = ''; // Opcional si reemplazás
    docContainer.appendChild(link);

    alert('Documento subido correctamente.');
  } catch (err) {
    console.error('Error al subir documento:', err);
    alert('Error al subir documento: ' + err.message);
  }
});

// ----------------------------------------------------
// 7. LÓGICA PARA ELIMINAR UN CLIENTE (sin cambios, solo reordenado)
// ----------------------------------------------------
const deleteClient = async (clientId) => {
    try {
        const clientDocRef = doc(db, 'clients', clientId);
        await deleteDoc(clientDocRef);
        // La tabla se actualizará automáticamente gracias a onSnapshot
        alert('Cliente eliminado exitosamente.');
    } catch (err) {
        console.error('Error al eliminar cliente:', err);
        alert('Error al eliminar cliente: ' + err.message);
    }
};


// ----------------------------------------------------
// 8. LÓGICA PARA CERRAR SESIÓN (sin cambios, solo reordenado)
// ----------------------------------------------------
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            window.location.href = 'auth.html';
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
            alert('Error al cerrar sesión: ' + err.message);
        }
    });
}
// === NUEVO BLOQUE, AL FINAL DE dashboard.js ===
async function createAppointment(clientId, date, type, location, notes) {
  try {
    await addDoc(collection(db, 'appointments'), {
      clientId,
      businessId: currentBusinessId,
      date,
      type,
      location,
      notes,
      createdAt: new Date()
    });
    alert('Cita guardada correctamente.');
  } catch (err) {
    console.error('Error al guardar cita:', err);
    alert('Error al guardar cita: ' + err.message);
  }
}

// === PANEL DESLIZANTE PARA AGENDAR CITA ===

// Elementos del panel
const appointmentPanel = document.querySelector('#appointment-panel');
const closeAppointmentPanelBtn = document.querySelector('#close-appointment-panel');
const appointmentForm = document.querySelector('#appointment-form');
const appointmentClientId = document.querySelector('#appointment-client-id');

// Abrir el panel para un cliente específico
function openAppointmentPanel(clientId) {
  appointmentPanel.classList.remove('translate-x-full');
  appointmentClientId.value = clientId;
}

// Cerrar el panel
if (closeAppointmentPanelBtn) {
  closeAppointmentPanelBtn.addEventListener('click', () => {
    appointmentPanel.classList.add('translate-x-full');
    appointmentForm.reset();
  });
}

// Guardar la cita en Firebase
if (appointmentForm) {
  appointmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const clientId = appointmentClientId.value;
    const date = appointmentForm.querySelector('#appointment-date').value;
    const type = appointmentForm.querySelector('#appointment-type').value;
    const location = appointmentForm.querySelector('#appointment-location').value;
    const notes = appointmentForm.querySelector('#appointment-notes').value;

    if (!clientId || !date) {
      alert('Completa los campos obligatorios.');
      return;
    }

    try {
      await addDoc(collection(db, 'appointments'), {
        clientId,
        businessId: currentBusinessId,
        date,
        type,
        location,
        notes,
        createdAt: new Date()
      });

      alert('Cita guardada correctamente.');
      appointmentForm.reset();
      appointmentPanel.classList.add('translate-x-full');
    } catch (err) {
      console.error('Error al guardar cita:', err);
      alert('Error al guardar cita: ' + err.message);
    }
  });
}
// === AGENDA VISUAL MEJORADA ===

const filterDateSelect   = document.querySelector('#filter-date');
const filterTypeSelect   = document.querySelector('#filter-type');
const clearClientBtn     = document.querySelector('#clear-client-filter');
const appointmentsList   = document.querySelector('#appointments-list');
let   selectedClientId   = null; // guardará si filtrás por cliente

filterDateSelect?.addEventListener('change', listenForAppointments);
filterTypeSelect?.addEventListener('change', listenForAppointments);

clearClientBtn?.addEventListener('click', () => {
  selectedClientId = null;          // Limpias filtro de cliente
  listenForAppointments();          // Vuelves a cargar todas las citas
});

function getTypeColor(type) {
  const map = {
    Reunión: 'bg-green-700',
    Llamada: 'bg-yellow-700',
    Visita: 'bg-purple-700'
  };
  return map[type] || 'bg-blue-700';
}

function listenForAppointments() {
  if (!appointmentsList || !currentBusinessId) return;

  const q = query(
    collection(db, 'appointments'),
    where('businessId', '==', currentBusinessId),
    orderBy('date', 'asc')
  );

  onSnapshot(q, (snapshot) => {
    const filter = filterDateSelect?.value || 'all';
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);

    appointmentsList.innerHTML = '';

    const filteredDocs = snapshot.docs.filter(doc => {
      const appt = doc.data();
      const apptDate = new Date(appt.date);

      if (filter === 'today') {
        return apptDate.toDateString() === today.toDateString();
      } else if (filter === 'week') {
        return apptDate >= today && apptDate <= weekFromNow;
      }
      return true; // 'all'
    });

    if (filteredDocs.length === 0) {
      appointmentsList.innerHTML = '<p class="text-gray-400">No hay citas en esta vista.</p>';
      return;
    }

    filteredDocs.forEach((docSnap) => {
      const appt = docSnap.data();
      const dateObj = new Date(appt.date);
      const formattedDate = dateObj.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      const card = document.createElement('div');
      card.className = 'bg-gray-700 rounded-lg p-4 shadow-md flex flex-col space-y-2';

      card.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="font-semibold text-blue-300"><i class="fa-solid fa-calendar-days mr-2"></i>${formattedDate}</span>
          <span class="text-sm px-2 py-1 rounded-full text-white ${getTypeColor(appt.type)}">${appt.type || 'Sin tipo'}</span>
        </div>
        <p class="text-gray-300"><i class="fa-solid fa-location-dot mr-2"></i>${appt.location || 'Sin ubicación'}</p>
        <p class="text-sm text-gray-400">${appt.notes || 'Sin notas'}</p>
        <button class="delete-appointment text-sm text-red-400 hover:text-red-200 self-end" data-id="${docSnap.id}"><i class="fa-solid fa-trash mr-1"></i>Eliminar</button>
      `;

      appointmentsList.appendChild(card);
    });

    document.querySelectorAll('.delete-appointment').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (confirm('¿Eliminar esta cita?')) {
          try {
            await deleteDoc(doc(db, 'appointments', id));
          } catch (err) {
            console.error('Error al eliminar cita:', err);
            alert('Error al eliminar cita: ' + err.message);
          }
        }
      });
    });
  });
}

// 🔁 Reescuchar al cambiar filtro de fecha
filterDateSelect?.addEventListener('change', () => {
  listenForAppointments();
});


// ----------------------------------------------------
// 5. LÓGICA PARA LISTAR CLIENTES EN TIEMPO REAL
// ----------------------------------------------------
function listenForClients(businessId) {
  const q = query(
    collection(db, 'clients'),
    where('businessId', '==', businessId),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(q, (snapshot) => {
    clientsTableBody.innerHTML = '';

    if (snapshot.empty) {
      noClientsMessage.classList.remove('hidden');
    } else {
      noClientsMessage.classList.add('hidden');

      snapshot.forEach((doc) => {
        const client = doc.data();
        const clientId = doc.id;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="py-3 px-4 border-b border-gray-200">
            <span class="client-name-link text-blue-400 hover:text-blue-200 cursor-pointer" data-id="${clientId}">
              ${client.name || 'N/A'}
            </span>
          </td>
          <td class="py-3 px-4 border-b border-gray-200">${client.email || 'N/A'}</td>
          <td class="py-3 px-4 border-b border-gray-200">${client.phone || 'N/A'}</td>
          <td class="py-3 px-4 border-b border-gray-200">${client.company || 'N/A'}</td>
          <td class="py-3 px-4 border-b border-gray-200">${client.notes || 'N/A'}</td>
          <td class="py-3 px-4 border-b border-gray-200 text-center flex justify-center space-x-3">
            <button class="btn-edit text-blue-400 hover:text-blue-200 text-sm font-semibold" data-id="${clientId}">Editar</button>
            <button class="btn-appointment text-green-400 hover:text-green-200 text-sm font-semibold" data-id="${clientId}">Agendar</button>
            <button class="btn-delete text-red-400 hover:text-red-200 text-sm font-semibold" data-id="${clientId}">Eliminar</button>
          </td>
        `;

        clientsTableBody.appendChild(row);
      });

      document.querySelectorAll('.btn-edit').forEach(button => {
        button.addEventListener('click', (e) => {
          const clientId = e.target.dataset.id;
          openEditClientModal(clientId);
        });
      });

      document.querySelectorAll('.btn-delete').forEach(button => {
        button.addEventListener('click', (e) => {
          const clientId = e.target.dataset.id;
          if (confirm('¿Eliminar este cliente?')) {
            deleteClient(clientId);
          }
        });
      });

      document.querySelectorAll('.btn-appointment').forEach(button => {
        button.addEventListener('click', (e) => {
          const clientId = e.target.dataset.id;
          openAppointmentPanel(clientId);
        });
      });

      document.querySelectorAll('.client-name-link').forEach(span => {
        span.addEventListener('click', (e) => {
          const clientId = e.target.dataset.id;
          openClientInfoPanel(clientId);
        });
      });
    }
  });
}
