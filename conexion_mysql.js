const mysql = require('mysql');
const database = {
    host : 'localhost',
    user : 'Jose1',
    password : 'telemedicina2026',
    database : 'telemedicina'
};

const conexion = mysql.createConnection(database);

conexion.connect(function (err) {
    if (err) {
        console.error('Error en la conexión de la base de datos:',err);
        process.exit();
    }
});

module.exports = conexion;