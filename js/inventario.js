// INVENTARIO
let productos = [];
let categorias = [];

async function initInventario() {
    await cargarCategorias();
    await cargarInventario();
    setupInventarioEvents();
}

async function cargarCategorias() {
    const response = await API.getCategorias();
    if (response.success) {
        categorias = response.data;
        const select = document.getElementById('productoCategoria');
        if (select) {
            select.innerHTML = '<option value="">Seleccione</option>' + 
                categorias.map(c => `<option value="${c.CategoriaID}">${c.NombreCategoria}</option>`).join('');
        }
    }
}

async function cargarInventario(query = '') {
    const response = query ? await API.buscarProductos(query) : await API.getProductos();
    if (response.success) {
        productos = response.data;
        renderInventario();
    }
}

function renderInventario() {
    const tbody = document.getElementById('inventarioTable');
    if (!tbody) return;
    
    if (productos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No hay productos en el inventario</td></tr>';
        return;
    }
    
    tbody.innerHTML = productos.map(p => `
        <tr>
            <td>${p.CodigoBarras}</td>
            <td>${p.NombreProducto}</td>
            <td>${p.NombreCategoria}</td>
            <td>${p.StockActual}</td>
            <td>${formatMoney(p.PrecioCosto)}</td>
            <td>${formatMoney(p.PrecioVenta)}</td>
            <td>
                <button class="btn btn-secondary" onclick="editarProducto(${p.ProductoID})">Editar</button>
            </td>
        </tr>
    `).join('');
}

function setupInventarioEvents() {
    const btnNuevo = document.getElementById('btnNuevoProducto');
    if (btnNuevo) {
        btnNuevo.addEventListener('click', () => {
            abrirModalProducto();
        });
    }
    
    const searchInput = document.getElementById('searchInventario');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            cargarInventario(e.target.value);
        });
    }
    
    const formProducto = document.getElementById('formProducto');
    if (formProducto) {
        formProducto.addEventListener('submit', guardarProducto);
    }
    
    const modalCloses = document.querySelectorAll('.modal-close');
    modalCloses.forEach(btn => {
        btn.addEventListener('click', cerrarModalProducto);
    });
}

function abrirModalProducto(productoID = null) {
    const modal = document.getElementById('modalProducto');
    const form = document.getElementById('formProducto');
    
    if (productoID) {
        const producto = productos.find(p => p.ProductoID === productoID);
        if (producto) {
            document.getElementById('modalProductoTitle').textContent = 'Editar Producto';
            document.getElementById('productoCodigoBarras').value = producto.CodigoBarras;
            document.getElementById('productoNombre').value = producto.NombreProducto;
            document.getElementById('productoDescripcion').value = producto.Descripcion || '';
            document.getElementById('productoCategoria').value = producto.CategoriaID;
            document.getElementById('productoPrecioCosto').value = producto.PrecioCosto;
            document.getElementById('productoPrecioVenta').value = producto.PrecioVenta;
            document.getElementById('productoStockInicial').value = producto.StockActual;
            document.getElementById('productoStockMinimo').value = producto.StockMinimo;
            form.dataset.productoId = productoID;
        }
    } else {
        document.getElementById('modalProductoTitle').textContent = 'Nuevo Producto';
        form.reset();
        delete form.dataset.productoId;
    }
    
    modal.classList.add('active');
}

function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    modal.classList.remove('active');
}

function editarProducto(productoID) {
    abrirModalProducto(productoID);
}

async function guardarProducto(e) {
    e.preventDefault();
    
    const form = e.target;
    const productoID = form.dataset.productoId;
    
    const producto = {
        codigoBarras: document.getElementById('productoCodigoBarras').value,
        nombre: document.getElementById('productoNombre').value,
        descripcion: document.getElementById('productoDescripcion').value,
        categoriaID: parseInt(document.getElementById('productoCategoria').value),
        precioCosto: parseFloat(document.getElementById('productoPrecioCosto').value),
        precioVenta: parseFloat(document.getElementById('productoPrecioVenta').value),
        stockInicial: parseFloat(document.getElementById('productoStockInicial').value),
        stockMinimo: parseFloat(document.getElementById('productoStockMinimo').value)
    };
    
    try {
        let response;
        if (productoID) {
            producto.stockActual = producto.stockInicial;
            response = await API.actualizarProducto(productoID, producto);
        } else {
            response = await API.agregarProducto(producto);
        }
        
        if (response.success) {
            showNotification(productoID ? 'Producto actualizado' : 'Producto agregado', 'success');
            cerrarModalProducto();
            cargarInventario();
        }
    } catch (error) {
        showNotification('Error guardando producto', 'error');
    }
}