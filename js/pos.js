// PUNTO DE VENTA
let cart = [];
let formasPagoDisponibles = [];
let selectedFormaPago = null;

async function initPOS() {
    await cargarProductos();
    await cargarFormasPago();
    setupPOSEvents();
}

async function cargarProductos(query = '') {
    const response = await API.buscarProductos(query);
    if (response.success) {
        renderProductos(response.data);
    }
}

function renderProductos(productos) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = productos.map(p => `
        <div class="product-card" onclick="agregarAlCarrito(${p.ProductoID}, '${p.NombreProducto}', ${p.PrecioVenta}, ${p.StockActual})">
            <h4>${p.NombreProducto}</h4>
            <div class="price">${formatMoney(p.PrecioVenta)}</div>
            <div class="stock">Stock: ${p.StockActual}</div>
        </div>
    `).join('');
}

function agregarAlCarrito(id, nombre, precio, stock) {
    const existing = cart.find(item => item.productoID === id);
    if (existing) {
        if (existing.cantidad < stock) {
            existing.cantidad++;
        } else {
            showNotification('Stock insuficiente', 'warning');
            return;
        }
    } else {
        cart.push({
            productoID: id,
            nombre,
            precioUnitario: precio,
            cantidad: 1
        });
    }
    renderCarrito();
}

function renderCarrito() {
    const container = document.getElementById('cartItems');
    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty">No hay productos en el carrito</p>';
        document.getElementById('cartTotal').textContent = '$0.00';
        return;
    }
    
    container.innerHTML = cart.map((item, idx) => `
        <div class="cart-item">
            <div class="cart-item-info">
                <h5>${item.nombre}</h5>
                <p>${formatMoney(item.precioUnitario)} x ${item.cantidad}</p>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="cambiarCantidad(${idx}, -1)">-</button>
                <span>${item.cantidad}</span>
                <button class="qty-btn" onclick="cambiarCantidad(${idx}, 1)">+</button>
            </div>
            <button class="cart-item-remove" onclick="eliminarDelCarrito(${idx})">✕</button>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);
    document.getElementById('cartTotal').textContent = formatMoney(total);
}

function cambiarCantidad(idx, delta) {
    cart[idx].cantidad += delta;
    if (cart[idx].cantidad <= 0) {
        cart.splice(idx, 1);
    }
    renderCarrito();
}

function eliminarDelCarrito(idx) {
    cart.splice(idx, 1);
    renderCarrito();
}

async function cargarFormasPago() {
    const response = await API.getFormasPago();
    if (response.success) {
        formasPagoDisponibles = response.data;
        renderFormasPago();
    }
}

function renderFormasPago() {
    const container = document.getElementById('paymentOptions');
    container.innerHTML = formasPagoDisponibles.map(fp => `
        <div class="payment-option" onclick="seleccionarFormaPago(${fp.FormaPagoID})">
            ${fp.NombreFormaPago}
        </div>
    `).join('');
}

function seleccionarFormaPago(id) {
    selectedFormaPago = id;
    document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
    event.target.classList.add('active');
}

function setupPOSEvents() {
    document.getElementById('searchProduct').addEventListener('input', (e) => {
        cargarProductos(e.target.value);
    });
    
    document.getElementById('montoRecibido').addEventListener('input', calcularCambio);
    document.getElementById('btnClearCart').addEventListener('click', limpiarCarrito);
    document.getElementById('btnFinalizarVenta').addEventListener('click', finalizarVenta);
}

function calcularCambio() {
    const total = cart.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);
    const recibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    const cambio = recibido - total;
    document.getElementById('cambioAmount').textContent = formatMoney(Math.max(0, cambio));
}

function limpiarCarrito() {
    cart = [];
    renderCarrito();
    document.getElementById('montoRecibido').value = '';
    document.getElementById('cambioAmount').textContent = '$0.00';
}

async function finalizarVenta() {
    if (cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }
    
    if (!selectedFormaPago) {
        showNotification('Seleccione una forma de pago', 'warning');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.precioUnitario * item.cantidad), 0);
    const recibido = parseFloat(document.getElementById('montoRecibido').value) || 0;
    
    if (recibido < total) {
        showNotification('Monto insuficiente', 'warning');
        return;
    }
    
    const venta = {
        usuarioID: currentUser.id,
        productos: cart,
        formasPago: [{ formaPagoID: selectedFormaPago, monto: total }]
    };
    
    try {
        const response = await API.registrarVenta(venta);
        if (response.success) {
            showNotification('Venta registrada exitosamente', 'success');
            generarTicketPDF(response.ventaID, cart, total, recibido);
            limpiarCarrito();
        }
    } catch (error) {
        showNotification('Error registrando venta', 'error');
    }
}

function generarTicketPDF(ventaID, items, total, recibido) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: [80, 200] });
    
    doc.setFontSize(12);
    doc.text('TICKET DE VENTA', 10, 10);
    doc.setFontSize(8);
    doc.text(`Venta #${ventaID}`, 10, 20);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 25);
    doc.text('----------------------------', 10, 30);
    
    let y = 35;
    items.forEach(item => {
        doc.text(`${item.nombre}`, 10, y);
        doc.text(`${item.cantidad} x ${formatMoney(item.precioUnitario)}`, 10, y + 5);
        y += 10;
    });
    
    doc.text('----------------------------', 10, y);
    doc.setFontSize(10);
    doc.text(`TOTAL: ${formatMoney(total)}`, 10, y + 10);
    doc.text(`Recibido: ${formatMoney(recibido)}`, 10, y + 15);
    doc.text(`Cambio: ${formatMoney(recibido - total)}`, 10, y + 20);
    
    doc.save(`ticket-${ventaID}.pdf`);
}
