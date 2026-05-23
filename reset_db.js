const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.wljemvwsdpghvsclwwfk:OXICENTER2026@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
  ssl: { rejectUnauthorized: false }
});

async function resetDB() {
  try {
    console.log("Checking users...");
    const users = await pool.query('SELECT * FROM Usuarios');
    console.log(users.rows);
    
    console.log("Wiping transactional tables...");
    await pool.query('TRUNCATE TABLE Ventas RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE Recargas RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE Alquileres RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE Turnos RESTART IDENTITY CASCADE');
    
    console.log("Wiping data tables...");
    await pool.query('TRUNCATE TABLE Clientes RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE Productos RESTART IDENTITY CASCADE');
    
    console.log("Deleting non-admin users...");
    await pool.query("DELETE FROM Usuarios WHERE LOWER(TRIM(Usuario)) != 'admin'");
    await pool.query("UPDATE Usuarios SET Contrasena = 'admin123' WHERE LOWER(TRIM(Usuario)) = 'admin'");
    
    console.log("Database reset complete.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

resetDB();
