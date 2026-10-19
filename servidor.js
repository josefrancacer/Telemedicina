// servidor.js
var express = require('express');
var app = express();
var path = require('path');

var datos = require('./datos.js');

// Configuración básica
app.use(express.json());
app.use(express.static(path.join(__dirname, 'cliente_rest')));


require('./servidor_rest.js')(app, datos);


var servidorHTTP = app.listen(3000, function(){ 
    console.log("Servidor escuchando en puerto 3000");
});


