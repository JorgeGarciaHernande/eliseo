// =============================================
// API - COMUNICACIÓN CON EL BACKEND
// =============================================

const API_URL = 'http://localhost:3000/api';

class API {
    // Realizar petición HTTP
    static async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error en la petición:', error);
            throw error;
        }
    }

    // AUTH
    static async login(username, password) {
        return this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    // DASHBOARD
    static async getDashboard() {
        return this.request('/dashboard');
    }

    // PRODUCTOS
    static async buscarProductos(query) {
        return this.request(`/productos/buscar?q=${encodeURIComponent(query)}`);
    }

    static async getProductos() {
        return this.request('/productos');
    }

    static async agregarProducto(producto) {
        return this.request('/productos', {
            method: 'POST',
            body: JSON.stringify(producto)
        });
    }

    static async actualizarProducto(id, producto) {
        return this.request(`/productos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(producto)
        });
    }

    static async getProductosStockBajo() {
        return this.request('/productos/stock-bajo');
    }

    // CATEGORÍAS
    static async getCategorias() {
        return this.request('/categorias');
    }

    // VENTAS
    static async registrarVenta(venta) {
        return this.request('/ventas', {
            method: 'POST',
            body: JSON.stringify(venta)
        });
    }

    static async getVentasHoy() {
        return this.request('/ventas/hoy');
    }

    static async getDetalleVenta(id) {
        return this.request(`/ventas/${id}`);
    }

    // FORMAS DE PAGO
    static async getFormasPago() {
        return this.request('/formas-pago');
    }

    // COMPRAS
    static async getProveedores() {
        return this.request('/proveedores');
    }

    static async registrarCompra(compra) {
        return this.request('/compras', {
            method: 'POST',
            body: JSON.stringify(compra)
        });
    }

    // DEVOLUCIONES
    static async registrarDevolucion(devolucion) {
        return this.request('/devoluciones', {
            method: 'POST',
            body: JSON.stringify(devolucion)
        });
    }

    // REPORTES
    static async getProductosMasVendidos() {
        return this.request('/reportes/productos-mas-vendidos');
    }

    static async getInventarioValorizado() {
        return this.request('/reportes/inventario-valorizado');
    }
}
