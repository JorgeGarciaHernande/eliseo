// =============================================
// SERVIDOR BACKEND - PUNTO DE VENTA
// Node.js + Express + SQL Server
// =============================================

const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configuración de SQL Server
const sqlConfig = {
    user: 'admin',
    password: '123456',
    server: 'localhost\\MSSQLSERVER02',
    database: 'PuntoVentaDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Pool de conexiones
let pool;

// Conectar a SQL Server al iniciar
async function connectDB() {
    try {
        pool = await sql.connect(sqlConfig);
        console.log('✅ Conectado a SQL Server - PuntoVentaDB');
    } catch (err) {
        console.error('❌ Error conectando a SQL Server:', err);
        process.exit(1);
    }
}

// =============================================
// RUTAS - AUTENTICACIÓN
// =============================================

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query(`
                SELECT UsuarioID, NombreUsuario, Nombre, Activo
                FROM Usuarios
                WHERE NombreUsuario = @username 
                AND Contraseña = @password
                AND Activo = 1
            `);
        
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            
            // Actualizar último acceso
            await pool.request()
                .input('usuarioID', sql.Int, user.UsuarioID)
                .query('UPDATE Usuarios SET UltimoAcceso = GETDATE() WHERE UsuarioID = @usuarioID');
            
            res.json({ 
                success: true, 
                user: {
                    id: user.UsuarioID,
                    username: user.NombreUsuario,
                    nombre: user.Nombre
                }
            });
        } else {
            res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// =============================================
// RUTAS - DASHBOARD
// =============================================

app.get('/api/dashboard', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT * FROM VW_DashboardDelDia');
        
        res.json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error('Error en dashboard:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo dashboard' });
    }
});

// =============================================
// RUTAS - PRODUCTOS
// =============================================

