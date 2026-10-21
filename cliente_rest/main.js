var idGestorLogin = null;
var nombreGestorLogin = ""; // Para usar como origen en avisos WS
var categorias = [];
var modelos = [];
var ubicaciones = [];

// [P3-2] NUEVO: token JWT del gestor (se rellena en el login y se borra al salir)
var token = null;

// [P3-2] NUEVO: añade el token al final de una URL
//   "/api/categorias"         -> "/api/categorias?token=XXX"
//   "/api/recursos?modelo=2"  -> "/api/recursos?modelo=2&token=XXX"
function conToken(url) {
    return url + (url.indexOf("?") == -1 ? "?" : "&") + "token=" + token;
}

// [P3-2] NUEVO: si el servidor responde 401 (sin token o caducado) se vuelve al login.
// Devuelve true si la sesión ha caducado, para cortar la función que la llama.
function sesionCaducada(status) {
    if (status == 401 && token) {
        alert("La sesión ha caducado. Vuelve a iniciar sesión.");
        salir();
        return true;
    }
    return false;
}

// [P3-2] CAMBIO: antes aquí se cargaban categorías, modelos y ubicaciones,
//        pero ahora esos servicios necesitan el token, así que se cargan
//        después del login (ver cargarDesplegables).
//        El ranking sí se puede cargar aquí: es del Ministerio y no usa token.
window.onload = function() {
    cargarRanking();
};

// [P3-2] NUEVO: carga categorías, modelos y ubicaciones (con token).
// Solo se cargan una vez: si se sale y se vuelve a entrar, ya están cargados
// y no se repiten las opciones de los desplegables.
var desplegablesCargados = false;
function cargarDesplegables(callback) {
    if (desplegablesCargados) return callback();

    rest.get(conToken("/api/categorias"), function(s, r) {
        categorias = r || [];
        rest.get(conToken("/api/modelos"), function(s, r) {
            modelos = r || [];
            rest.get(conToken("/api/ubicaciones"), function(s, r) {
                ubicaciones = r || [];
                rellenarSelects();
                desplegablesCargados = true;
                callback();
            });
        });
    });
}

var ws; // Variable global para el websocket

function iniciarWebSocket(rol, idUsuario) {
    ws = new WebSocket("ws://localhost:3000", "hospital"); 
    
    ws.addEventListener("open", function () {
        ws.send(JSON.stringify({
            operacion: "identificar",
            rol: rol,
            id: idUsuario
        }));
    });

    ws.addEventListener("message", function (event) {
        var msg = JSON.parse(event.data);
        var tbody = document.getElementById("tabla-avisos");
        if (!tbody) return;
        var fecha = new Date().toLocaleString();
        var fila = "<tr style='background-color:" + msg.color + "; color: white;'>" +
            "<td>" + fecha + "</td>" +
            "<td>" + (msg.origen || "") + "</td>" +
            "<td>" + msg.texto + "</td>" +
            "</tr>";
        tbody.innerHTML = fila + tbody.innerHTML;
    });
}

function rellenarSelects() {
    var sUbi = [document.getElementById('bus-ubi'), document.getElementById('f-ubi')];
    var sCat = [document.getElementById('bus-cat'), document.getElementById('f-cat')];

    var opcionesUbi = ubicaciones.map(u => "<option value='" + u.id + "'>" + u.nombre + "</option>").join("");
    var opcionesCat = categorias.map(c => "<option value='" + c.id + "'>" + c.nombre + "</option>").join("");

    sUbi.forEach(s => { if(s) s.innerHTML += opcionesUbi; });
    sCat.forEach(s => { if(s) s.innerHTML += opcionesCat; });

    actualizarModelosFicha();
}

//AUXILIARES

function cambiarSeccion(id) {
    var s = document.getElementsByClassName('seccion');
    for(var i=0;i<s.length;i++) s[i].classList.remove('activa');
    document.getElementById(id).classList.add('activa');
}

