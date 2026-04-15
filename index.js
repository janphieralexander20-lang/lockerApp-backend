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

// NUEVA RUTA: Obtener todos los lockers (Conectada a la nueva tabla)
app.get('/api/lockers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lockers')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      return res.status(400).json({ mensaje: "Error al obtener lockers: " + error.message });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
});
const PORT = process.env.PORT || 3000;

// RUTA: REGISTRAR (Ahora guarda el nombre en Supabase)
app.post('/api/registrar', async (req, res) => {
  const { nombre, correo, pin } = req.body;
  try {
    const pinEncriptado = await bcrypt.hash(pin, 10);
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{ nombre: nombre, correo: correo, pin: pinEncriptado }]);

    if (error) return res.status(400).json({ mensaje: "Error: " + error.message });
    res.json({ mensaje: "¡Usuario registrado con éxito!" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor." });
  }
});

// RUTA: LOGIN (Ahora devuelve el nombre a la app)
app.post('/api/abrir', async (req, res) => {
  const { correo, pin } = req.body;
  try {
    // Buscamos al usuario por correo
    const { data, error } = await supabase.from('usuarios').select('*').eq('correo', correo).single();
    
    if (error || !data) return res.status(400).json({ mensaje: "Usuario no encontrado." });

    // Comparamos el PIN
    const pinValido = await bcrypt.compare(pin, data.pin);
    if (!pinValido) return res.status(400).json({ mensaje: "PIN incorrecto." });

    // ¡Éxito! Devolvemos el nombre del estudiante
    res.json({ mensaje: "Acceso concedido", nombre: data.nombre });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor." });
  }
});
// NUEVA RUTA: Liberar un locker
// NUEVA RUTA: Liberar un locker
app.post('/api/liberar', async (req, res) => {
  const { id_locker, correo } = req.body;

  try {
    // 1. Buscamos el locker y lo marcamos como disponible
    const { error: errorLocker } = await supabase
      .from('lockers')
      // OJO: Si tu columna en Supabase se llama "estado", cambia "ocupado: false" por "estado: 'disponible'"
     .update({ estado: 'disponible', usuario_correo: null, reserved_at: null })
      .eq('id', id_locker);

    if (errorLocker) throw errorLocker;

    // ¡EL PASO CLAVE! Le avisamos a la app móvil que todo salió perfecto
    res.status(200).json({ mensaje: "Locker liberado con éxito" });

  } catch (error) {
    // Si algo sale mal, lo imprimimos en Render para verlo y le avisamos a la app
    console.error("🔥 Error al liberar locker:", error);
    res.status(500).json({ mensaje: "Error del servidor", detalle: error.message });
  }
});
// Encendemos el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});