// Buscar productos
app.get('/api/productos/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        
        const result = await pool.request()
            .input('busqueda', sql.NVarChar, q || '')
            .query(`
                SELECT 
                    ProductoID, CodigoBarras, NombreProducto, 
                    NombreCategoria, StockActual, PrecioVenta, PrecioCosto
                FROM VW_InventarioCompleto
                WHERE Activo = 1
                AND (NombreProducto LIKE '%' + @busqueda + '%' 
                     OR CodigoBarras LIKE '%' + @busqueda + '%')
                ORDER BY NombreProducto
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error buscando productos:', err);
        res.status(500).json({ success: false, message: 'Error buscando productos' });
    }
});

// Obtener todos los productos activos
app.get('/api/productos', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT * FROM VW_InventarioCompleto WHERE Activo = 1 ORDER BY NombreProducto');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo productos:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo productos' });
    }
});

// Agregar producto
app.post('/api/productos', async (req, res) => {
    try {
        const { codigoBarras, nombre, descripcion, categoriaID, precioCosto, precioVenta, stockInicial, stockMinimo } = req.body;
        
        const result = await pool.request()
            .input('codigoBarras', sql.NVarChar, codigoBarras)
            .input('nombre', sql.NVarChar, nombre)
            .input('descripcion', sql.NVarChar, descripcion || null)
            .input('categoriaID', sql.Int, categoriaID)
            .input('precioCosto', sql.Decimal(10, 2), precioCosto)
            .input('precioVenta', sql.Decimal(10, 2), precioVenta)
            .input('stockInicial', sql.Decimal(10, 2), stockInicial || 0)
            .input('stockMinimo', sql.Decimal(10, 2), stockMinimo || 0)
            .query(`
                INSERT INTO Productos 
                (CodigoBarras, NombreProducto, Descripcion, CategoriaID, PrecioCosto, PrecioVenta, StockActual, StockMinimo)
                VALUES (@codigoBarras, @nombre, @descripcion, @categoriaID, @precioCosto, @precioVenta, @stockInicial, @stockMinimo);
                SELECT SCOPE_IDENTITY() AS ProductoID;
            `);
        
        res.json({ success: true, productoID: result.recordset[0].ProductoID });
    } catch (err) {
        console.error('Error agregando producto:', err);
        res.status(500).json({ success: false, message: 'Error agregando producto' });
    }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { codigoBarras, nombre, descripcion, categoriaID, precioCosto, precioVenta, stockActual, stockMinimo } = req.body;
        
        await pool.request()
            .input('productoID', sql.Int, id)
            .input('codigoBarras', sql.NVarChar, codigoBarras)
            .input('nombre', sql.NVarChar, nombre)
            .input('descripcion', sql.NVarChar, descripcion || null)
            .input('categoriaID', sql.Int, categoriaID)
            .input('precioCosto', sql.Decimal(10, 2), precioCosto)
            .input('precioVenta', sql.Decimal(10, 2), precioVenta)
            .input('stockActual', sql.Decimal(10, 2), stockActual)
            .input('stockMinimo', sql.Decimal(10, 2), stockMinimo)
            .query(`
                UPDATE Productos
                SET CodigoBarras = @codigoBarras,
                    NombreProducto = @nombre,
                    Descripcion = @descripcion,
                    CategoriaID = @categoriaID,
                    PrecioCosto = @precioCosto,
                    PrecioVenta = @precioVenta,
                    StockActual = @stockActual,
                    StockMinimo = @stockMinimo
                WHERE ProductoID = @productoID
            `);
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error actualizando producto:', err);
        res.status(500).json({ success: false, message: 'Error actualizando producto' });
    }
});

// Productos con stock bajo
app.get('/api/productos/stock-bajo', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT * FROM VW_ProductosStockBajo ORDER BY FaltaPorMinimo DESC');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo productos con stock bajo:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo productos' });
    }
});

// =============================================
// RUTAS - CATEGORÍAS
// =============================================

app.get('/api/categorias', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT CategoriaID, NombreCategoria FROM Categorias WHERE Activo = 1 ORDER BY NombreCategoria');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo categorías:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo categorías' });
    }
});

// =============================================
// RUTAS - VENTAS
// =============================================

// Registrar venta
app.post('/api/ventas', async (req, res) => {
    try {
        const { usuarioID, productos, formasPago } = req.body;
        
        const detalleVenta = JSON.stringify(productos.map(p => ({
            ProductoID: p.productoID,
            Cantidad: p.cantidad,
            PrecioUnitario: p.precioUnitario
        })));
        
        const formasPagoJSON = JSON.stringify(formasPago.map(fp => ({
            FormaPagoID: fp.formaPagoID,
            Monto: fp.monto
        })));
        
        const result = await pool.request()
            .input('usuarioID', sql.Int, usuarioID)
            .input('detalleVenta', sql.NVarChar, detalleVenta)
            .input('formasPago', sql.NVarChar, formasPagoJSON)
            .output('ventaID', sql.Int)
            .execute('SP_RegistrarVenta');
        
        res.json({ 
            success: true, 
            ventaID: result.output.ventaID,
            message: 'Venta registrada exitosamente'
        });
    } catch (err) {
        console.error('Error registrando venta:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message || 'Error registrando venta' 
        });
    }
});

// Obtener ventas del día
app.get('/api/ventas/hoy', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT * FROM VW_VentasDelDia ORDER BY FechaVenta DESC');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo ventas:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo ventas' });
    }
});

// Detalle de una venta
app.get('/api/ventas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const venta = await pool.request()
            .input('ventaID', sql.Int, id)
            .query(`
                SELECT V.VentaID, V.FechaVenta, V.TotalVenta, U.Nombre AS Cajero
                FROM Ventas V
                INNER JOIN Usuarios U ON V.UsuarioID = U.UsuarioID
                WHERE V.VentaID = @ventaID
            `);
        
        const detalle = await pool.request()
            .input('ventaID', sql.Int, id)
            .query(`
                SELECT P.NombreProducto, DV.Cantidad, DV.PrecioUnitario, DV.Subtotal
                FROM DetalleVentas DV
                INNER JOIN Productos P ON DV.ProductoID = P.ProductoID
                WHERE DV.VentaID = @ventaID
            `);
        
        const pagos = await pool.request()
            .input('ventaID', sql.Int, id)
            .query(`
                SELECT FP.NombreFormaPago, PV.Monto
                FROM PagosVentas PV
                INNER JOIN FormasPago FP ON PV.FormaPagoID = FP.FormaPagoID
                WHERE PV.VentaID = @ventaID
            `);
        
        res.json({ 
            success: true, 
            venta: venta.recordset[0],
            detalle: detalle.recordset,
            pagos: pagos.recordset
        });
    } catch (err) {
        console.error('Error obteniendo detalle de venta:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo detalle' });
    }
});

// =============================================
// RUTAS - FORMAS DE PAGO
// =============================================

app.get('/api/formas-pago', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT FormaPagoID, NombreFormaPago FROM FormasPago WHERE Activo = 1');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo formas de pago:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo formas de pago' });
    }
});

// =============================================
// RUTAS - COMPRAS
// =============================================

app.get('/api/proveedores', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT ProveedorID, NombreProveedor FROM Proveedores WHERE Activo = 1 ORDER BY NombreProveedor');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo proveedores:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo proveedores' });
    }
});

app.post('/api/compras', async (req, res) => {
    try {
        const { proveedorID, usuarioID, observaciones, productos } = req.body;
        
        const detalleCompra = JSON.stringify(productos.map(p => ({
            ProductoID: p.productoID,
            Cantidad: p.cantidad,
            PrecioCosto: p.precioCosto
        })));
        
        const result = await pool.request()
            .input('proveedorID', sql.Int, proveedorID)
            .input('usuarioID', sql.Int, usuarioID)
            .input('observaciones', sql.NVarChar, observaciones || null)
            .input('detalleCompra', sql.NVarChar, detalleCompra)
            .output('compraID', sql.Int)
            .execute('SP_RegistrarCompra');
        
        res.json({ 
            success: true, 
            compraID: result.output.compraID,
            message: 'Compra registrada exitosamente'
        });
    } catch (err) {
        console.error('Error registrando compra:', err);
        res.status(500).json({ success: false, message: 'Error registrando compra' });
    }
});

// =============================================
// RUTAS - DEVOLUCIONES
// =============================================

app.post('/api/devoluciones', async (req, res) => {
    try {
        const { ventaID, usuarioID, motivo, productos } = req.body;
        
        const detalleDevolucion = JSON.stringify(productos.map(p => ({
            ProductoID: p.productoID,
            Cantidad: p.cantidad
        })));
        
        const result = await pool.request()
            .input('ventaID', sql.Int, ventaID)
            .input('usuarioID', sql.Int, usuarioID)
            .input('motivoDevolucion', sql.NVarChar, motivo)
            .input('detalleDevolucion', sql.NVarChar, detalleDevolucion)
            .output('devolucionID', sql.Int)
            .execute('SP_RegistrarDevolucion');
        
        res.json({ 
            success: true, 
            devolucionID: result.output.devolucionID,
            message: 'Devolución registrada exitosamente'
        });
    } catch (err) {
        console.error('Error registrando devolución:', err);
        res.status(500).json({ success: false, message: err.message || 'Error registrando devolución' });
    }
});

// =============================================
// RUTAS - REPORTES
// =============================================

app.get('/api/reportes/productos-mas-vendidos', async (req, res) => {
    try {
        const result = await pool.request()
            .query('SELECT TOP 10 * FROM VW_ProductosMasVendidos ORDER BY TotalVendido DESC');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo productos más vendidos:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo reporte' });
    }
});

app.get('/api/reportes/inventario-valorizado', async (req, res) => {
    try {
        const result = await pool.request()
            .query(`
                SELECT 
                    NombreCategoria,
                    COUNT(*) AS TotalProductos,
                    SUM(StockActual) AS TotalUnidades,
                    SUM(ValorInventarioCosto) AS ValorTotalCosto,
                    SUM(ValorInventarioVenta) AS ValorTotalVenta
                FROM VW_InventarioCompleto
                WHERE Activo = 1
                GROUP BY NombreCategoria
                ORDER BY ValorTotalVenta DESC
            `);
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Error obteniendo inventario valorizado:', err);
        res.status(500).json({ success: false, message: 'Error obteniendo reporte' });
    }
});

// =============================================
// INICIAR SERVIDOR
// =============================================

connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n╔════════════════════════════════════════════════╗`);
        console.log(`║                                                ║`);
        console.log(`║    🚀 SERVIDOR PUNTO DE VENTA INICIADO       ║`);
        console.log(`║                                                ║`);
        console.log(`╚════════════════════════════════════════════════╝\n`);
        console.log(`📍 Servidor corriendo en: http://localhost:${PORT}`);
        console.log(`📊 Base de datos: PuntoVentaDB`);
        console.log(`✅ Listo para recibir peticiones\n`);
    });
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
    console.log('\n⏹️  Cerrando servidor...');
    await pool.close();
    process.exit(0);
});