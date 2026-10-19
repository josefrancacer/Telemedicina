
let sanitarios = [
    { id: 1, nombre: "Juan", apellidos: "Pérez", usuario: "juanp", password: "123" },
    { id: 2, nombre: "Ana", apellidos: "García", usuario: "anag", password: "456" },
    { id: 3, nombre: "Elena", apellidos: "Martínez", usuario: "elenam", password: "789" },
    { id: 4, nombre: "Roberto", apellidos: "Sánchez", usuario: "robertos", password: "000" },
    { id: 5, nombre: "Lucía", apellidos: "Gómez", usuario: "luciag", password: "111" },
    { id: 6, nombre: "David", apellidos: "Ruiz", usuario: "davidr", password: "222" },
    { id: 7, nombre: "Carmen", apellidos: "Ortiz", usuario: "carmeno", password: "333" },
    { id: 8, nombre: "Javier", apellidos: "López", usuario: "javierl", password: "444" },
    { id: 9, nombre: "Sofía", apellidos: "Navarro", usuario: "sofian", password: "555" }
];

let gestores = [
    { id: 1, nombre: "Carlos", apellidos: "Jefe", usuario: "admin", password: "admin" },
    { id: 2, nombre: "Laura", apellidos: "Sistemas", usuario: "laura", password: "admin" }
];

let ubicaciones = [
    { id: 1, nombre: "Planta 1 - Sala 101" },
    { id: 2, nombre: "Laboratorio Central" },
    { id: 3, nombre: "UCI - Box 4" },
    { id: 4, nombre: "Urgencias - Triaje" },
    { id: 5, nombre: "Almacén General" } // Equipos guardados
];

let categorias = [
    { id: 1, nombre: "Termómetros" },
    { id: 2, nombre: "Sillas de ruedas" },
    { id: 3, nombre: "Desfibriladores" },
    { id: 4, nombre: "Bombas de infusión" },
    { id: 5, nombre: "Monitores de constantes" }
];

let modelos = [
    { id: 1, nombre: "Termómetro Laser X200", categoria: 1, horas_maximas: 24 },
    { id: 2, nombre: "Termómetro Timpánico Pro", categoria: 1, horas_maximas: 48 },
    { id: 3, nombre: "Silla Plegable Ligera", categoria: 2, horas_maximas: 72 },
    { id: 4, nombre: "Desfibrilador Zoll X", categoria: 3, horas_maximas: 4 },
    { id: 5, nombre: "Bomba Alaris Plus", categoria: 4, horas_maximas: 24 },
    { id: 6, nombre: "Philips IntelliVue MX40", categoria: 5, horas_maximas: 12 }
];

let recursos = [
    { id: 1, modelo: 1, ubicacion: 1, numero_serie: "SN-998877", estado: 0 }, 
    { id: 2, modelo: 4, ubicacion: 3, numero_serie: "DEF-0012", estado: 0 },  
    { id: 3, modelo: 5, ubicacion: 3, numero_serie: "BMB-4451", estado: 2 },  
    { id: 4, modelo: 6, ubicacion: 4, numero_serie: "MNT-8821", estado: 0 },  
    { id: 5, modelo: 2, ubicacion: 4, numero_serie: "TMP-1100", estado: 1 },  
    { id: 6, modelo: 3, ubicacion: 5, numero_serie: "SR-0992", estado: 0 },   
    { id: 7, modelo: 4, ubicacion: 5, numero_serie: "DEF-0015", estado: 2 },  
    { id: 8, modelo: 5, ubicacion: 1, numero_serie: "BMB-4488", estado: 0 },
    { id: 9, modelo: 6, ubicacion: 3, numero_serie: "MNT-8822", estado: 0 },
    { id: 10, modelo: 6, ubicacion: 3, numero_serie: "MNT-8823", estado: 0 },
    { id: 11, modelo: 5, ubicacion: 2, numero_serie: "BMB-5001", estado: 0 },
    { id: 12, modelo: 5, ubicacion: 2, numero_serie: "BMB-5002", estado: 2 }, // En mantenimiento
    { id: 13, modelo: 4, ubicacion: 4, numero_serie: "DEF-0016", estado: 0 },
    { id: 14, modelo: 4, ubicacion: 4, numero_serie: "DEF-0017", estado: 0 },
    { id: 15, modelo: 1, ubicacion: 1, numero_serie: "SN-998878", estado: 0 },
    { id: 16, modelo: 1, ubicacion: 1, numero_serie: "SN-998879", estado: 0 },
    { id: 17, modelo: 2, ubicacion: 1, numero_serie: "TMP-1101", estado: 0 },
    { id: 18, modelo: 3, ubicacion: 5, numero_serie: "SR-0993", estado: 0 },
    { id: 19, modelo: 3, ubicacion: 4, numero_serie: "SR-0994", estado: 1 }, // Defectuoso
    { id: 20, modelo: 6, ubicacion: 2, numero_serie: "MNT-8824", estado: 0 }

];

