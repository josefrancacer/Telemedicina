//Es necesario instalar en la carpeta del servidor los modulos cors y express
//Defino la función en el lado de la función
//En el lado del cliente me guardo el resultado de esta exportación en una variable
var rpc = require("./rpc.js");   // libreria rpc del servidor
var conexionBD = require('./conexion_mysql.js'); // conexión a la base de datos
rpc.debug = true;

var servidor = rpc.server(); // crear el servidor RPC
var app = servidor.createApp("gestion_pacientes"); // creamos la aplicación RPC

// ---------------------
// - PROCEDIMIENTOS ASÍNCRONOS -
// ---------------------

function obtenerCategorias(callback) {
    conexionBD.query("SELECT * FROM categorias", function (error, datos) {
        if (error) callback(null); else callback(datos);
    });
}

function obtenerUbicaciones(callback) {
    conexionBD.query("SELECT * FROM ubicaciones", function (error, datos) {
        if (error) callback(null); else callback(datos);
    });
}

function obtenerModelos(callback) {
    conexionBD.query("SELECT * FROM modelos", function (error, datos) {
        if (error) callback(null); else callback(datos);
    });
}

function loginSanitario(usuario, password, callback) {
    conexionBD.query("SELECT id FROM sanitarios WHERE usuario = ? AND password = ?", [usuario, password], function (error, datos) {
        if (error) {
            callback(null);
        } else {
            if (datos.length == 0) {
                callback(null); // Credenciales incorrectas
            } else {
                callback(datos[0].id);
            }
        }
    });
}

function crearSanitario(datosSanitario, callback) {
    if (datosSanitario.apellidos == '' || datosSanitario.nombre == '' || datosSanitario.usuario == '' || datosSanitario.password == '') {
        return callback(null);
    }

    // Comprobar si existe el usuario
    conexionBD.query("SELECT id FROM sanitarios WHERE usuario = ?", [datosSanitario.usuario], function(error, datos) {
        if (error || datos.length > 0) {
            return callback(null); // Error o usuario ya existe
        }
        
        // Si no existe, lo creamos
        var sql = "INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
        conexionBD.query(sql, [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password], function (errorInsert, resultado) {
            if (errorInsert) callback(null);
            else callback(resultado.insertId); // MySQL nos da el ID automático
        });
    });
}

function actualizarSanitario(idSanitario, datosSanitario, callback) {
    // Comprobar si el login lo usa otro usuario
    conexionBD.query("SELECT id FROM sanitarios WHERE usuario = ? AND id != ?", [datosSanitario.usuario, idSanitario], function(error, datos) {
        if (error || datos.length > 0) {
            return callback(null); // Error o login repetido
        }

        var sql = "UPDATE sanitarios SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?";
        conexionBD.query(sql, [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password, idSanitario], function(errorUpdate, resultado) {
            if (errorUpdate || resultado.affectedRows === 0) callback(null);
            else callback(idSanitario);
        });
    });
}

function obtenerSanitario(idSanitario, callback) {
    conexionBD.query("SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?", [idSanitario], function (error, datos) {
        if (error) {
            callback(null);
        } else {
            if (datos.length == 0) callback(null);
            else callback(datos[0]); // Devuelve objeto sin la contraseña
        }
    });
}

function obtenerRecursos(idModelo, callback) {
    // Suponemos que estado = 0 es "disponible" según tu lógica original
    conexionBD.query("SELECT * FROM recursos WHERE modelo = ? AND estado = 0", [idModelo], function (error, datos) {
        if (error) callback(null); else callback(datos);
    });
}

function obtenerReservas(idSanitario, callback) {
    conexionBD.query("SELECT * FROM reservas WHERE sanitario = ?", [idSanitario], function (error, datos) {
        if (error) callback(null); else callback(datos);
    });
}

function obtenerResenyas(idRecurso, callback) {
    conexionBD.query("SELECT * FROM resenyas WHERE recurso = ?", [idRecurso], function (error, datos) {
        if (error) callback(null); else callback(datos);
    });
}

function crearResenya(idRecurso, idSanitario, valoracion, descripcion, callback) {
    var sql = "INSERT INTO resenyas (recurso, sanitario, fecha, valor, descripcion) VALUES (?, ?, NOW(), ?, ?)";
    conexionBD.query(sql, [idRecurso, idSanitario, valoracion, descripcion], function (error, resultado) {
        if (error) callback(null);
        else callback(resultado.insertId);
    });
}