function salir() {
    token = null;   // [P3-2] NUEVO: borrar el token al salir
    idGestorLogin = null;
    nombreGestorLogin = "";
    if (ws) { ws.close(); ws = null; }
    document.getElementById('info-usuario').style.display = 'none';
    document.getElementById('usuario').value = "";
    document.getElementById('password').value = "";
    var tbody = document.getElementById("tabla-avisos");
    if (tbody) tbody.innerHTML = "";
    cambiarSeccion('login');
}

function abrirFicha(id) {
    rest.get(conToken("/api/recursos/" + id), function(s, datos) {   // [P3-2] con token
        if (sesionCaducada(s)) return;                                  // [P3-2]
        document.getElementById('recurso-id').value = datos.id;
        var modeloInfo = modelos.find(m => m.id == datos.modelo);
        if (modeloInfo) {
            document.getElementById('f-cat').value = modeloInfo.categoria;
            actualizarModelosFicha();
            document.getElementById('f-mod').value = datos.modelo;
        }
        document.getElementById('f-sn').value = datos.numero_serie;
        document.getElementById('f-ubi').value = datos.ubicacion;
        document.getElementById('f-est').value = datos.estado;
    });

    rest.get(conToken("/api/recursos/" + id + "/reservas"), function(s, reservas) {   // [P3-2] con token
        var cuerpo = document.getElementById("cuerpo-reservas");
        var filas = "";
        if(!reservas) reservas = [];
        
        reservas.forEach(function(r) {
            var sanitario = r.sanitario;
            var horas_estimadas = r.horas_estimadas;
            var fecha_peticion = new Date(r.fecha_peticion).toLocaleDateString();
            var fecha_inicio = r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleDateString() : "No iniciada";
            var fecha_fin = r.fecha_fin ? new Date(r.fecha_fin).toLocaleDateString() : "En curso";
            
            var clase = "";
            var ahora = new Date();
            var inicio = r.fecha_inicio ? new Date(r.fecha_inicio) : null;
            var fin = r.fecha_fin ? new Date(r.fecha_fin) : null;

            if (fin) {
                clase = "reserva-finalizada"; // ⚪
            } else if (inicio && ahora < inicio) {
                clase = "reserva-pendiente"; // 🟢
            } else if (inicio && !fin) {
                var horasTranscurridas = (ahora - inicio) / (1000 * 60 * 60);
                if (horasTranscurridas > horas_estimadas) {
                    clase = "reserva-excedida"; // 🔴
                } else {
                    clase = "reserva-en-uso"; // 🔵
                }
            }

            filas += "<tr class='" + clase + "'>" +
                "<td>" + sanitario + "</td>" +
                "<td>" + horas_estimadas + " h</td>" +
                "<td>" + fecha_peticion + "</td>" +
                "<td>" + fecha_inicio + "</td>" +
                "<td>" + fecha_fin + "</td>" +
            "</tr>";
        });
        cuerpo.innerHTML = filas;
    });

    rest.get(conToken("/api/recursos/" + id + "/resenyas"), function(s, resenyas) {   // [P3-2] con token
        var cuerpo = document.getElementById("cuerpo-resenyas");
        var filas = "";
        if(!resenyas) resenyas = [];
        
        resenyas.forEach(function(r) {
            var sanitario = r.sanitario;
            var fecha = new Date(r.fecha).toLocaleDateString();
            var valor = r.valor;
            var comentario = r.descripcion;

            filas += "<tr>" +
                "<td>" + fecha + "</td>" +
                "<td>" + sanitario + "</td>" +
                "<td>" + valor + " / 5</td>" +
                "<td>" + comentario + "</td>" +
            "</tr>";
        });
        cuerpo.innerHTML = filas;
        cambiarSeccion('seccion-ficha');
    });
}

//ACCESO LOGIN