let reservas = [
    // Reserva Finalizada (fecha_fin existe)
    { id: 1, recurso: 1, sanitario: 1, horas_estimadas: 2, fecha_peticion: "2023-10-25T10:00:00", fecha_inicio: "2023-10-25T10:30:00", fecha_fin: "2023-10-25T12:00:00" },
    // Reserva En Uso (iniciada hace poco, sin terminar)
    { id: 2, recurso: 2, sanitario: 3, horas_estimadas: 4, fecha_peticion: new Date(Date.now() - 3600000 * 2).toISOString(), fecha_inicio: new Date(Date.now() - 3600000 * 1).toISOString(), fecha_fin: null },
    // Reserva Excedida (iniciada hace mucho, horas_estimadas superadas)
    { id: 3, recurso: 4, sanitario: 2, horas_estimadas: 6, fecha_peticion: new Date(Date.now() - 3600000 * 48).toISOString(), fecha_inicio: new Date(Date.now() - 3600000 * 47).toISOString(), fecha_fin: null },
    // Reserva Pendiente Original (Corregida: fecha_inicio a null)
    { id: 4, recurso: 6, sanitario: 4, horas_estimadas: 24, fecha_peticion: new Date().toISOString(), fecha_inicio: null, fecha_fin: null },
    
    // Finalizadas históricas
    { id: 5, recurso: 9, sanitario: 5, horas_estimadas: 8, fecha_peticion: new Date(Date.now() - 3600000 * 48).toISOString(), fecha_inicio: new Date(Date.now() - 3600000 * 47).toISOString(), fecha_fin: new Date(Date.now() - 3600000 * 39).toISOString() },
    { id: 6, recurso: 11, sanitario: 6, horas_estimadas: 12, fecha_peticion: new Date(Date.now() - 3600000 * 72).toISOString(), fecha_inicio: new Date(Date.now() - 3600000 * 70).toISOString(), fecha_fin: new Date(Date.now() - 3600000 * 60).toISOString() },
    
    // En Uso actualmente
    { id: 7, recurso: 10, sanitario: 7, horas_estimadas: 12, fecha_peticion: new Date(Date.now() - 3600000 * 5).toISOString(), fecha_inicio: new Date(Date.now() - 3600000 * 4).toISOString(), fecha_fin: null },
    { id: 8, recurso: 13, sanitario: 8, horas_estimadas: 2, fecha_peticion: new Date(Date.now() - 3600000 * 1).toISOString(), fecha_inicio: new Date(Date.now() - 1800000).toISOString(), fecha_fin: null }, 
    
    // COLA DE ESPERA: Simulando congestión para el recurso 10 (Monitor Philips). 
    // Ya lo está usando el sanitario 7, y ahora el 9 y el 5 están en cola esperando.
    { id: 9, recurso: 10, sanitario: 9, horas_estimadas: 8, fecha_peticion: new Date(Date.now() - 3600000 * 2).toISOString(), fecha_inicio: null, fecha_fin: null },
    { id: 10, recurso: 10, sanitario: 5, horas_estimadas: 4, fecha_peticion: new Date(Date.now() - 3600000 * 1).toISOString(), fecha_inicio: null, fecha_fin: null },
    
    // Pendientes listas para retirar (El recurso está libre, tiempoRestante debe ser 0)
    { id: 11, recurso: 15, sanitario: 6, horas_estimadas: 2, fecha_peticion: new Date(Date.now() - 1800000).toISOString(), fecha_inicio: null, fecha_fin: null },
    { id: 12, recurso: 14, sanitario: 7, horas_estimadas: 4, fecha_peticion: new Date().toISOString(), fecha_inicio: null, fecha_fin: null }
];

let resenyas = [
    { id: 1, recurso: 1, sanitario: 1, fecha: new Date("2023-10-26"), valor: 5, descripcion: "Funciona perfectamente y la batería dura mucho." },
    { id: 2, recurso: 4, sanitario: 2, fecha: new Date("2023-11-10"), valor: 3, descripcion: "La pantalla táctil a veces no responde a la primera." },
    { id: 3, recurso: 5, sanitario: 3, fecha: new Date("2023-12-05"), valor: 1, descripcion: "Da error de calibración constantemente, por eso pedí la baja." },
    { id: 4, recurso: 2, sanitario: 3, fecha: new Date(), valor: 5, descripcion: "Equipo vital en UCI, estado impecable." }
];

// Exportamos todas las listas para que el servidor no dé error 404
module.exports = { 
    gestores: gestores,
    ubicaciones: ubicaciones,
    sanitarios: sanitarios,
    categorias: categorias,
    modelos: modelos,
    recursos: recursos,
    reservas: reservas,
    resenyas: resenyas
};