// DEVOLUCIONES
let ventaActual = null;

async function initDevoluciones() {
    setupDevolucionesEvents();
}

function setupDevolucionesEvents() {
    const btnBuscar = document.getElementById('btnBuscarVenta');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarVenta);
    }
    
    const formDevolucion = document.getElementById('formDevolucion');
    if (formDevolucion) {
        formDevolucion.addEventListener('submit', procesarDevolucion);
    }
}

async function buscarVenta() {
    const ventaID = parseInt(document.getElementById('ventaIDDevolucion').value);
    
    if (!ventaID) {
        showNotification('Ingrese un ID de venta', 'warning');
        return;
    }
    
    try {
        const response = await API.getDetalleVenta(ventaID);
        if (response.success) {
            ventaActual = response;
            mostrarVenta(ventaID);
        } else {
            showNotification('Venta no encontrada', 'error');
            ventaActual = null;
            document.getElementById('ventaInfo').style.display = 'none';
        }
    } catch (error) {
        showNotification('Error buscano venta', 'error');
        ventaActual = null;
        document.getElementById('ventaInfo').style.display = 'none';
    }
}

function mostrarVenta(ventaID) {
    if (!ventaActual) return;
    
    const venta = ventaActual.venta;
    const detalle = ventaActual.detalle;
    
    document.getElementById('ventaFecha').textContent = new Date(venta.FechaVenta).toLocaleString('es-MX');
    document.getElementById('ventaTotal').textContent = formatMoney(venta.TotalVenta);
    document.getElementById('ventaCajero').textContent = venta.Cajero;
    
    const productosContainer = document.getElementById('ventaProductos');
    productosContainer.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Seleccionar</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                    <th>Cantidad a Devolver</th>
                </tr>
            </thead>
            <tbody>
                ${detalle.map((p, idx) => `
                    <tr>
                        <td><input type="checkbox" class="devolucion-check" data-index="${idx}"></td>
                        <td>${p.NombreProducto}</td>
                        <td>${p.Cantidad}</td>
                        <td>${formatMoney(p.PrecioUnitario)}</td>
                        <td>${formatMoney(p.Subtotal)}</td>
                        <td>
                            <input type="number" class="devolucion-cantidad" data-index="${idx}" 
                                min="1" max="${p.Cantidad}" value="${p.Cantidad}" disabled>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    document.getElementById('ventaInfo').style.display = 'block';
    
    // Event listeners para checkboxes
    document.querySelectorAll('.devolucion-check').forEach(check => {
        check.addEventListener('change', (e) => {
            const index = e.target.dataset.index;
            const cantidadInput = document.querySelector(`.devolucion-cantidad[data-index="${index}"]`);
            cantidadInput.disabled = !e.target.checked;
        });
    });
}

async function procesarDevolucion(e) {
    e.preventDefault();
    
    if (!ventaActual) {
        showNotification('Busque una venta primero', 'warning');
        return;
    }
    
    const motivo = document.getElementById('motivoDevolucion').value.trim();
    if (!motivo) {
        showNotification('Ingrese el motivo de la devolución', 'warning');
        return;
    }
    
    const productos = [];
    const checks = document.querySelectorAll('.devolucion-check:checked');
    
    if (checks.length === 0) {
        showNotification('Seleccione al menos un producto para devolver', 'warning');
        return;
    }
    
    checks.forEach(check => {
        const index = check.dataset.index;
        const cantidadInput = document.querySelector(`.devolucion-cantidad[data-index="${index}"]`);
        const cantidad = parseInt(cantidadInput.value);
        const producto = ventaActual.detalle[index];
        
        console.log('Producto para devolución:', producto); // DEBUG
        
        if (!producto.ProductoID) {
            console.error('ERROR: ProductoID no existe en el detalle', producto);
            showNotification('Error: Datos de producto incompletos', 'error');
            return;
        }
        
        productos.push({
            productoID: producto.ProductoID,
            cantidad
        });
    });
    
    console.log('Productos a devolver:', productos); // DEBUG
    
    const devolucion = {
        ventaID: parseInt(document.getElementById('ventaIDDevolucion').value),
        usuarioID: currentUser.id,
        motivo,
        productos
    };
    
    console.log('Devolucion completa:', devolucion); // DEBUG
    
    try {
        const response = await API.registrarDevolucion(devolucion);
        if (response.success) {
            showNotification('Devolución procesada exitosamente', 'success');
            document.getElementById('formDevolucion').reset();
            document.getElementById('ventaInfo').style.display = 'none';
            ventaActual = null;
        }
    } catch (error) {
        console.error('Error completo:', error); // DEBUG
        showNotification(error.message || 'Error procesando devolución', 'error');
    }
}