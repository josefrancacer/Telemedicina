module.exports = function(app, datos) {
    var num=0;
    //carga datos en la memoria
    var conexion = require("./conexion_mysql.js");

    // [P3-2] NUEVO: librería para crear y leer tokens (npm install jwt-simple)
    var jwt = require('jwt-simple');
    var clave = 'telemedicina'; // clave para codificar / decodificar el token


    //LOGIN de gestor

    //Recibe usuario y contraseña
    app.post('/api/gestores/login', function(req, res){
            // Mantenemos req.body.usuario como usabas en tu código original
            var login = req.body.usuario; 
            var password = req.body.password;
            
            var sql = "SELECT id FROM gestores WHERE usuario = ? AND password = ?";
            conexion.query(sql, [login, password], function(err, gestores) {
                if (err) return res.status(500).json({ error: "Error interno del servidor" });

                if (gestores.length > 0) {
                    // [P3-2] NUEVO: crear el token (igual que el ejemplo del profesor)
                    var contenido = {
                        usuario: gestores[0].id,                 // id del gestor
                        expira: Date.now() + 60 * 60 * 1000      // expira dentro de 1 hora (en ms)
                    };
                    var token = jwt.encode(contenido, clave);

                    // [P3-2] CAMBIO: devolvemos el id y también el token
                    res.status(200).json({ id: gestores[0].id, token: token });
                } else {
                    res.status(403).send("ERROR 403: Autenticación incorrecta");
                }
            });
    });

    //REGISTRO DE GESTOR

    //Recoge datos del body
    //Crea nuevo gestor
    //Genera id automático
    //Lo añade al array
    //Devuelve 201
    app.post('/api/gestores', function(req, res){
        var login = req.body.login;
        
        conexion.query("SELECT id FROM gestores WHERE usuario = ?", [login], function(err, resultados) {
            if (err) return res.status(500).json({ error: "Error al verificar duplicados" });
            if (resultados.length > 0) return res.status(400).json({ error: "El login ya existe" });

            var sql = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
            conexion.query(sql, [req.body.nombre, req.body.apellidos, login, req.body.password], function(err, resultado) {
                if (err) return res.status(500).json({ error: "Error al crear el gestor" });
                res.status(201).json(resultado.insertId);
            });
        });
    });

    // ======================================================================
    // [P3-2] NUEVO: VALIDACIÓN DEL TOKEN (igual que el ejemplo del profesor)
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
        var sql = "SELECT * FROM modelos";
        conexion.query(sql, function(err, modelos) {
            if (err) {
                console.log("Error al realizar la select:", err);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            } 
            res.status(200).json(modelos);
        });
    });

    app.get('/api/ubicaciones', function(req, res){
        var sql = "SELECT * FROM ubicaciones";
        conexion.query(sql, function(err, ubicaciones) {
            if (err) {
                console.log("Error al realizar la select:", err);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            } 
            res.status(200).json(ubicaciones);
        });
    });

    app.get('/api/categorias', function(req, res){
        var sql = "SELECT * FROM categorias";
        conexion.query(sql, function(err, categorias) {
            if (err) {
                console.log("Error al realizar la select:", err);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            } 
            res.status(200).json(categorias);
        });
    });

    //ACTUALIZA GESTOR

    //Busca el índice del gestor
    //Si no existe → 404
    //Comprueba duplicados de login
    //Actualiza solo los campos enviados
    app.put('/api/gestores/:id', function(req, res){
        var id = req.params.id;
        var nombre = req.body.nombre;
        var apellidos = req.body.apellidos;
        var login = req.body.login; 
        var password = req.body.password;

        // 1. Comprobar si el login ya existe para OTRO gestor (id != id actual)
        // [P3-2] CAMBIO: consulta con parámetros (?) como el resto del archivo
        var sqlCheck = "SELECT id FROM gestores WHERE usuario = ? AND id != ?";
        
        conexion.query(sqlCheck, [login, id], function(err, resultados) {
            if (err) return res.status(500).json({ error: "Error al comprobar duplicados" });
            
            if (resultados.length > 0) {
                // Si devuelve algún registro, el login ya está pillado
                return res.status(400).json({ error: "El login ya existe" });
            }

            // 2. Si no hay duplicados, procedemos a actualizar
            // Nota: Asumimos que el PUT siempre envía todos los campos. 
            // [P3-2] CAMBIO: consulta con parámetros (?) como el resto del archivo
            var sqlUpdate = "UPDATE gestores SET nombre = ?, apellidos = ?, usuario = ?, password = ? WHERE id = ?";

            conexion.query(sqlUpdate, [nombre, apellidos, login, password, id], function(err, resultado) {
                if (err) {
                    console.log("Error al realizar el update:", err);
                    return res.status(500).json({ error: "Error al realizar la actualización" });
                }
                
                // Comprobamos si realmente se ha encontrado y modificado el registro
                if (resultado.affectedRows === 0) {
                    return res.status(404).json({ error: "Gestor no encontrado" });
                }

                // Devolvemos los datos actualizados para simular el comportamiento original
                res.status(200).json({ id: id, nombre: nombre, apellidos: apellidos, usuario: login, password: password });
            });
        });
    });

    app.get('/api/gestores/:id', function(req, res){
            var id = req.params.id;
            // Pedimos explícitamente solo los campos que queremos, excluyendo el password
            var sql = "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = ?";

            conexion.query(sql, [id], function(err, gestores) {
                if (err) {
                    console.log("Error al buscar gestor:", err);
                    return res.status(500).json({ error: "Error al realizar la consulta" });
                } 
                
                if (gestores.length > 0) {
                    // Construimos un objeto JSON nativo para evitar fallos de RowDataPacket
                    res.status(200).json({
                        id: gestores[0].id,
                        nombre: gestores[0].nombre,
                        apellidos: gestores[0].apellidos,
                        usuario: gestores[0].usuario
                    });
                } else {
                    res.sendStatus(404);
                }
            });
    });

    app.get('/api/sanitarios/:id', function(req, res){
            var id = req.params.id;
            // Pedimos explícitamente solo los campos que queremos, excluyendo el password
            var sql = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?";

            conexion.query(sql, [id], function(err, sanitarios) {
                if (err) {
                    console.log("Error al buscar sanitario:", err);
                    return res.status(500).json({ error: "Error al realizar la consulta" });
                } 
                
                if (sanitarios.length > 0) {
                    // Construimos el objeto exacto que espera la web
                    res.status(200).json({
                        id: sanitarios[0].id,
                        nombre: sanitarios[0].nombre,
                        apellidos: sanitarios[0].apellidos,
                        usuario: sanitarios[0].usuario
                    });
                } else {
                    res.sendStatus(404);
                }
            });
    });

    //LISTADO DE RECURSOS CON FILTROS
    app.get('/api/recursos', function(req, res) {
        
        // Iniciamos la consulta base. 
        // 1=1 nos permite añadir " AND " a todas las condiciones posteriores sin que falle la sintaxis.
        var sql = "SELECT * FROM recursos WHERE 1=1";

        // Filtro por categoría: usamos una subconsulta para obtener los ids de los modelos que pertenecen a esa categoría
        if (req.query.categoria && req.query.categoria != "0") {
            sql += " AND modelo IN (SELECT id FROM modelos WHERE categoria = " + req.query.categoria + ")";
        }

        // Filtro por modelo
        if (req.query.modelo && req.query.modelo != "0") {
            sql += " AND modelo = " + req.query.modelo;
        }

        // Filtro por ubicación
        if (req.query.ubicacion && req.query.ubicacion != "0") {
            sql += " AND ubicacion = " + req.query.ubicacion;
        }

        // Filtro por estado
        if (req.query.estado && req.query.estado != "-1") {
            /* Nota: Si el 'estado' en tu base de datos es un texto (por ejemplo "Disponible", "Roto"), 
            necesitarás envolverlo en comillas simples así:
            sql += " AND estado = '" + req.query.estado + "'";
            Si es un ID o número, déjalo como está abajo: */
            sql += " AND estado = " + req.query.estado;
        }

        // Hacemos un console.log de la consulta para poder depurar en caso de error
        console.log("Consulta SQL a ejecutar:", sql);

        // Ejecutamos la consulta en la base de datos
        conexion.query(sql, function(err, recursosFiltrados) {
            if (err) {
                console.log("Error al realizar la select de recursos:", err);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            }
            
            console.log("Lista filtrada enviada al cliente.");
            res.status(200).json(recursosFiltrados);
        });
    });

    //OBTENER RECURSO POR ID
    app.get('/api/recursos/:id', function(req, res) {
        var id = req.params.id;
        var sql = "SELECT * FROM recursos WHERE id = ?";

        conexion.query(sql, [id], function(err, recursos) {
            if (err) {
                console.log("Error al realizar la select:", err);
                return res.status(500).json({ error: "Error al realizar la consulta" });
            } 
            
            if (recursos.length > 0) {
                res.status(200).json(recursos[0]);
            } else {
                res.status(404).json({ error: "Recurso no encontrado" });
            }
        });
    });

    //CREAR RECURSO

    //Genera id automático
    //Inserta en array
    // Devuelve el recurso creado
    app.post('/api/recursos', function(req, res) {
        var nuevo = req.body;
        var sql = "INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES (?, ?, ?, ?)";
        
        conexion.query(sql, [nuevo.modelo, nuevo.ubicacion, nuevo.numero_serie, nuevo.estado], function(err, resultado) {
            if (err) return res.status(500).json({ error: "Error al crear el recurso" });
            nuevo.id = resultado.insertId;
            res.status(201).json(nuevo);
        });
    });

    //EDITAR RECURSO
    app.put('/api/recursos/:id', function(req, res) {
        var id = req.params.id;
        var nuevo = req.body;
        var sql = "UPDATE recursos SET modelo = ?, ubicacion = ?, numero_serie = ?, estado = ? WHERE id = ?";
        
        conexion.query(sql, [nuevo.modelo, nuevo.ubicacion, nuevo.numero_serie, nuevo.estado, id], function(err, resultado) {
            if (err) return res.status(500).json({ error: "Error al actualizar el recurso" });
            if (resultado.affectedRows === 0) return res.status(404).json({ error: "Recurso no encontrado" });
            res.status(200).json({ id: id, ...nuevo });
        });
    });

    //BORRAR RECURSO
    app.delete('/api/recursos/:id', function(req, res) {
        var id = req.params.id;
        
        // Construimos la consulta de borrado
        // [P3-2] CAMBIO: consulta con parámetros (?) como el resto del archivo
        var sql = "DELETE FROM recursos WHERE id = ?";

        conexion.query(sql, [id], function(err, resultado) {
            if (err) {
                console.log("Error al realizar el delete:", err);
                return res.status(500).json({ error: "Error al realizar el borrado" });
            }

            // Si affectedRows es 0, significa que no se borró nada porque el ID no existía
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: "Recurso no encontrado" });
            }

            // Borrado exitoso, devolvemos el mismo mensaje que tenías originalmente
            res.status(200).json({ mensaje: "Recurso borrado correctamente" });
        });
    });

    //RESERVAS DEL RECURSO
    //Filtra reservas por recurso
    app.get('/api/recursos/:id/reservas', function(req, res) {
        var idRecurso = req.params.id;
        
        // Hacemos JOIN con sanitarios y machacamos el ID con el nombre completo
        // [P3-1] CAMBIO: también devolvemos nombre y apellidos por separado,
        //        que son los campos que pide el Ministerio
        var sqlReservas = `
            SELECT r.id, r.recurso, r.horas_estimadas, r.fecha_peticion, r.fecha_inicio, r.fecha_fin, 
                   CONCAT(s.nombre, ' ', s.apellidos) AS sanitario,
                   s.nombre AS nombre_sanitario, s.apellidos AS apellidos_sanitario
            FROM reservas r 
            JOIN sanitarios s ON r.sanitario = s.id 
            WHERE r.recurso = ?
        `;
        
        conexion.query(sqlReservas, [idRecurso], function(err, reservas) {
            if (err) {
                console.log("Error al consultar reservas:", err);
                return res.status(500).json({ error: "Error al consultar las reservas" });
            }
            res.status(200).json(reservas);
        });
    });

    //RESEÑAS DEL RECURSO

    app.get('/api/recursos/:id/resenyas', function(req, res) {
        var idRecurso = req.params.id;
        
        // Mismo JOIN para sacar el nombre del sanitario
        var sqlResenyas = `
            SELECT r.id, r.recurso, r.fecha, r.valor, r.descripcion, 
                   CONCAT(s.nombre, ' ', s.apellidos) AS sanitario 
            FROM resenyas r 
            JOIN sanitarios s ON r.sanitario = s.id 
            WHERE r.recurso = ?
        `;
        
        conexion.query(sqlResenyas, [idRecurso], function(err, resenyas) {
            if (err) {
                console.log("Error al consultar reseñas:", err);
                return res.status(500).json({ error: "Error al consultar las reseñas" });
            }
            res.status(200).json(resenyas);
        });
    });
}