function entrar() {
    console.log("Paso 1: Botón pulsado");
    var usuario = document.getElementById('usuario').value;
    var password = document.getElementById('password').value;
    console.log("Paso 2: Datos leídos del HTML ->", usuario, password);

    rest.post("/api/gestores/login", { usuario: usuario, password: password }, function(status, resp) {
        console.log("Paso 3: Respuesta del servidor recibida -> Status:", status, "Datos:", resp);
        
        if(status == 200) {
            idGestorLogin = resp.id;
            token = resp.token;   // [P3-2] NUEVO: guardar el token

            // [P3-2] CAMBIO: primero se cargan los desplegables (ya con token)
            //        y después el perfil y el listado
            cargarDesplegables(function () {
                rest.get(conToken("/api/gestores/" + idGestorLogin), function(s, datos) {   // [P3-2] con token
                    console.log("Paso 4: Perfil cargado ->", datos);
                    document.getElementById('nombre-gestor').innerText = datos.nombre + " " + datos.apellidos;
                    nombreGestorLogin = datos.nombre + " " + datos.apellidos;
                    document.getElementById('info-usuario').style.display = 'flex';
                    cambiarSeccion('seccion-listado');
                    buscar();
                    cargarRanking();   // [P3-1] refrescar el ranking al entrar
                    iniciarWebSocket('gestor', resp.id);
                });
            });
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    });
}

//REGISTRO

function registro() {
    document.getElementById('gestor-id').value = "";
    document.getElementById('gestor-nombre').value = "";
    document.getElementById('gestor-apellidos').value = "";
    document.getElementById('gestor-usuario').value = "";
    document.getElementById('gestor-pass').value = "";

    cambiarSeccion('registro');
}

function editarPerfil() {
    rest.get(conToken("/api/gestores/" + idGestorLogin), function(status, datos) {   // [P3-2] con token
        if (sesionCaducada(status)) return;                                           // [P3-2]
        if(status == 200) {
            document.getElementById('gestor-id').value = datos.id;
            document.getElementById('gestor-nombre').value = datos.nombre;
            document.getElementById('gestor-apellidos').value = datos.apellidos;
            document.getElementById('gestor-usuario').value = datos.usuario;
            
           
            document.getElementById('gestor-pass').value = ""; 

            cambiarSeccion('registro');
        } else {
            alert("Error al cargar los datos del perfil.");
        }
    });
}

function guardarGestor() {
    var id = document.getElementById('gestor-id').value;
    var pass = document.getElementById('gestor-pass').value;

    
    var datos = {
        nombre: document.getElementById('gestor-nombre').value,
        apellidos: document.getElementById('gestor-apellidos').value,
        login: document.getElementById('gestor-usuario').value
    };


    if (pass !== "") {
        datos.password = pass; 
    } else {
        if (!id) {
            alert("¡Debes establecer una contraseña inicial!");
            return; 
        }
    }

    
    if(id) {
        rest.put(conToken("/api/gestores/" + id), datos, function(s) {   // [P3-2] con token
            if (sesionCaducada(s)) return;                                // [P3-2]
            alert("Perfil actualizado correctamente");
            cambiarSeccion('seccion-listado');
        });
    } else {
        // El registro es público: va SIN token
        rest.post("/api/gestores", datos, function(s) {
            alert("Gestor creado");
            cambiarSeccion('login');
        });
    }
}



//INCICIO

//BUSCAR
function buscar() {
    var params = [];
    
    
    var elCat = document.getElementById('bus-cat');
    var elMod = document.getElementById('bus-mod');
    var elUbi = document.getElementById('bus-ubi');
    var elEst = document.getElementById('bus-est');

    if(elCat && elCat.value != "0" && elCat.value != "o") params.push("categoria=" + elCat.value);
    if(elMod && elMod.value != "0") params.push("modelo=" + elMod.value);
    if(elUbi && elUbi.value != "0") params.push("ubicacion=" + elUbi.value);
    if(elEst && elEst.value !== "all" && elEst.value != "-1") params.push("estado=" + elEst.value);

    var url = "/api/recursos" + (params.length ? "?" + params.join("&") : "");

    rest.get(conToken(url), function(status, respuesta) {   // [P3-2] con token
        if (sesionCaducada(status)) return;                   // [P3-2]
        var cuerpo = document.getElementById('cuerpo-recursos');
        
        if(status != 200 || !Array.isArray(respuesta)) {
            cuerpo.innerHTML = "<tr><td colspan='6' style='text-align:center; color:red; padding:20px;'>No se encontraron resultados o hubo un error</td></tr>";
            return;
        }

        var filas = "";
        respuesta.forEach(function(r) {
            var m = modelos.find(item => item.id == r.modelo);
            var c = m ? categorias.find(item => item.id == m.categoria) : null;
            var u = ubicaciones.find(item => item.id == r.ubicacion);
            var estadosStr = ["Operativo", "Baja", "Mantenimiento"];

            filas += "<tr>" +
                "<td>" + (r.numero_serie || "S/N") + "</td>" +
                "<td>" + (c ? c.nombre : "N/A") + "</td>" +
                "<td>" + (m ? m.nombre : "N/A") + "</td>" +
                "<td>" + (u ? u.nombre : "N/A") + "</td>" +
                "<td>" + (estadosStr[r.estado] || "Desconocido") + "</td>" +
                "<td><button onclick='abrirFicha(" + r.id + ")'>Abrir</button> " +
                "<button class='cancelar' onclick='borrarRecurso(" + r.id + ")'>X</button></td>" +
            "</tr>";
        });

        cuerpo.innerHTML = filas;
    });
}

//ABRIR FICHA NUEVO
function abrirFichaNuevo() {
    document.getElementById('recurso-id').value = "";
    document.getElementById('f-sn').value = "";
    actualizarModelosFicha();
    document.getElementById('cuerpo-reservas').innerHTML = "";
    document.getElementById('cuerpo-resenyas').innerHTML = "";
    cambiarSeccion('seccion-ficha');
}


//RECURSO
function volverAListado() {
    cambiarSeccion('seccion-listado');
    buscar();
}
//GUARDAR RECURSO
function guardarRecurso() {
    var id = document.getElementById('recurso-id').value;
    
    // Guardamos los elementos <select> enteros para poder extraer su texto luego
    var selectMod = document.getElementById('f-mod');
    var selectCat = document.getElementById('f-cat'); // Asumo que el id de tu select de categoría es 'f-cat'

    var d = {
        modelo: Number(selectMod.value),
        numero_serie: document.getElementById('f-sn').value,
        ubicacion: Number(document.getElementById('f-ubi').value),
        estado: Number(document.getElementById('f-est').value)
    };

    if(id) {
        rest.put(conToken("/api/recursos/" + id), d, function(status) {   // [P3-2] con token
            if (sesionCaducada(status)) return;                            // [P3-2]
            if(status === 200) {
                alert("Recurso actualizado"); 
                cambiarSeccion('seccion-listado'); 
                buscar(); 
            }
        });
    } else {
        // Le pedimos al callback que nos dé el estado (s) y la respuesta del servidor
        rest.post(conToken("/api/recursos"), d, function(status, respuesta) {   // [P3-2] con token
            if (sesionCaducada(status)) return;                                // [P3-2]
            
            // SOLO enviamos el aviso si el servidor confirma que lo ha guardado (201 Created)
            if(status === 201) {
                alert("Recurso creado"); 

                // Extraemos el TEXTO visible de los desplegables (Ej: "Termómetro")
                var nombreModText = selectMod.options[selectMod.selectedIndex].text;
                var nombreCatText = selectCat.options[selectCat.selectedIndex].text;

                // Ahora sí disparamos el WebSocket
                ws.send(JSON.stringify({
                    operacion: "aviso_recurso",
                    categoria: nombreCatText, 
                    modelo: nombreModText,
                    codigo: d.numero_serie,
                    origen: nombreGestorLogin
                }));

                cambiarSeccion('seccion-listado'); 
                buscar(); 
            } else {
                alert("Hubo un error al crear el recurso.");
            }
        });
    }
}

function actualizarModelosFicha() {
    var comboCat = document.getElementById('f-cat');
    var cb = document.getElementById('f-mod');
    if(!comboCat || !cb) return;
    var opciones = modelos.filter(m => m.categoria == comboCat.value)
                         .map(m => "<option value='" + m.id + "'>" + m.nombre + "</option>").join("");
    cb.innerHTML = opciones;
}

//BORRAR RECURSO
function borrarRecurso(id) {
    if (!confirm("¿Seguro que quieres borrar este recurso?")) return;

    rest.delete(conToken("/api/recursos/" + id), function(status) {   // [P3-2] con token
        if (sesionCaducada(status)) return;                            // [P3-2]
        if (status === 200) {
            // refresca la tabla
            buscar();
        } else if (status === 404) {
            alert("Ese recurso ya no existe.");
            buscar();
        } else {
            alert("Error al borrar el recurso (status " + status + ")");
        }
    });
}
// ==========================================================================
// [P3-1] NUEVO: API DEL MINISTERIO DE SANIDAD (llamadas desde el cliente)
// --------------------------------------------------------------------------
// PEGAR TODO ESTE BLOQUE EN EL main.js DE LA APP DEL GESTOR (al final).
//
// Cómo funciona:
//   1. Los datos de las reservas se obtienen de NUESTRO servidor con los
//      servicios REST que ya existían (con rest.get, que lleva el token).
//   2. Con esos datos se monta el objeto del enunciado y se envía al
//      Ministerio con fetch.
//   3. El ranking se pide al Ministerio con fetch y se cuenta aquí.
//
// ¿Por qué fetch y no rest.get para el Ministerio? Porque rest.js añade
// nuestro token JWT en cada petición, y no hay que mandárselo a un servidor
// externo (además, esa cabecera haría que el navegador la bloqueara por CORS).
// ==========================================================================

var URL_MINISTERIO = "https://undefined.ua.es/telemedicina/api/datos";   // pon la URL real
var ID_AREA = 2;   // nuestra área asignada (Anestesiología)

var AREAS_MEDICAS = {
    1: "Alergología",       2: "Anestesiología",   3: "Cardiología",
    4: "Cirugía General",   5: "Dermatología",     6: "Aparato Digestivo",
    7: "Endocrinología",    8: "Ginecología",      9: "Hematología",
    10: "Medicina Interna", 11: "Neumología",      12: "Neurología",
    13: "Oftalmología",     14: "Oncología",       15: "Pediatría",
    16: "Psiquiatría",      17: "Traumatología",   18: "Urología"
};

// rest.get convertido en promesa, para poder esperar varias peticiones a la vez
// con Promise.all (hay que pedir las reservas de cada recurso y cada sanitario)
function pedir(url) {
    return new Promise(function (resolve, reject) {
        rest.get(conToken(url), function (status, respuesta) {   // [P3-2] con el token
            if (status == 200) resolve(respuesta);
            else reject(new Error("Error " + status + " en " + url));
        });
    });
}

// Date o texto de fecha -> "YYYY-MM-DD" (o "YYYY-MM-DD HH:mm:ss" si conHora)
function formatearFechaMinisterio(fecha, conHora) {
    if (!fecha) return null;
    var d = new Date(fecha);
    var dos = function (n) { return String(n).padStart(2, "0"); };
    var texto = d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
    if (conHora) texto += " " + dos(d.getHours()) + ":" + dos(d.getMinutes()) + ":" + dos(d.getSeconds());
    return texto;
}

// Reúne TODAS las reservas con los campos que pide el Ministerio.
// Usa solo servicios que ya existían en el servidor:
//   /api/recursos, /api/modelos, /api/categorias,
//   y /api/recursos/:id/reservas
function recopilarReservas() {
    var categoriaDeRecurso = {};   // id recurso -> nombre de su categoría

    // 1. Recursos, modelos y categorías a la vez
    return Promise.all([pedir("/api/recursos"), pedir("/api/modelos"), pedir("/api/categorias")])
    .then(function (resultados) {
        var recursos = resultados[0], modelos = resultados[1], categorias = resultados[2];

        recursos.forEach(function (recurso) {
            var modelo = modelos.find(function (m) { return m.id == recurso.modelo; });
            var categoria = modelo ? categorias.find(function (c) { return c.id == modelo.categoria; }) : null;
            categoriaDeRecurso[recurso.id] = categoria ? categoria.nombre : "";
        });

        // 2. Las reservas de cada recurso
        return Promise.all(recursos.map(function (recurso) {
            return pedir("/api/recursos/" + recurso.id + "/reservas");
        }));
    })
    .then(function (listasDeReservas) {
        // Juntar todas las listas en una sola
        var reservas = [].concat.apply([], listasDeReservas);

        // 3. Montar cada registro con el formato del enunciado
        //    (nombre y apellidos ya vienen en la reserva gracias al JOIN del servidor)
        return reservas.map(function (r) {
            return {
                "nombre": r.nombre_sanitario,
                "apellidos": r.apellidos_sanitario,
                "categoría": categoriaDeRecurso[r.recurso],      // con tilde, como en el enunciado
                "horas_estimadas": r.horas_estimadas,
                "fec_pet": formatearFechaMinisterio(r.fecha_peticion, true),
                "fec_ini": formatearFechaMinisterio(r.fecha_inicio, true),
                "fecha_fin": formatearFechaMinisterio(r.fecha_fin, true)
            };
        });
    });
}

// Botón "Enviar reservas al Ministerio"
function enviarReservasMinisterio() {
    var estado = document.getElementById("estado-envio");
    estado.textContent = " Enviando...";

    recopilarReservas()
    .then(function (datos) {
        var cuerpo = {
            id_area: ID_AREA,
            fecha: formatearFechaMinisterio(new Date(), false),
            datos: datos
        };

        return fetch(URL_MINISTERIO, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpo)
        })
        .then(function (respuesta) {
            if (!respuesta.ok) throw new Error("El Ministerio respondió " + respuesta.status);
            estado.textContent = " Enviadas " + datos.length + " reservas";
            cargarRanking();   // refresca el ranking con lo recién enviado
        });
    })
    .catch(function (error) {
        console.log("Error enviando al Ministerio:", error);
        estado.textContent = " Error al enviar al Ministerio";
    });
}

