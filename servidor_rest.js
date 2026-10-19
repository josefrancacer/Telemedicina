// ==========================================================================
// SERVIDOR REST DEL GESTOR — versión PostgreSQL
// --------------------------------------------------------------------------
// [PG] = cambios de MySQL a PostgreSQL. Las diferencias son siempre las mismas:
//   1. Parámetros:   MySQL usa ?            ->  PostgreSQL usa $1, $2, $3...
//   2. Resultado:    MySQL da las filas      ->  PostgreSQL da resultado.rows
//   3. Filas tocadas: affectedRows           ->  resultado.rowCount
//   4. Id generado:  resultado.insertId      ->  "RETURNING id" en el INSERT
//                                                y resultado.rows[0].id
// ==========================================================================
module.exports = function(app, datos) {

    // [PG] CAMBIO: antes require("./conexion_mysql.js")
    var conexion = require("./conexion_postgres.js");

    // [P3-2] librería para crear y leer tokens (npm install jwt-simple)
    var jwt = require('jwt-simple');
    var clave = 'telemedicina'; // clave para codificar / decodificar el token


    //LOGIN de gestor

    //Recibe usuario y contraseña
    app.post('/api/gestores/login', function(req, res){
        var login = req.body.usuario;
        var password = req.body.password;

        // [PG] ? -> $1, $2
        var sql = "SELECT id FROM gestores WHERE usuario = $1 AND password = $2";
        conexion.query(sql, [login, password], function(err, resultado) {
            if (err) {
                console.log("Error al realizar el login:", err.message);
                return res.status(500).json({ error: "Error interno del servidor" });
            }

            var gestores = resultado.rows;   // [PG] las filas están en .rows

            if (gestores.length > 0) {
                // [P3-2] crear el token (igual que el ejemplo del profesor)
                var contenido = {
                    usuario: gestores[0].id,                 // id del gestor
                    expira: Date.now() + 60 * 60 * 1000      // expira dentro de 1 hora (en ms)
                };
                var token = jwt.encode(contenido, clave);

                // [P3-2] devolvemos el id y también el token
                res.status(200).json({ id: gestores[0].id, token: token });
            } else {
                res.status(403).send("ERROR 403: Autenticación incorrecta");
            }
        });
    });

    //REGISTRO DE GESTOR

    //Recoge datos del body
    //Comprueba que el login no exista
    //Crea nuevo gestor (id automático)
    //Devuelve 201 con el id
    app.post('/api/gestores', function(req, res){
        var login = req.body.login;

        conexion.query("SELECT id FROM gestores WHERE usuario = $1", [login], function(err, resultado) {
            if (err) return res.status(500).json({ error: "Error al verificar duplicados" });
            if (resultado.rows.length > 0) return res.status(400).json({ error: "El login ya existe" });

            // [PG] RETURNING id: PostgreSQL devuelve el id generado (en MySQL era insertId)
            var sql = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES ($1, $2, $3, $4) RETURNING id";
            conexion.query(sql, [req.body.nombre, req.body.apellidos, login, req.body.password], function(err, resultado) {
                if (err) {
                    console.log("Error al crear el gestor:", err.message);
                    return res.status(500).json({ error: "Error al crear el gestor" });
                }
                res.status(201).json(resultado.rows[0].id);
            });
        });
    });

    // ======================================================================
    // [P3-2] VALIDACIÓN DEL TOKEN (igual que el ejemplo del profesor)
    // ----------------------------------------------------------------------
    // Antes de este use, los servicios son públicos (login y registro).
    // Después, TODOS los servicios /api necesitan el token, que llega en la
    // URL:  /api/categorias?token=XXXXXXXX
    // (El ejemplo del profesor responde 301; aquí se usa 401, que es el
    //  código HTTP correcto para "no autorizado".)
    // ======================================================================
    app.use("/api", function (req, res, next) {
        var token = req.query.token; // obtengo el token de la query de la URL
        if (!token) { // no se ha pasado un token
            res.status(401).json("No se ha encontrado token");
            return;
        }

        // Decodificar el token
        try { // capturamos el error por si el token no es correcto
            var contenidoToken = jwt.decode(token, clave);
        } catch (error) {
            res.status(401).json("El token es incorrecto");
            return;
        }

        // Validar el formato del token
        if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
            res.status(401).json("El formato del token no es adecuado");
            return;
        }

        // Comprobar la fecha de expiración
        if (contenidoToken.expira < Date.now()) {
            res.status(401).json("El token ha expirado");
            return;
        }

        // Todo ha ido bien. Con next hago que express continúe con el procesado
        next();
    });
    // Después de este use, los servicios son privados (necesitan el token)


    //Devuelven los desplegables del formulario
    app.get('/api/modelos', function(req, res){
        conexion.query("SELECT * FROM modelos ORDER BY id", function(err, resultado) {
            if (err) {
                console.log("Error al realizar la select:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }
            res.status(200).json(resultado.rows);
        });
    });

    app.get('/api/ubicaciones', function(req, res){
        conexion.query("SELECT * FROM ubicaciones ORDER BY id", function(err, resultado) {
            if (err) {
                console.log("Error al realizar la select:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }
            res.status(200).json(resultado.rows);
        });
    });

    app.get('/api/categorias', function(req, res){
        conexion.query("SELECT * FROM categorias ORDER BY id", function(err, resultado) {
            if (err) {
                console.log("Error al realizar la select:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }
            res.status(200).json(resultado.rows);
        });
    });

    //ACTUALIZA GESTOR

    //Comprueba duplicados de login
    //Si no existe → 404
    app.put('/api/gestores/:id', function(req, res){
        var id = req.params.id;
        var nombre = req.body.nombre;
        var apellidos = req.body.apellidos;
        var login = req.body.login;
        var password = req.body.password || null;   // si no se envía contraseña -> null

        // 1. Comprobar si el login ya existe para OTRO gestor (id != id actual)
        var sqlCheck = "SELECT id FROM gestores WHERE usuario = $1 AND id != $2";

        conexion.query(sqlCheck, [login, id], function(err, resultado) {
            if (err) return res.status(500).json({ error: "Error al comprobar duplicados" });

            if (resultado.rows.length > 0) {
                // Si devuelve algún registro, el login ya está pillado
                return res.status(400).json({ error: "El login ya existe" });
            }

            // 2. Si no hay duplicados, procedemos a actualizar.
            // COALESCE($4, password): si la contraseña llega vacía (null) se
            // mantiene la que ya tenía. Así "Editar datos" funciona sin tener
            // que volver a escribir la contraseña.
            var sqlUpdate = "UPDATE gestores SET nombre = $1, apellidos = $2, usuario = $3, " +
                            "password = COALESCE($4, password) WHERE id = $5";

            conexion.query(sqlUpdate, [nombre, apellidos, login, password, id], function(err, resultado) {
                if (err) {
                    console.log("Error al realizar el update:", err.message);
                    return res.status(500).json({ error: "Error al realizar la actualización" });
                }

                // [PG] affectedRows -> rowCount
                if (resultado.rowCount === 0) {
                    return res.status(404).json({ error: "Gestor no encontrado" });
                }

                // Devolvemos los datos actualizados (sin la contraseña)
                res.status(200).json({ id: id, nombre: nombre, apellidos: apellidos, usuario: login });
            });
        });
    });

    app.get('/api/gestores/:id', function(req, res){
        var id = req.params.id;
        // Pedimos solo los campos que queremos, excluyendo el password
        var sql = "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = $1";

        conexion.query(sql, [id], function(err, resultado) {
            if (err) {
                console.log("Error al buscar gestor:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }

            if (resultado.rows.length > 0) {
                res.status(200).json(resultado.rows[0]);
            } else {
                res.sendStatus(404);
            }
        });
    });

    app.get('/api/sanitarios/:id', function(req, res){
        var id = req.params.id;
        // Pedimos solo los campos que queremos, excluyendo el password
        var sql = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = $1";

        conexion.query(sql, [id], function(err, resultado) {
            if (err) {
                console.log("Error al buscar sanitario:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }

            if (resultado.rows.length > 0) {
                res.status(200).json(resultado.rows[0]);
            } else {
                res.sendStatus(404);
            }
        });
    });

    //LISTADO DE RECURSOS CON FILTROS
    app.get('/api/recursos', function(req, res) {

        // Consulta base. "1=1" permite añadir " AND ..." a todas las condiciones.
        var sql = "SELECT * FROM recursos WHERE 1=1";

        // [PG] Los valores de los filtros van en este array y en la consulta se
        //      ponen $1, $2... según el orden en que se añaden.
        var parametros = [];

        // Filtro por categoría: subconsulta con los ids de los modelos de esa categoría
        if (req.query.categoria && req.query.categoria != "0") {
            parametros.push(req.query.categoria);
            sql += " AND modelo IN (SELECT id FROM modelos WHERE categoria = $" + parametros.length + ")";
        }

        // Filtro por modelo
        if (req.query.modelo && req.query.modelo != "0") {
            parametros.push(req.query.modelo);
            sql += " AND modelo = $" + parametros.length;
        }

        // Filtro por ubicación
        if (req.query.ubicacion && req.query.ubicacion != "0") {
            parametros.push(req.query.ubicacion);
            sql += " AND ubicacion = $" + parametros.length;
        }

        // Filtro por estado
        if (req.query.estado && req.query.estado != "-1") {
            parametros.push(req.query.estado);
            sql += " AND estado = $" + parametros.length;
        }

        sql += " ORDER BY id";

        console.log("Consulta SQL a ejecutar:", sql, parametros);

        conexion.query(sql, parametros, function(err, resultado) {
            if (err) {
                console.log("Error al realizar la select de recursos:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }
            res.status(200).json(resultado.rows);
        });
    });

    //OBTENER RECURSO POR ID
    app.get('/api/recursos/:id', function(req, res) {
        var id = req.params.id;
        var sql = "SELECT * FROM recursos WHERE id = $1";

        conexion.query(sql, [id], function(err, resultado) {
            if (err) {
                console.log("Error al realizar la select:", err.message);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }

            if (resultado.rows.length > 0) {
                res.status(200).json(resultado.rows[0]);
            } else {
                res.status(404).json({ error: "Recurso no encontrado" });
            }
        });
    });

    //CREAR RECURSO
    // Devuelve el recurso creado con su id
    app.post('/api/recursos', function(req, res) {
        var nuevo = req.body;
        // [PG] RETURNING id para saber el id generado
        var sql = "INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES ($1, $2, $3, $4) RETURNING id";

        conexion.query(sql, [nuevo.modelo, nuevo.ubicacion, nuevo.numero_serie, nuevo.estado], function(err, resultado) {
            if (err) {
                console.log("Error al crear el recurso:", err.message);
                return res.status(500).json({ error: "Error al crear el recurso" });
            }
            nuevo.id = resultado.rows[0].id;   // [PG] antes resultado.insertId
            res.status(201).json(nuevo);
        });
    });

    //EDITAR RECURSO
    app.put('/api/recursos/:id', function(req, res) {
        var id = req.params.id;
        var nuevo = req.body;
        var sql = "UPDATE recursos SET modelo = $1, ubicacion = $2, numero_serie = $3, estado = $4 WHERE id = $5";

        conexion.query(sql, [nuevo.modelo, nuevo.ubicacion, nuevo.numero_serie, nuevo.estado, id], function(err, resultado) {
            if (err) {
                console.log("Error al actualizar el recurso:", err.message);
                return res.status(500).json({ error: "Error al actualizar el recurso" });
            }
            if (resultado.rowCount === 0) return res.status(404).json({ error: "Recurso no encontrado" });
            res.status(200).json({ id: id, ...nuevo });
        });
    });

    //BORRAR RECURSO
    app.delete('/api/recursos/:id', function(req, res) {
        var id = req.params.id;
        var sql = "DELETE FROM recursos WHERE id = $1";

        conexion.query(sql, [id], function(err, resultado) {
            if (err) {
                console.log("Error al realizar el delete:", err.message);
                // 23503 = el recurso tiene reservas o reseñas que apuntan a él (clave foránea)
                if (err.code === "23503") {
                    return res.status(409).json({ error: "No se puede borrar: el recurso tiene reservas o reseñas" });
                }
                return res.status(500).json({ error: "Error al realizar el borrado" });
            }

            // Si rowCount es 0, no se borró nada porque el ID no existía
            if (resultado.rowCount === 0) {
                return res.status(404).json({ error: "Recurso no encontrado" });
            }

            res.status(200).json({ mensaje: "Recurso borrado correctamente" });
        });
    });

    //RESERVAS DEL RECURSO
    app.get('/api/recursos/:id/reservas', function(req, res) {
        var idRecurso = req.params.id;

        // JOIN con sanitarios: "sanitario" es el nombre completo (para la tabla
        // de la ficha) y nombre/apellidos por separado (para el Ministerio).
        // [PG] En PostgreSQL se puede usar CONCAT igual que en MySQL.
        var sqlReservas =
            "SELECT r.id, r.recurso, r.horas_estimadas, r.fecha_peticion, r.fecha_inicio, r.fecha_fin, " +
            "       CONCAT(s.nombre, ' ', s.apellidos) AS sanitario, " +
            "       s.nombre AS nombre_sanitario, s.apellidos AS apellidos_sanitario " +
            "FROM reservas r " +
            "JOIN sanitarios s ON r.sanitario = s.id " +
            "WHERE r.recurso = $1 " +
            "ORDER BY r.fecha_peticion";

        conexion.query(sqlReservas, [idRecurso], function(err, resultado) {
            if (err) {
                console.log("Error al consultar reservas:", err.message);
                return res.status(500).json({ error: "Error al consultar las reservas" });
            }
            res.status(200).json(resultado.rows);
        });
    });

    //RESEÑAS DEL RECURSO
    app.get('/api/recursos/:id/resenyas', function(req, res) {
        var idRecurso = req.params.id;

        var sqlResenyas =
            "SELECT r.id, r.recurso, r.fecha, r.valor, r.descripcion, " +
            "       CONCAT(s.nombre, ' ', s.apellidos) AS sanitario " +
            "FROM resenyas r " +
            "JOIN sanitarios s ON r.sanitario = s.id " +
            "WHERE r.recurso = $1 " +
            "ORDER BY r.fecha";

        conexion.query(sqlResenyas, [idRecurso], function(err, resultado) {
            if (err) {
                console.log("Error al consultar reseñas:", err.message);
                return res.status(500).json({ error: "Error al consultar las reseñas" });
            }
            res.status(200).json(resultado.rows);
        });
    });
}
