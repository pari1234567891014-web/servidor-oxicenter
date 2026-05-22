const { Pool } = require('pg'); 
const pool = new Pool({ connectionString: 'postgresql://postgres:OXIMEDIC2026@db.fhgoutlylsjpcukawzmn.supabase.co:5432/postgres?options=-csearch_path%3Dpublic', ssl: { rejectUnauthorized: false } }); 
pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' OR table_schema = 'oximedic';").then(res => { console.log(res.rows.map(r => r.table_name + '.' + r.column_name)); pool.end(); }).catch(e => console.log(e));
