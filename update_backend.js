const fs = require('fs');
const files = ['C:/Users/abrah/servidor_oxigeno/index.js', 'C:/Users/abrah/servidor_oxicenter/index.js'];

files.forEach(f => {
    if(fs.existsSync(f)) {
        let c = fs.readFileSync(f, 'utf8');
        
        let oldSql = const alquileres = await pool.query(\\\
          SELECT a.Fecha_Salida as "FECHA",
                 COALESCE(u1.Nombre_Completo, '') as "CAJERO",
                 COALESCE(c.Nombre, '') || ' ' || COALESCE(c.Apellido, '') as "NOMBRE_CLIENTE",
                 p.Nombre_Producto as "NOMBRE_PRODUCTO",
                 COALESCE(GREATEST(a.Fecha_Devolucion_Real::date - a.Fecha_Salida::date, 1) * a.Costo_Por_Dia, 0) as "TOTAL_COBRADO"
          FROM Alquileres a
          LEFT JOIN Usuarios u1 ON a.ID_Usuario = u1.ID_Usuario
          LEFT JOIN Clientes c ON a.ID_Cliente = c.ID_Cliente
          LEFT JOIN Productos p ON a.ID_Producto = p.ID_Producto
          WHERE \ \
          ORDER BY a.Fecha_Salida DESC
        \\\);;
        
        let newSql = const alquileres = await pool.query(\\\
          SELECT a.Fecha_Salida as "FECHA_SALIDA",
                 a.Fecha_Devolucion_Real as "FECHA_DEVOLUCION",
                 COALESCE(u1.Nombre_Completo, '') as "CAJERO",
                 COALESCE(u2.Nombre_Completo, '') as "CAJERO_RECEPCION",
                 c.Carnet_Identidad as "CI_CLIENTE",
                 COALESCE(c.Nombre, '') || ' ' || COALESCE(c.Apellido, '') as "NOMBRE_CLIENTE",
                 p.Nombre_Producto as "NOMBRE_PRODUCTO",
                 COALESCE(GREATEST(a.Fecha_Devolucion_Real::date - a.Fecha_Salida::date, 1) * a.Costo_Por_Dia, 0) as "TOTAL_COBRADO"
          FROM Alquileres a
          LEFT JOIN Usuarios u1 ON a.ID_Usuario = u1.ID_Usuario
          LEFT JOIN Usuarios u2 ON a.ID_Usuario_Recibe = u2.ID_Usuario
          LEFT JOIN Clientes c ON a.ID_Cliente = c.ID_Cliente
          LEFT JOIN Productos p ON a.ID_Producto = p.ID_Producto
          WHERE \ \
          ORDER BY a.Fecha_Salida DESC
        \\\);;
        
        c = c.replace(oldSql, newSql);
        fs.writeFileSync(f, c);
        console.log("Updated " + f);
    }
});