// Cuenta cuántas reservas DISTINTAS hay por área en lo que devuelve el Ministerio.
//
// El GET devuelve una lista de ENVÍOS:
//   [ { id: 5223, id_area: 3, fecha: "...", datos: [ {reserva}, {reserva}, ... ] }, ... ]
//
// Problema: cada vez que un grupo pulsa "Enviar" manda OTRA VEZ todas sus
// reservas, así que la misma reserva aparece repetida en muchos envíos.
// Si se suman los datos de todos los envíos, el ranking sale inflado.
//
// Solución: para cada área se guarda un conjunto (Set) de "claves" de reserva.
// Dos reservas con los mismos datos generan la misma clave, y el Set solo la
// guarda una vez. Al final, el tamaño del Set es el número de reservas reales.
//
// También se limpian los datos que mandan otros grupos con formatos distintos:
//   - "categoría" (con tilde) o "categoria" (sin tilde)
//   - "fecha_fin" o "fec_fin"
//   - mayúsculas / espacios distintos en los textos
//   - fechas con hora o sin hora ("2026-03-22" y "2026-03-22T10:00:00Z")
//   - la misma reserva enviada en distintos estados (pendiente, en uso, finalizada)
//   - áreas que no existen (p. ej. id_area 911) o envíos sin array de datos
function contarPorArea(envios) {
    var reservasPorArea = {};   // id_area -> Set de claves de reserva

    // ---- GESTIÓN DE NULOS Y VALORES VACÍOS ----
    // Cada grupo manda los "vacíos" de una forma distinta: null, undefined,
    // "", "   ", "null", "undefined" o la fecha cero de MySQL "0000-00-00".
    // esVacio() los trata todos igual.
    function esVacio(valor) {
        if (valor === null || valor === undefined) return true;
        var texto = String(valor).trim().toLowerCase();
        return texto === "" || texto === "null" || texto === "undefined" ||
               texto === "nan" || texto.indexOf("0000-00-00") === 0;
    }

    // Texto en minúsculas y sin espacios sobrantes ("" si está vacío)
    function limpiar(valor) {
        return esVacio(valor) ? "" : String(valor).trim().toLowerCase();
    }

    // CAMBIO: antes soloFecha() se quedaba solo con el día ("YYYY-MM-DD").
    // Ahora se guarda la fecha CON HORA, porque un sanitario puede pedir el
    // mismo recurso varias veces el mismo día y son reservas distintas.
    // Todos los formatos se pasan a uno común con new Date(...).toISOString(),
    // así "2026-03-22T09:00:00.000Z" y "2026-03-22 11:00:00" (hora de Madrid)
    // dan el mismo resultado si son el mismo instante.
    //   "2026-03-22", "2026-03-22 10:00:00", "2026-03-22T10:00:00.000Z"
    //   y "22/03/26 10:00:00" (día/mes/año)
    function normalizarFecha(valor) {
        if (esVacio(valor)) return "";
        var texto = String(valor).trim();

        // dd/mm/aa hh:mm:ss  ->  aaaa-mm-ddThh:mm:ss
        var dma = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](.*))?$/);
        if (dma) {
            var anyo = dma[3].length == 2 ? "20" + dma[3] : dma[3];
            texto = anyo + "-" + dma[2].padStart(2, "0") + "-" + dma[1].padStart(2, "0") +
                    (dma[4] ? "T" + dma[4] : "");
        }

        var fecha = new Date(texto.replace(" ", "T"));
        if (isNaN(fecha.getTime())) return texto;   // formato desconocido: se usa tal cual
        return fecha.toISOString();
    }

    if (!Array.isArray(envios)) return {};

    envios.forEach(function (envio) {
        if (!envio) return;
        var area = Number(envio.id_area);
        if (!AREAS_MEDICAS[area]) return;            // área nula o desconocida -> se ignora
        if (!Array.isArray(envio.datos)) return;     // envío sin array de datos -> se ignora

        envio.datos.forEach(function (r) {
            if (!r || typeof r !== "object") return; // registro nulo o que no es un objeto

            var nombre    = limpiar(r.nombre);
            var apellidos = limpiar(r.apellidos);
            var categoria = limpiar(r["categoría"] != null ? r["categoría"] : r.categoria);
            var horas     = limpiar(r.horas_estimadas);
            var fechaPet  = normalizarFecha(r.fec_pet);   // CAMBIO: antes soloFecha(r.fec_pet)

            // Campos OBLIGATORIOS: si falta cualquiera, el registro no es una
            // reserva válida y se DESCARTA (no se cuenta).
            // fec_ini y fecha_fin NO son obligatorios: son null con normalidad
            // cuando la reserva está pendiente o en uso.
            if (nombre === "" || apellidos === "" || categoria === "" ||
                horas === "" || fechaPet === "") {
                return;
            }

            // La clave solo usa datos que no cambian durante la vida de la
            // reserva (por eso tampoco lleva fec_ini ni fecha_fin).
            var clave = [nombre, apellidos, categoria, horas, fechaPet].join("|");

            if (!reservasPorArea[area]) reservasPorArea[area] = new Set();
            reservasPorArea[area].add(clave);        // si ya estaba, no se añade otra vez
        });
    });

    // Pasamos de Set a número
    var totales = {};
    Object.keys(reservasPorArea).forEach(function (area) {
        totales[area] = reservasPorArea[area].size;
    });
    return totales;
}

