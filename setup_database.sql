-- =====================================================
-- SQL PARA OXI - CENTER (Proyecto Supabase independiente)
-- Usa schema PUBLIC (por defecto)
-- =====================================================

CREATE TABLE IF NOT EXISTS Usuarios (
    ID_Usuario SERIAL PRIMARY KEY,
    Nombre_Completo VARCHAR(200) NOT NULL,
    Usuario VARCHAR(100) NOT NULL UNIQUE,
    Contrasena VARCHAR(200) NOT NULL,
    Rol VARCHAR(50) DEFAULT 'CAJERO',
    Estado VARCHAR(20) DEFAULT 'ACTIVO',
    Palabra_Seguridad VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS Clientes (
    ID_Cliente SERIAL PRIMARY KEY,
    Carnet_Identidad VARCHAR(50) NOT NULL UNIQUE,
    Nombre VARCHAR(200),
    Apellido VARCHAR(200),
    Telefono VARCHAR(50),
    Direccion TEXT,
    Tipo_Cliente VARCHAR(50) DEFAULT 'GENERAL',
    Tiene_Descuento BOOLEAN DEFAULT FALSE,
    Monto_Descuento NUMERIC(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Productos (
    ID_Producto SERIAL PRIMARY KEY,
    Nombre_Producto VARCHAR(200) NOT NULL,
    Categoria VARCHAR(100) DEFAULT 'RECARGA',
    Precio NUMERIC(10,2) DEFAULT 0,
    Stock_Disponible INT DEFAULT 0,
    Estado VARCHAR(20) DEFAULT 'ACTIVO',
    es_alquiler BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS Ventas (
    ID_Venta SERIAL PRIMARY KEY,
    ID_Usuario INT REFERENCES Usuarios(ID_Usuario),
    Total_Venta NUMERIC(10,2) DEFAULT 0,
    Fecha_Venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nro_servicio INT,
    cliente_ci VARCHAR(50),
    cliente_nombre VARCHAR(200),
    cliente_telefono VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS Detalle_Ventas (
    ID_Detalle SERIAL PRIMARY KEY,
    ID_Venta INT REFERENCES Ventas(ID_Venta),
    ID_Producto INT REFERENCES Productos(ID_Producto),
    Cantidad INT DEFAULT 1,
    Precio_Unitario NUMERIC(10,2),
    Subtotal NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS Alquileres (
    ID_Alquiler SERIAL PRIMARY KEY,
    ID_Cliente INT REFERENCES Clientes(ID_Cliente),
    ID_Producto INT REFERENCES Productos(ID_Producto),
    ID_Usuario INT REFERENCES Usuarios(ID_Usuario),
    Costo_Por_Dia NUMERIC(10,2) DEFAULT 0,
    Monto_Garantia NUMERIC(10,2) DEFAULT 0,
    Estado_Botellon TEXT,
    Fecha_Prevista DATE,
    Estado_Alquiler VARCHAR(30) DEFAULT 'PRESTADO',
    Fecha_Salida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Fecha_Devolucion_Real TIMESTAMP,
    nro_servicio INT
);

CREATE TABLE IF NOT EXISTS Recargas (
    ID_Recarga SERIAL PRIMARY KEY,
    ID_Usuario INT REFERENCES Usuarios(ID_Usuario),
    Nombre_Botellon VARCHAR(200),
    Categoria VARCHAR(100),
    Costo NUMERIC(10,2),
    Nro_Servicio INT,
    Cliente_CI VARCHAR(50),
    Cliente_Nombre VARCHAR(200),
    Cliente_Telefono VARCHAR(50),
    Cliente_Direccion TEXT,
    Fecha_Recarga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar administrador por defecto
INSERT INTO Usuarios (Nombre_Completo, Usuario, Contrasena, Rol, Estado, Palabra_Seguridad)
VALUES ('Administrador', 'admin', 'admin123', 'ADMINISTRADOR', 'ACTIVO', 'admin')
ON CONFLICT (Usuario) DO NOTHING;

-- Verificacion
SELECT 'OXI-CENTER usuarios:' AS info, COUNT(*) FROM Usuarios;
