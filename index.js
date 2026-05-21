require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const SCHEMA = process.env.SCHEMA_NAME || 'public';

// Configura la URL con search_path a nivel de conexion PostgreSQL
let dbUrl = process.env.DATABASE_URL || "postgresql://postgres:OXIMEDIC2026@db.fhgoutlylsjpcukawzmn.supabase.co:5432/postgres";
if (SCHEMA !== 'public') {
  dbUrl += `?options=-csearch_path%3D${SCHEMA}`;
}

const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
});

async function iniciarServidor() {
  try {
    const resultado = await pool.query('SELECT current_setting(\'search_path\') AS sp');
    console.log(`[SISTEMA] Conectado a Supabase. Schema activo: ${resultado.rows[0].sp}`);
    app.listen(process.env.PORT || 3000, () => console.log(`Servidor ${process.env.EMPRESA_NOMBRE || 'OXIMEDIC'} corriendo en puerto ${process.env.PORT || 3000}...`));
  } catch (error) { console.error('[ERROR CRITICO] Conexion Supabase: ', error); }
}

app.get('/', (req, res) => res.send(`Servidor ${process.env.EMPRESA_NOMBRE || 'OXIMEDIC'} operativo.`));

// Nombre de la empresa
app.get('/api/empresa', (req, res) => {
  res.json({ nombre: process.env.EMPRESA_NOMBRE || 'OXIMEDIC' });
});

// =======================================================
// CLIENTES (Directorio y Memoria de Cliente Frecuente)
// =======================================================
app.get('/api/clientes-reporte', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT Carnet_Identidad AS "CI", Nombre AS "NOMBRE", Apellido AS "APELLIDO", Telefono AS "TELEFONO", Direccion AS "DIRECCION", Tipo_Cliente AS "TIPO_CLIENTE" FROM Clientes ORDER BY Apellido, Nombre`);
    res.json({ exito: true, clientes: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/clientes/filtrados', async (req, res) => {
  const { tipo } = req.query;
  try {
    const resultado = await pool.query(`SELECT Carnet_Identidad AS "CI", Nombre AS "NOMBRE", Apellido AS "APELLIDO", Telefono AS "TELEFONO", Direccion AS "DIRECCION", Tipo_Cliente AS "TIPO_CLIENTE", Tiene_Descuento AS "TIENE_DESCUENTO", Monto_Descuento AS "MONTO_DESCUENTO" FROM Clientes WHERE Tipo_Cliente = $1 ORDER BY Nombre`, [tipo]);
    res.json({ exito: true, clientes: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/clientes/buscar/:ci', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT Carnet_Identidad, Nombre, Apellido, Telefono, Direccion, Tipo_Cliente FROM Clientes WHERE Carnet_Identidad = $1`, [req.params.ci]);
    if (resultado.rows.length > 0) res.json({ exito: true, cliente: resultado.rows[0] });
    else res.json({ exito: false, mensaje: 'Cliente no encontrado' });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// Busca el ultimo servicio para ayudar al empleado con los precios
