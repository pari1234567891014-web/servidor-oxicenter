const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://postgres:OXIMEDIC2026@db.fhgoutlylsjpcukawzmn.supabase.co:5432/postgres', ssl: { rejectUnauthorized: false } }); 

async function run() {
    try {
        await pool.query('ALTER TABLE oximedic.alquileres ADD COLUMN IF NOT EXISTS id_usuario_recibe INT REFERENCES oximedic.usuarios(id_usuario)');
        console.log("Added to oximedic");
    } catch(e) { console.error("Error in oximedic:", e.message); }

    try {
        await pool.query('ALTER TABLE oxicenter.alquileres ADD COLUMN IF NOT EXISTS id_usuario_recibe INT REFERENCES oxicenter.usuarios(id_usuario)');
        console.log("Added to oxicenter");
    } catch(e) { console.error("Error in oxicenter:", e.message); }

    pool.end();
}
run();
