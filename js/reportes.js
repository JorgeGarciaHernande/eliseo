// REPORTES
async function initReportes() {
    await cargarDashboard();
    await cargarTopProductos();
    await cargarAlertasStock();
    await cargarVentasHoy();
}

async function cargarDashboard() {
    const response = await API.getDashboard();
    if (response.success && response.data) {
        const data = response.data;
        document.getElementById('statVentas').textContent = data.TotalVentas || 0;
        document.getElementById('statMontoVentas').textContent = formatMoney(data.MontoVentas || 0);
        document.getElementById('statCompras').textContent = data.TotalCompras || 0;
        document.getElementById('statStockBajo').textContent = data.ProductosStockBajo || 0;
    }
}

async function cargarTopProductos() {
    const response = await API.getProductosMasVendidos();
    const container = document.getElementById('topProductos');
    
    if (response.success && response.data.length > 0) {
        container.innerHTML = response.data.slice(0, 5).map((p, idx) => `
            <div class="stat-item">
                <span>${idx + 1}. ${p.NombreProducto}</span>
                <span>${p.TotalVendido} unidades</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p style="text-align:center;color:#999;">No hay datos disponibles</p>';
    }
}

async function cargarAlertasStock() {
    const response = await API.getProductosStockBajo();
    const container = document.getElementById('alertasStock');
    
    if (response.success && response.data.length > 0) {
        container.innerHTML = response.data.slice(0, 5).map(p => `
            <div class="stat-item">
                <span>${p.NombreProducto}</span>
                <span class="text-danger">Stock: ${p.StockActual}</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p style="text-align:center;color:#999;">No hay alertas de stock</p>';
    }
}

async function cargarVentasHoy() {
    const response = await API.getVentasHoy();
    const tbody = document.getElementById('ventasHoyTable');
    
    if (response.success && response.data.length > 0) {
        tbody.innerHTML = response.data.map(v => `
            <tr>
                <td>${v.VentaID}</td>
                <td>${new Date(v.FechaVenta).toLocaleString('es-MX')}</td>
                <td>${formatMoney(v.TotalVenta)}</td>
                <td>${v.TotalArticulos}</td>
                <td>${v.NombreCajero}</td>
                <td>
                    <button class="btn btn-secondary" onclick="verDetalleVenta(${v.VentaID})">Ver</button>
                </td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay ventas hoy</td></tr>';
    }
}

async function verDetalleVenta(ventaID) {
    const response = await API.getDetalleVenta(ventaID);
    if (response.success) {
        alert(`Venta #${ventaID}\n\nProductos:\n${response.detalle.map(d => 
            `${d.NombreProducto}: ${d.Cantidad} x ${formatMoney(d.PrecioUnitario)} = ${formatMoney(d.Subtotal)}`
        ).join('\n')}\n\nTotal: ${formatMoney(response.venta.TotalVenta)}`);
    }
}