app.get('/api/clientes/ultimo-servicio/:ci', async (req, res) => {
  try {
    const recarga = await pool.query(`SELECT Categoria AS "categoria", Costo::text AS "costo", Fecha_Recarga AS "fecha" FROM Recargas WHERE Cliente_CI = $1 ORDER BY Fecha_Recarga DESC LIMIT 1`, [req.params.ci]);
    const cliente = await pool.query(`SELECT Tiene_Descuento AS "tiene_descuento", Monto_Descuento AS "monto_descuento" FROM Clientes WHERE Carnet_Identidad = $1`, [req.params.ci]);
    res.json({ 
      exito: true, 
      ultimaRecarga: recarga.rows.length > 0 ? recarga.rows[0] : null,
      preferenciaCliente: cliente.rows.length > 0 ? cliente.rows[0] : null
    });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.put('/api/clientes/actualizar/:ci', async (req, res) => {
  const { nombre, apellido, telefono, direccion } = req.body;
  try {
    await pool.query(`UPDATE Clientes SET Nombre = $1, Apellido = $2, Telefono = $3, Direccion = $4 WHERE Carnet_Identidad = $5`, [nombre, apellido, telefono, direccion, req.params.ci]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// Actualizar preferencias de descuento de cliente
app.put('/api/clientes/descuento/:ci', async (req, res) => {
  const { tiene_descuento, monto_descuento } = req.body;
  try {
    await pool.query(`UPDATE Clientes SET Tiene_Descuento = $1, Monto_Descuento = $2 WHERE Carnet_Identidad = $3`, [tiene_descuento, monto_descuento, req.params.ci]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false, error: error.message }); }
});

// =======================================================
// USUARIOS Y LOGIN
// =======================================================

// =======================================================
// CONTROL DE TURNOS
// =======================================================
app.get('/api/turnos/estado', async (req, res) => {
  const { id_usuario } = req.query;
  try {
    const result = await pool.query(`SELECT * FROM Turnos WHERE ID_Usuario = $1 AND Estado = 'ABIERTO'`, [id_usuario]);
    if (result.rows.length > 0) res.json({ exito: true, turno: result.rows[0] });
    else res.json({ exito: true, turno: null });
  } catch (err) { res.status(500).json({ exito: false }); }
});

app.post('/api/turnos/abrir', async (req, res) => {
  const { id_usuario } = req.body;
  try {
    await pool.query(`INSERT INTO Turnos (ID_Usuario, Estado) VALUES ($1, 'ABIERTO')`, [id_usuario]);
    res.json({ exito: true });
  } catch (err) { res.status(500).json({ exito: false }); }
});

app.post('/api/turnos/cerrar', async (req, res) => {
  const { id_usuario } = req.body;
  try {
    await pool.query(`UPDATE Turnos SET Estado = 'CERRADO', Fecha_Cierre = CURRENT_TIMESTAMP WHERE ID_Usuario = $1 AND Estado = 'ABIERTO'`, [id_usuario]);
    res.json({ exito: true });
  } catch (err) { res.status(500).json({ exito: false }); }
});

app.post('/api/login', async (req, res) => {
  const { usuario, contrasena } = req.body;
  try {
    const resultado = await pool.query(`SELECT ID_Usuario AS "ID_USUARIO", Nombre_Completo AS "NOMBRE_COMPLETO", Rol AS "ROL" FROM Usuarios WHERE LOWER(TRIM(Usuario)) = LOWER(TRIM($1)) AND TRIM(Contrasena) = TRIM($2)`, [usuario, contrasena]);
    if (resultado.rows.length > 0) res.status(200).json({ exito: true, mensaje: 'Acceso concedido', usuario: resultado.rows[0] });
    else res.status(401).json({ exito: false, mensaje: 'Credenciales invalidas' });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/usuarios', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ID_Usuario AS "ID_USUARIO", Nombre_Completo AS "NOMBRE_COMPLETO", Usuario AS "USUARIO", Rol AS "ROL", Estado AS "ESTADO" FROM Usuarios WHERE Usuario != 'admin' ORDER BY Rol, Nombre_Completo`);
    res.json({ exito: true, usuarios: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// Lista de usuarios activos (para selector de reportes)
app.get('/api/usuarios/lista', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ID_Usuario AS "ID_USUARIO", Nombre_Completo AS "NOMBRE_COMPLETO" FROM Usuarios WHERE Estado = 'ACTIVO' ORDER BY Nombre_Completo`);
    res.json({ exito: true, usuarios: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.post('/api/usuarios', async (req, res) => {
  const { nombre, usuario, rol, contrasena, palabraSeguridad } = req.body;
  try {
    await pool.query(`INSERT INTO Usuarios (Nombre_Completo, Usuario, Contrasena, Rol, Estado, Palabra_Seguridad) VALUES ($1, $2, $3, $4, 'ACTIVO', $5)`, [nombre, usuario, contrasena, rol, palabraSeguridad || null]);
    res.status(201).json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const check = await pool.query(`SELECT Usuario FROM Usuarios WHERE ID_Usuario = $1`, [req.params.id]);
    if (check.rows.length > 0 && check.rows[0].usuario === 'admin') {
      return res.status(403).json({ exito: false, mensaje: 'No se puede eliminar la cuenta principal' });
    }
    await pool.query(`DELETE FROM Usuarios WHERE ID_Usuario = $1`, [req.params.id]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.put('/api/usuarios/:id/password', async (req, res) => {
  try {
    await pool.query(`UPDATE Usuarios SET Contrasena = $1 WHERE ID_Usuario = $2`, [req.body.nuevaContrasena, req.params.id]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// Recuperar contrasena con palabra de seguridad
app.post('/api/usuarios/recuperar', async (req, res) => {
  const { usuario, palabraSeguridad, nuevaContrasena } = req.body;
  try {
    const resultado = await pool.query(`SELECT ID_Usuario FROM Usuarios WHERE LOWER(TRIM(Usuario)) = LOWER(TRIM($1)) AND TRIM(Palabra_Seguridad) = TRIM($2)`, [usuario, palabraSeguridad]);
    if (resultado.rows.length > 0) {
      await pool.query(`UPDATE Usuarios SET Contrasena = $1 WHERE ID_Usuario = $2`, [nuevaContrasena, resultado.rows[0].id_usuario]);
      res.json({ exito: true, mensaje: 'Contrasena actualizada correctamente' });
    } else {
      res.status(401).json({ exito: false, mensaje: 'Usuario o palabra de seguridad incorrectos' });
    }
  } catch (error) { res.status(500).json({ exito: false, mensaje: 'Error del servidor' }); }
});

// =======================================================
// INVENTARIO GENERAL Y PRODUCTOS
// =======================================================
app.get('/api/productos', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ID_Producto AS "ID_PRODUCTO", Nombre_Producto AS "NOMBRE_PRODUCTO", Categoria AS "CATEGORIA", Stock_Disponible AS "STOCK_DISPONIBLE", Precio AS "PRECIO", Estado AS "ESTADO", es_alquiler FROM Productos WHERE Estado = 'ACTIVO' AND (es_alquiler = FALSE OR es_alquiler IS NULL)`);
    res.json({ exito: true, productos: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/productos-alquiler', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ID_Producto AS "ID_PRODUCTO", Nombre_Producto AS "NOMBRE_PRODUCTO", Categoria AS "CATEGORIA", Stock_Disponible AS "STOCK_DISPONIBLE", Precio AS "PRECIO", Estado AS "ESTADO" FROM Productos WHERE Estado = 'ACTIVO' AND es_alquiler = TRUE`);
    res.json({ exito: true, productos: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/inventario-general', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT ID_Producto AS "ID_PRODUCTO", Nombre_Producto AS "NOMBRE_PRODUCTO", Categoria AS "CATEGORIA", Stock_Disponible AS "STOCK_DISPONIBLE", Precio AS "PRECIO", Estado AS "ESTADO", es_alquiler FROM Productos WHERE Estado = 'ACTIVO' ORDER BY Nombre_Producto`);
    res.json({ exito: true, productos: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.post('/api/productos', async (req, res) => {
  const { nombre, categoria, precio, stock, es_alquiler } = req.body;
  try {
    await pool.query(`INSERT INTO Productos (Nombre_Producto, Categoria, Precio, Stock_Disponible, es_alquiler) VALUES ($1, $2, $3, $4, $5)`, [nombre, categoria, precio, stock, es_alquiler || false]);
    res.status(201).json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// Actualizar producto existente
app.put('/api/productos/:id', async (req, res) => {
  const { categoria, precio, stock, es_alquiler } = req.body;
  try {
    await pool.query(`UPDATE Productos SET Categoria = $1, Precio = $2, Stock_Disponible = $3, es_alquiler = $4 WHERE ID_Producto = $5`, [categoria, precio, stock, es_alquiler || false, req.params.id]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.delete('/api/productos/:id', async (req, res) => {
  const { cantidad } = req.query;
  try {
    if (cantidad === 'todos') { await pool.query(`UPDATE Productos SET Estado = 'INACTIVO', Stock_Disponible = 0 WHERE ID_Producto = $1`, [req.params.id]); } 
    else { await pool.query(`UPDATE Productos SET Stock_Disponible = GREATEST(Stock_Disponible - $1, 0) WHERE ID_Producto = $2`, [parseInt(cantidad, 10) || 1, req.params.id]); }
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// =======================================================
// TRANSACCIONES: RECARGAS, VENTAS, ALQUILERES
// =======================================================
app.post('/api/recargas', async (req, res) => {
  const { id_usuario, nombre_botellon, categoria, costo, cliente_ci, cliente_nombre, cliente_telefono, cliente_direccion } = req.body;
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}`);
    await client.query('BEGIN');
    const serviceRes = await client.query('SELECT COALESCE(MAX(Nro_Servicio), 0) + 1 AS next FROM Recargas');
    const nroServicio = serviceRes.rows[0].next;

    if (cliente_ci && cliente_ci.trim() !== '') {
      const checkCl = await client.query('SELECT ID_Cliente FROM Clientes WHERE Carnet_Identidad = $1', [cliente_ci]);
      if (checkCl.rows.length === 0) {
        await client.query(`INSERT INTO Clientes (Carnet_Identidad, Nombre, Telefono, Direccion, Tipo_Cliente) VALUES ($1, $2, $3, $4, 'RECARGA')`, [cliente_ci, cliente_nombre, cliente_telefono || '', cliente_direccion || '']);
      } else {
        await client.query(`UPDATE Clientes SET Nombre = $1, Tipo_Cliente = 'RECARGA' WHERE Carnet_Identidad = $2`, [cliente_nombre, cliente_ci]);
      }
    }

    await client.query(
      `INSERT INTO Recargas (ID_Usuario, Nombre_Botellon, Categoria, Costo, Nro_Servicio, Cliente_CI, Cliente_Nombre, Cliente_Telefono, Cliente_Direccion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id_usuario, nombre_botellon, categoria, costo, nroServicio, cliente_ci || 'Anonimo', cliente_nombre || 'Cliente Ocasional', cliente_telefono || '', cliente_direccion || '']
    );

    await client.query('COMMIT');
    res.status(201).json({ exito: true, nro_servicio: nroServicio });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false });
  } finally { client.release(); }
});

app.post('/api/ventas', async (req, res) => {
  const { id_usuario, total, carrito, cliente_ci, cliente_nombre, cliente_telefono } = req.body;
  const client = await pool.connect(); 
  try {
    await client.query(`SET search_path TO ${SCHEMA}`);
    await client.query('BEGIN');
    const serviceRes = await client.query('SELECT COALESCE(MAX(nro_servicio), 0) + 1 AS next FROM Ventas');
    const nroServicio = serviceRes.rows[0].next;

    if (cliente_ci && cliente_ci.trim() !== '') {
      const checkCl = await client.query('SELECT ID_Cliente FROM Clientes WHERE Carnet_Identidad = $1', [cliente_ci]);
      if (checkCl.rows.length === 0) { 
        await client.query(`INSERT INTO Clientes (Carnet_Identidad, Nombre, Telefono, Tipo_Cliente) VALUES ($1, $2, $3, 'GENERAL')`, [cliente_ci, cliente_nombre, cliente_telefono || '']); 
      }
    }

    const resultVenta = await client.query(`INSERT INTO Ventas (ID_Usuario, Total_Venta, nro_servicio, cliente_ci, cliente_nombre, cliente_telefono) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ID_Venta AS "ID_VENTA"`, [id_usuario, total, nroServicio, cliente_ci, cliente_nombre, cliente_telefono]);
    const idVenta = resultVenta.rows[0].ID_VENTA;

    for (let item of carrito) {
      await client.query(`INSERT INTO Detalle_Ventas (ID_Venta, ID_Producto, Cantidad, Precio_Unitario, Subtotal) VALUES ($1, $2, $3, $4, $5)`, [idVenta, item.ID_PRODUCTO, item.CANTIDAD, item.PRECIO_FINAL, item.PRECIO_FINAL * item.CANTIDAD]);
      await client.query(`UPDATE Productos SET Stock_Disponible = Stock_Disponible - $1 WHERE ID_Producto = $2`, [item.CANTIDAD, item.ID_PRODUCTO]);
    }
    await client.query('COMMIT');
    res.status(201).json({ exito: true, id_venta: idVenta, nro_servicio: nroServicio });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false });
  } finally { client.release(); }
});

app.post('/api/alquileres', async (req, res) => {
  const { carnet, nombre, apellido, celular, direccion, id_producto, id_usuario, costo_dia, monto_garantia, estado_botellon, fecha_prevista } = req.body;
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}`);
    await client.query('BEGIN');
    const serviceRes = await client.query('SELECT COALESCE(MAX(nro_servicio), 0) + 1 AS next FROM Alquileres');
    const nroServicio = serviceRes.rows[0].next;

    let idCliente;
    const busquedaCliente = await client.query(`SELECT ID_Cliente AS "ID_CLIENTE" FROM Clientes WHERE Carnet_Identidad = $1`, [carnet]);
    if (busquedaCliente.rows.length > 0) {
      idCliente = busquedaCliente.rows[0].ID_CLIENTE;
      await client.query(`UPDATE Clientes SET Tipo_Cliente = 'ALQUILER' WHERE ID_Cliente = $1`, [idCliente]);
    } else {
      const nuevoCliente = await client.query(`INSERT INTO Clientes (Carnet_Identidad, Nombre, Apellido, Telefono, Direccion, Tipo_Cliente) VALUES ($1, $2, $3, $4, $5, 'ALQUILER') RETURNING ID_Cliente AS "ID_CLIENTE"`, [carnet, nombre, apellido, celular, direccion]);
      idCliente = nuevoCliente.rows[0].ID_CLIENTE;
    }

    await client.query(`INSERT INTO Alquileres (ID_Cliente, ID_Producto, ID_Usuario, Costo_Por_Dia, Monto_Garantia, Estado_Botellon, Fecha_Prevista, Estado_Alquiler, Fecha_Salida, nro_servicio) VALUES ($1, $2, $3, $4, $5, $6, $7::date, 'PRESTADO', CURRENT_TIMESTAMP, $8)`, [idCliente, id_producto, id_usuario, costo_dia, monto_garantia, estado_botellon, fecha_prevista || null, nroServicio]);
    await client.query(`UPDATE Productos SET Stock_Disponible = Stock_Disponible - 1 WHERE ID_Producto = $1`, [id_producto]);
    await client.query('COMMIT');
    res.status(201).json({ exito: true, nro_servicio: nroServicio });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false });
  } finally { client.release(); }
});

app.post('/api/alquileres/devolver', async (req, res) => {
  const { id_alquiler, id_producto, id_usuario } = req.body;
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}`);
    await client.query('BEGIN');
    await client.query(`UPDATE Alquileres SET Estado_Alquiler = 'DEVUELTO', Fecha_Devolucion_Real = CURRENT_TIMESTAMP, ID_Usuario_Recibe = $1 WHERE ID_Alquiler = $2`, [id_usuario, id_alquiler]);
    await client.query(`UPDATE Productos SET Stock_Disponible = Stock_Disponible + 1 WHERE ID_Producto = $1`, [id_producto]);
    await client.query('COMMIT');
    res.json({ exito: true });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false });
  } finally { client.release(); }
});

app.get('/api/alquileres/activos', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT a.ID_Alquiler AS "ID_ALQUILER", c.Carnet_Identidad AS "CARNET_IDENTIDAD", c.Nombre AS "NOMBRE", c.Apellido AS "APELLIDO", p.ID_Producto AS "ID_PRODUCTO", p.Nombre_Producto AS "NOMBRE_PRODUCTO", a.nro_servicio AS "NRO_SERVICIO", a.Fecha_Salida AS "FECHA_SALIDA", a.Costo_Por_Dia AS "COSTO_POR_DIA", a.Monto_Garantia AS "MONTO_GARANTIA", a.Estado_Botellon AS "ESTADO_BOTELLON", a.Fecha_Prevista AS "FECHA_PREVISTA", c.Telefono AS "TELEFONO", c.Direccion AS "DIRECCION" FROM Alquileres a JOIN Clientes c ON a.ID_Cliente = c.ID_Cliente JOIN Productos p ON a.ID_Producto = p.ID_Producto WHERE a.Estado_Alquiler = 'PRESTADO' ORDER BY a.Fecha_Salida DESC`);
    res.json({ exito: true, activos: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/historial-alquileres', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT a.ID_Alquiler AS "ID_ALQUILER", c.Carnet_Identidad AS "CARNET_IDENTIDAD", c.Nombre AS "NOMBRE", c.Apellido AS "APELLIDO", p.ID_Producto AS "ID_PRODUCTO", p.Nombre_Producto AS "NOMBRE_PRODUCTO", a.Fecha_Salida AS "FECHA_SALIDA", a.Fecha_Devolucion_Real AS "FECHA_DEVOLUCION_REAL", a.Costo_Por_Dia AS "COSTO_POR_DIA", a.Monto_Garantia AS "MONTO_GARANTIA", a.Estado_Botellon AS "ESTADO_BOTELLON", a.Fecha_Prevista AS "FECHA_PREVISTA", c.Telefono AS "TELEFONO", c.Direccion AS "DIRECCION", a.Estado_Alquiler AS "ESTADO_ALQUILER" FROM Alquileres a JOIN Clientes c ON a.ID_Cliente = c.ID_Cliente JOIN Productos p ON a.ID_Producto = p.ID_Producto ORDER BY a.Fecha_Salida DESC`);
    res.json({ exito: true, historial: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.put('/api/alquileres/:id/ampliar', async (req, res) => {
  const { nueva_fecha } = req.body;
  try {
    await pool.query(`UPDATE Alquileres SET Fecha_Prevista = $1::date WHERE ID_Alquiler = $2`, [nueva_fecha, req.params.id]);
    res.json({ exito: true });
  } catch (error) { res.status(500).json({ exito: false }); }
});

app.get('/api/reporte-alquileres', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT p.ID_Producto AS "ID_PRODUCTO", p.Nombre_Producto AS "NOMBRE_PRODUCTO", p.Stock_Disponible AS "EN_TIENDA", COALESCE(a.alquilados, 0) AS "ALQUILADOS", (p.Stock_Disponible + COALESCE(a.alquilados, 0)) AS "TOTAL_INVENTARIO" FROM Productos p LEFT JOIN (SELECT ID_Producto, COUNT(*) as alquilados FROM Alquileres WHERE Estado_Alquiler = 'PRESTADO' GROUP BY ID_Producto) a ON p.ID_Producto = a.ID_Producto WHERE p.es_alquiler = TRUE AND p.Estado = 'ACTIVO'`);
    res.json({ exito: true, reporte: resultado.rows });
  } catch (error) { res.status(500).json({ exito: false }); }
});

// =======================================================
// DASHBOARD Y REPORTES (FILTROS COMPLETOS)
// =======================================================
app.get('/api/dashboard', async (req, res) => {
  const { idUsuario } = req.query;
  try {
    // 1. Verificar si hay un turno abierto
    const turnoRes = await pool.query(`SELECT ID_Turno, Fecha_Apertura FROM Turnos WHERE ID_Usuario = $1 AND Estado = 'ABIERTO'`, [idUsuario]);
    
    const cilindros = await pool.query(`SELECT COUNT(*) AS "EN_CALLE" FROM Alquileres WHERE Estado_Alquiler = 'PRESTADO'`);
    const stock = await pool.query(`SELECT COUNT(*) AS "ALERTAS" FROM Productos WHERE Stock_Disponible <= 5 AND Estado = 'ACTIVO'`);

    if (turnoRes.rows.length === 0) {
      return res.json({ exito: true, ingresosHoy: 0, cilindrosEnCalle: cilindros.rows[0].EN_CALLE, alertasStock: stock.rows[0].ALERTAS, turnoAbierto: false });
    }

    const fechaApertura = turnoRes.rows[0].fecha_apertura;

    const ventas = await pool.query(`SELECT COALESCE(SUM(Total_Venta), 0) AS total FROM Ventas WHERE ID_Usuario = $1 AND Fecha_Venta >= $2`, [idUsuario, fechaApertura]);
    const recargas = await pool.query(`SELECT COALESCE(SUM(Costo), 0) AS total FROM Recargas WHERE ID_Usuario = $1 AND Fecha_Recarga >= $2`, [idUsuario, fechaApertura]);
    const alquileres = await pool.query(`SELECT COALESCE(SUM(GREATEST(Fecha_Devolucion_Real::date - Fecha_Salida::date, 1) * Costo_Por_Dia), 0) AS total FROM Alquileres WHERE ID_Usuario_Recibe = $1 AND Estado_Alquiler = 'DEVUELTO' AND Fecha_Devolucion_Real >= $2`, [idUsuario, fechaApertura]);

    const totalCajaHoy = parseFloat(ventas.rows[0].total) + parseFloat(recargas.rows[0].total) + parseFloat(alquileres.rows[0].total);
    
    res.json({ exito: true, ingresosHoy: totalCajaHoy, cilindrosEnCalle: cilindros.rows[0].EN_CALLE, alertasStock: stock.rows[0].ALERTAS, turnoAbierto: true, fechaApertura });
  } catch (error) { console.error(error); res.status(500).json({ exito: false }); }
});

// =======================================================
// MIGRACION MASIVA DE DATOS (IMPORTACION)
// =======================================================
app.post('/api/migrar-clientes', async (req, res) => {
  const { clientes } = req.body;
  if (!clientes || !Array.isArray(clientes)) return res.status(400).json({ exito: false, error: "Formato inválido" });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let insertados = 0;
    for (const c of clientes) {
      const ci = c.ci ? String(c.ci).trim() : null;
      if (!ci) continue; // Saltar si no hay CI
      
      const nombre = c.nombre || '';
      const apellido = c.apellido || '';
      const telefono = c.telefono || '';
      const direccion = c.direccion || '';
      const tipo = c.tipo_cliente || 'GENERAL';
      
      // Upsert (Insertar o actualizar si ya existe)
      await client.query(`
        INSERT INTO Clientes (Carnet_Identidad, Nombre, Apellido, Telefono, Direccion, Tipo_Cliente)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (Carnet_Identidad) DO UPDATE 
        SET Nombre = EXCLUDED.Nombre, Apellido = EXCLUDED.Apellido, Telefono = EXCLUDED.Telefono, Direccion = EXCLUDED.Direccion, Tipo_Cliente = EXCLUDED.Tipo_Cliente
      `, [ci, nombre, apellido, telefono, direccion, tipo]);
      insertados++;
    }
    await client.query('COMMIT');
    res.json({ exito: true, insertados });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false, error: error.message });
  } finally {
    client.release();
  }
});

app.post('/api/migrar-productos', async (req, res) => {
  const { productos } = req.body;
  if (!productos || !Array.isArray(productos)) return res.status(400).json({ exito: false, error: "Formato inválido" });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let insertados = 0;
    for (const p of productos) {
      const nombre = p.nombre ? String(p.nombre).trim() : null;
      if (!nombre) continue;
      
      const categoria = p.categoria || 'RECARGA';
      const precio = parseFloat(p.precio) || 0;
      const stock = parseInt(p.stock) || 0;
      const es_alquiler = p.es_alquiler === 'true' || p.es_alquiler === true;
      
      // Para productos no hay unique constraint en nombre en el schema actual, solo insertamos
      await client.query(`
        INSERT INTO Productos (Nombre_Producto, Categoria, Precio, Stock_Disponible, es_alquiler, Estado)
        VALUES ($1, $2, $3, $4, $5, 'ACTIVO')
      `, [nombre, categoria, precio, stock, es_alquiler]);
      insertados++;
    }
    await client.query('COMMIT');
    res.json({ exito: true, insertados });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ exito: false, error: error.message });
  } finally {
    client.release();
  }
});

iniciarServidor();