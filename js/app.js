// =============================================
// APP PRINCIPAL - MANEJO DE LA APLICACIÓN
// =============================================

let currentUser = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is logged in
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        mostrarApp();
    } else {
        mostrarLogin();
    }

    // Event Listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Actualizar reloj
    setInterval(updateDateTime, 1000);
    updateDateTime();
});

// LOGIN
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await API.login(username, password);
        
        if (response.success) {
            currentUser = response.user;
            sessionStorage.setItem('user', JSON.stringify(currentUser));
            mostrarApp();
            showNotification('Bienvenido ' + currentUser.nombre, 'success');
        } else {
            document.getElementById('loginError').textContent = response.message;
            document.getElementById('loginError').style.display = 'block';
        }
    } catch (error) {
        document.getElementById('loginError').textContent = 'Error conectando al servidor';
        document.getElementById('loginError').style.display = 'block';
    }
}

// LOGOUT
function handleLogout() {
    sessionStorage.removeItem('user');
    currentUser = null;
    mostrarLogin();
}

// MOSTRAR/OCULTAR PANTALLAS
function mostrarLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.nombre;
    cargarSeccion('pos');
}

// NAVEGACIÓN
function handleNavigation(e) {
    e.preventDefault();
    const section = e.currentTarget.dataset.section;
    
    // Actualizar nav active
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    cargarSeccion(section);
}

function cargarSeccion(section) {
    // Ocultar todas las secciones
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Mostrar sección seleccionada
    const targetSection = document.getElementById(`section-${section}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Actualizar título
    const titles = {
        pos: 'Punto de Venta',
        inventario: 'Inventario de Productos',
        compras: 'Compras a Proveedores',
        devoluciones: 'Devoluciones',
        reportes: 'Reportes y Estadísticas'
    };
    document.getElementById('sectionTitle').textContent = titles[section] || section;
    
    // Cargar datos de la sección
    switch(section) {
        case 'pos':
            if (typeof initPOS === 'function') initPOS();
            break;
        case 'inventario':
            if (typeof initInventario === 'function') initInventario();
            break;
        case 'compras':
            if (typeof initCompras === 'function') initCompras();
            break;
        case 'devoluciones':
            if (typeof initDevoluciones === 'function') initDevoluciones();
            break;
        case 'reportes':
            if (typeof initReportes === 'function') initReportes();
            break;
    }
}

// NOTIFICACIONES
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <strong>${type === 'success' ? '✓' : type === 'error' ? '✗' : '⚠'}</strong>
        ${message}
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// UTILIDADES
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('es-MX');
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('es-MX');
}

function formatMoney(amount) {
    return '$' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}
