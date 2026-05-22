const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://postgres:OXIMEDIC2026@db.fhgoutlylsjpcukawzmn.supabase.co:5432/postgres?options=-csearch_path%3Dpublic', ssl: { rejectUnauthorized: false } }); 
pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'alquileres';").then(res => { console.log(res.rows); pool.end(); }).catch(e => console.log(e));