function reservarRecurso(idRecurso, idSanitario, horasEstimadas, callback) {
    // 1. Comprobar que el recurso esté operativo (estado 0) y obtener su modelo
    conexionBD.query("SELECT modelo FROM recursos WHERE id = ? AND estado = 0", [idRecurso], function(err, recursos) {
        if (err || recursos.length === 0) return callback(null);
        
        // 2. Comprobar horas máximas del modelo
        conexionBD.query("SELECT horas_maximas FROM modelos WHERE id = ?", [recursos[0].modelo], function(err, modelos) {
            if (err || modelos.length === 0 || horasEstimadas > modelos[0].horas_maximas) return callback(null);
            
            // 3. Insertar reserva
            var sql = "INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion) VALUES (?, ?, ?, NOW())";
            conexionBD.query(sql, [idRecurso, idSanitario, horasEstimadas], function(err, resultado) {
                if (err) return callback(null);
                callback(resultado.insertId);
            });
        });
    });
}

function iniciarReserva(idReserva, callback) {
    conexionBD.query("SELECT recurso FROM reservas WHERE id = ? AND fecha_inicio IS NULL", [idReserva], function (e1, r) {
        if (e1 || r.length === 0) return callback(null);
        
        conexionBD.query("SELECT id FROM reservas WHERE recurso = ? AND fecha_inicio IS NOT NULL AND fecha_fin IS NULL", [r[0].recurso], function (e2, activas) {
            if (e2 || activas.length > 0) return callback(null); // Sigue en uso real
            
            conexionBD.query("UPDATE reservas SET fecha_inicio = NOW() WHERE id = ?", [idReserva], function (e3, res) {
                if (e3 || res.affectedRows === 0) callback(null); 
                else callback(true);
            });
        });
    });
}

function cancelarReserva(idReserva, callback) {
    // Solo permite borrar si no ha iniciado
    conexionBD.query("DELETE FROM reservas WHERE id = ? AND fecha_inicio IS NULL", [idReserva], function(err, resultado) {
        if (err || resultado.affectedRows === 0) return callback(false);
        callback(true);
    });
}

function finalizarReserva(idReserva, callback) {
    // Solo finaliza si estaba iniciada pero no finalizada
    var sql = "UPDATE reservas SET fecha_fin = NOW() WHERE id = ? AND fecha_inicio IS NOT NULL AND fecha_fin IS NULL";
    conexionBD.query(sql, [idReserva], function (error, resultado) {
        if (error || resultado.affectedRows === 0) callback(null);
        else callback(true);
    });
}

function obtenerRecurso(idRecurso, callback) {
    conexionBD.query("SELECT * FROM recursos WHERE id = ?", [idRecurso], function (error, datos) {
        if (error || datos.length == 0) callback(null);
        else callback(datos[0]);
    });
}

// Lógica compleja para calcular tiempo pendiente
function tiempoPendiente(idRecurso, idReserva, callback) {
    if (typeof idReserva === 'function') { 
        callback = idReserva; 
        idReserva = null; 
    }

    conexionBD.query("SELECT * FROM reservas WHERE recurso = ? AND fecha_inicio IS NOT NULL AND fecha_fin IS NULL", [idRecurso], function (err1, activa) {
        if (err1) return callback(null);
        var tiempoMs = 0;

        if (activa.length > 0) {
            var fin = new Date(activa[0].fecha_inicio).getTime() + activa[0].horas_estimadas * 3600000;
            tiempoMs = Math.max(0, fin - Date.now());
        }

        conexionBD.query("SELECT * FROM reservas WHERE recurso = ? AND fecha_inicio IS NULL ORDER BY fecha_peticion ASC", [idRecurso], function (err2, pendientes) {
            if (err2) return callback(null);
            for (var i = 0; i < pendientes.length; i++) {
                if (idReserva && pendientes[i].id == idReserva) break;
                tiempoMs += pendientes[i].horas_estimadas * 3600000;
            }
            callback(Number((tiempoMs / 3600000).toFixed(1)));
        });
    });
}
// ---------------------
// REGISTRO DE FUNCIONES
// ---------------------
app.registerAsync(obtenerCategorias);
app.registerAsync(obtenerUbicaciones);
app.registerAsync(obtenerModelos);
app.registerAsync(loginSanitario);
app.registerAsync(crearSanitario);
app.registerAsync(actualizarSanitario);
app.registerAsync(obtenerSanitario);
app.registerAsync(obtenerRecursos);
app.registerAsync(tiempoPendiente);
app.registerAsync(obtenerReservas);
app.registerAsync(obtenerResenyas);
app.registerAsync(crearResenya);
app.registerAsync(reservarRecurso);
app.registerAsync(cancelarReserva);
app.registerAsync(iniciarReserva);
app.registerAsync(finalizarReserva);
app.registerAsync(obtenerRecurso);