// Pide al Ministerio todos sus datos y pinta el ranking ordenado de mayor a menor
function cargarRanking() {
    var cuerpo = document.getElementById("cuerpo-ranking");

    fetch(URL_MINISTERIO)
    .then(function (respuesta) {
        if (!respuesta.ok) throw new Error("El Ministerio respondió " + respuesta.status);
        return respuesta.json();
    })
    .then(function (contenido) {
        var totales = contarPorArea(contenido);

        var ranking = Object.keys(totales).map(function (area) {
            return { nombre: AREAS_MEDICAS[area], total: totales[area] };
        });
        ranking.sort(function (a, b) { return b.total - a.total; });

        if (ranking.length == 0) {
            cuerpo.innerHTML = "<tr><td colspan='3'>Todavía no hay datos</td></tr>";
            return;
        }

        var medallas = ["🥇", "🥈", "🥉"];
        cuerpo.innerHTML = ranking.map(function (fila, i) {
            return "<tr>" +
                "<td>" + (medallas[i] || (i + 1)) + "</td>" +
                "<td>" + fila.nombre + "</td>" +
                "<td style='text-align:right'>" + fila.total.toLocaleString("es-ES") + "</td>" +
                "</tr>";
        }).join("");
    })
    .catch(function (error) {
        console.log("Error obteniendo el ranking:", error);
        cuerpo.innerHTML = "<tr><td colspan='3'>No se pudo obtener el ranking</td></tr>";
    });
}
