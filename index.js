require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// La ruta de inicio (esta sí te funcionó)
app.get('/', (req, res) => {
    res.send('¡El servidor de lockerApp está funcionando a la perfección!');
});

// NUEVA RUTA: Obtener los casilleros
app.get('/api/casilleros', async (req, res) => {
    const { data, error } = await supabase
        .from('casilleros')
        .select('*');

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.json(data);
});

const PORT = process.env.PORT || 3000;
// NUEVA RUTA: Intentar abrir un casillero enviando credenciales
// RUTA TEMPORAL: Para generar un PIN seguro (Hash)
app.post('/api/crear-hash', async (req, res) => {
    const { pin } = req.body;
    // El '10' es el nivel de seguridad (salt rounds). Toma milisegundos generar esto.
    const pinEncriptado = await bcrypt.hash(pin, 10); 
    res.json({ pin_original: pin, pin_seguro: pinEncriptado });
});
app.post('/api/abrir', async (req, res) => {
    // 1. Recibimos los datos que envía la app móvil o el teclado
    const { correo, pin } = req.body;

    // 2. Buscamos al estudiante en la base de datos por su correo
    const { data: estudiante, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('correo_institucional', correo)
        .single(); // single() significa que solo esperamos un resultado

    // Si hay un error o el correo no existe
    if (error || !estudiante) {
        return res.status(404).json({ mensaje: '❌ Estudiante no encontrado' });
    }

    // 3. Verificamos el PIN 
    // 3. Verificamos el PIN con seguridad real (Bcrypt)
    // Compara el '1234' que envía la app, con el hash '$2a$10...' de la base de datos
    const pinValido = await bcrypt.compare(pin, estudiante.pin_hash);

    if (pinValido) {
        // Aquí es donde el servidor le enviaría la señal de voltaje al ESP32
        res.json({ mensaje: '🔓 ACCESO CONCEDIDO. Abriendo casillero...' });
    } else {
        // Si el PIN está mal, denegamos el acceso
        res.status(401).json({ mensaje: '🚫 PIN INCORRECTO. Acceso denegado.' });
    }
});
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});