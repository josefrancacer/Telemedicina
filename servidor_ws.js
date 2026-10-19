// servidor_ws.js
var WebSocketServer = require("websocket").server;

module.exports = function (httpServer, datos) {
    var wsServer = new WebSocketServer({ httpServer: httpServer });
    var clientes = []; // Array para guardar: { connection, rol, idSesion }

    wsServer.on("request", function (request) {
        var connection = request.accept("hospital", request.origin);
        var cliente = { connection: connection, rol: null, idSesion: null };
        clientes.push(cliente);

        connection.on("message", function (message) {
            var msg = JSON.parse(message.utf8Data);

            switch (msg.operacion) {
                case "identificar":
                    // El cliente se loguea y nos dice quién es
                    cliente.rol = msg.rol; 
                    cliente.idSesion = msg.id;
                    break;

                case "aviso_recurso": // AZUL: Gestor -> Sanitarios conectados [cite: 352-357]
                    var textoAzul = "SE HA CREADO UN NUEVO RECURSO " + msg.categoria + " MODELO " + msg.modelo + " CON CÓDIGO " + msg.codigo;
                    clientes.forEach(c => {
                        if (c.rol === 'sanitario') {
                            c.connection.sendUTF(JSON.stringify({ texto: textoAzul, color: 'blue', origen: msg.origen }));
                        }
                    });
                    break;

                case "aviso_resenya": // VERDE: Sanitario -> Gestores conectados [cite: 358-360]
                    var textoVerde = "SE HA CREADO UNA RESEÑA PARA EL " + msg.categoria + " MODELO " + msg.modelo + " CON CÓDIGO " + msg.codigo + " Y PUNTUACIÓN " + msg.puntuacion;
                    clientes.forEach(c => {
                        if (c.rol === 'gestor') {
                            c.connection.sendUTF(JSON.stringify({ texto: textoVerde, color: 'green', origen: msg.origen }));
                        }
                    });
                    break;

                case "accion_reserva": // ROJO: Sanitario -> Sanitarios con reserva activa [cite: 349-351]
                    var textoRojo = "SE HA " + msg.tipoAccion + " LA RESERVA DEL " + msg.categoria + " MODELO " + msg.modelo + " CON CÓDIGO " + msg.codigo;
                    
                    // Buscamos quién tiene reserva activa de ese recurso en la BBDD en memoria
                    var sanitariosInteresados = datos.reservas
                        .filter(r => r.recurso == msg.idRecurso && r.fecha_fin == null)
                        .map(r => r.sanitario);

                    clientes.forEach(c => {
                        // Enviamos si es sanitario Y su ID está en la lista de interesados
                        if (c.rol === 'sanitario' && sanitariosInteresados.includes(c.idSesion)) {
                            c.connection.sendUTF(JSON.stringify({ texto: textoRojo, color: 'red', origen: msg.origen }));
                        }
                    });
                    break;
            }
        });

        connection.on("close", function () {
            // Limpiamos el array al desconectarse [cite: 367]
            clientes = clientes.filter(c => c.connection !== connection);
        });
    });
};