// COMPRAS
let proveedores = [];
let productosDisponibles = [];

async function initCompras() {
    await cargarProveedores();
    await cargarProductosCompra();
    setupComprasEvents();
}

async function cargarProveedores() {
    const response = await API.getProveedores();
    if (response.success) {
        proveedores = response.data;
        const select = document.getElementById('selectProveedor');
        if (select) {
            select.innerHTML = '<option value="">Seleccione un proveedor</option>' + 
                proveedores.map(p => `<option value="${p.ProveedorID}">${p.NombreProveedor}</option>`).join('');
        }
    }
}

async function cargarProductosCompra() {
    const response = await API.getProductos();
    if (response.success) {
        productosDisponibles = response.data;
        actualizarSelectsProductos();
    }
}

function actualizarSelectsProductos() {
    document.querySelectorAll('.producto-select').forEach(select => {
        if (select.options.length <= 1) {
            select.innerHTML = '<option value="">Seleccione producto</option>' + 
                productosDisponibles.map(p => 
                    `<option value="${p.ProductoID}">${p.NombreProducto}</option>`
                ).join('');
        }
    });
}

function setupComprasEvents() {
    const btnAgregar = document.getElementById('btnAgregarProductoCompra');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', agregarLineaProductoCompra);
    }
    
    const formCompra = document.getElementById('formCompra');
    if (formCompra) {
        formCompra.addEventListener('submit', registrarCompra);
    }
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-remove-producto')) {
            e.target.closest('.compra-producto-row').remove();
        }
    });
}

function agregarLineaProductoCompra() {
    const container = document.getElementById('compraProductos');
    const row = document.createElement('div');
    row.className = 'compra-producto-row';
    row.innerHTML = `
        <select class="producto-select" required>
            <option value="">Seleccione producto</option>
            ${productosDisponibles.map(p => 
                `<option value="${p.ProductoID}">${p.NombreProducto}</option>`
            ).join('')}
        </select>
        <input type="number" class="cantidad-input" placeholder="Cantidad" min="1" required>
        <input type="number" class="precio-input" placeholder="Precio Costo" step="0.01" min="0" required>
        <button type="button" class="btn-remove-producto"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(row);
}

async function registrarCompra(e) {
    e.preventDefault();
    
    const proveedorID = parseInt(document.getElementById('selectProveedor').value);
    const observaciones = document.getElementById('observacionesCompra').value;
    
    if (!proveedorID) {
        showNotification('Seleccione un proveedor', 'warning');
        return;
    }
    
    const rows = document.querySelectorAll('.compra-producto-row');
    if (rows.length === 0) {
        showNotification('Agregue al menos un producto', 'warning');
        return;
    }
    
    const productos = [];
    let valido = true;
    
    rows.forEach(row => {
        const productoID = parseInt(row.querySelector('.producto-select').value);
        const cantidad = parseFloat(row.querySelector('.cantidad-input').value);
        const precioCosto = parseFloat(row.querySelector('.precio-input').value);
        
        if (!productoID || !cantidad || !precioCosto) {
            valido = false;
            return;
        }
        
        productos.push({ productoID, cantidad, precioCosto });
    });
    
    if (!valido) {
        showNotification('Complete todos los campos de productos', 'warning');
        return;
    }
    
    const compra = {
        proveedorID,
        usuarioID: currentUser.id,
        observaciones,
        productos
    };
    
    try {
        const response = await API.registrarCompra(compra);
        if (response.success) {
            showNotification('Compra registrada exitosamente', 'success');
            document.getElementById('formCompra').reset();
            document.getElementById('compraProductos').innerHTML = `
                <div class="compra-producto-row">
                    <select class="producto-select" required>
                        <option value="">Seleccione producto</option>
                    </select>
                    <input type="number" class="cantidad-input" placeholder="Cantidad" min="1" required>
                    <input type="number" class="precio-input" placeholder="Precio Costo" step="0.01" min="0" required>
                    <button type="button" class="btn-remove-producto"><i class="fas fa-times"></i></button>
                </div>
            `;
            actualizarSelectsProductos();
        }
    } catch (error) {
        showNotification('Error registrando compra', 'error');
    }
}