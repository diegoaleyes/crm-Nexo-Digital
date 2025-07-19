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
    updateDoc   // Para actualizar un documento existente
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
// 5. LÓGICA PARA LISTAR CLIENTES EN TIEMPO REAL (onSnapshot)
//    (Actualizado para incluir botón de edición y manejar clics)
// ----------------------------------------------------
const listenForClients = (businessId) => {
     console.log('Escuchando clientes para Business ID:', businessId);
    const q = query(
        collection(db, 'clients'),
        where('businessId', '==', businessId),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        console.log('Nuevo snapshot recibido. Número de clientes:', snapshot.size);
        clientsTableBody.innerHTML = ''; // Limpiar la tabla

        if (snapshot.empty) {
            noClientsMessage.classList.remove('hidden');
            console.log('No hay clientes en el snapshot.');
        } else {
            noClientsMessage.classList.add('hidden');
            snapshot.forEach((doc) => {
                const client = doc.data();
                const clientId = doc.id;
                console.log('Añadiendo cliente a la tabla:', client.name, 'ID:', clientId, 'BusinessID en doc:', client.businessId);

                const row = document.createElement('tr');
                // No necesitamos esta clase si ya definimos estilos de hover en CSS
                // row.classList.add('hover:bg-gray-50'); 

                // *** AQUÍ ESTÁ LA SECCIÓN CORREGIDA Y MEJORADA CON LAS CLASES DEL NUEVO TEMA ***
                row.innerHTML = `
                    <td class="py-3 px-4 border-b border-gray-200">
                        <span class="client-name-link text-blue-400 hover:text-blue-200 cursor-pointer" data-id="${clientId}">${client.name || 'N/A'}</span>
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
                // ************************************

                clientsTableBody.appendChild(row);
            });

            // Añadir event listeners a los botones de eliminar y editar
            document.querySelectorAll('.btn-delete').forEach(button => {
                button.addEventListener('click', (e) => {
                    const clientIdToDelete = e.target.dataset.id;
                    if (confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
                        deleteClient(clientIdToDelete);
                    }
                });
            });

            document.querySelectorAll('.btn-edit').forEach(button => {
                button.addEventListener('click', (e) => {
                    const clientIdToEdit = e.target.dataset.id;
                    openEditClientModal(clientIdToEdit); // Llamamos a la nueva función de edición
                });
            });

            // Asegúrate de que este listener se añade *después* de que las filas se crean
            document.querySelectorAll('.client-name-link').forEach(span => {
                span.addEventListener('click', (e) => {
                    const clientIdToView = e.target.dataset.id;
                    openEditClientModal(clientIdToView); // Reutilizamos la función que abre el modal de edición
                });
            });

                document.querySelectorAll('.btn-appointment').forEach(button => {
            button.addEventListener('click', (e) => {
            const clientIdToAppoint = e.target.dataset.id;
        openAppointmentPanel(clientIdToAppoint);
                });
            });

        }
    });
};


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


