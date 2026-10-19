// ==========================================================================
// [P3-3] NUEVO: conexión a PostgreSQL (Supabase)
// Sustituye a conexion_mysql.js.            Instalar:  npm install pg
// ==========================================================================
var pg = require("pg");

// Cadena de conexión de Supabase: Connect > "Session pooler" (URI).
// Se lee de la variable de entorno DATABASE_URL (en Render: Environment).
// Si no existe, se usa la que pongas aquí abajo (cambia [YOUR-PASSWORD]).
var urlBD = process.env.DATABASE_URL ||
    "postgresql://postgres.gngwhrjvgydqqdnxyygd:telemedicina2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

// Pool = conjunto de conexiones que se reutilizan entre peticiones
var conexion = new pg.Pool({
    connectionString: urlBD,
    ssl: { rejectUnauthorized: false }   // Supabase exige conexión cifrada (SSL)
});

conexion.on("error", function (err) {
    console.log("Error en la conexión con PostgreSQL:", err.message);
});

module.exports = conexion;

