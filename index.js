require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

    // ¡Éxito! Devolvemos TODOS los datos importantes del estudiante a la app
    res.json({ 
      mensaje: "Acceso concedido", 
      nombre: data.nombre,
      carrera: data.carrera || "", // Reemplaza con el nombre real de tu columna en Supabase si es distinto
      universidad: data.universidad || "",
      id_locker: data.id_locker || null // ¡Súper importante! Pon el nombre exacto de la columna donde guardas su locker
    });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor." });
  }
});
// RUTA: EDITAR PERFIL (Guardar nueva carrera y sede)
app.put('/api/editar', async (req, res) => {
  const { correo, carrera, universidad } = req.body;
  
  try {
    // Actualizamos los datos en Supabase buscando al usuario por su correo
    const { error } = await supabase
      .from('usuarios') // Asegúrate de que tu tabla se llame 'usuarios'
      .update({ carrera, universidad })
      .eq('correo', correo);

    if (error) {
      return res.status(400).json({ mensaje: "Error al actualizar en la base de datos." });
    }

    res.json({ mensaje: "Perfil actualizado con éxito." });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor." });
  }
});
// RUTA: GUARDAR RESERVA DEL CASILLERO
app.post('/api/reservar', async (req, res) => {
  const { correo, id_locker } = req.body;
  try {
    const { error } = await supabase
      .from('usuarios')
      .update({ id_locker: id_locker }) // <- IMPORTANTE: que coincida con tu columna en Supabase
      .eq('correo', correo);

    if (error) {
      console.log("Error de Supabase:", error); // Esto nos dejará verlo en Render
      return res.status(400).json({ mensaje: "Error al guardar casillero." });
    }
    res.json({ mensaje: "Reserva guardada en la nube con éxito." });
  } catch (error) {
    res.status(500).json({ mensaje: "Error del servidor." });
  }
});
// NUEVA RUTA: Liberar un locker
// NUEVA RUTA: Liberar un locker
// RUTA: FIRMAR CONTRATO Y RESERVAR CASILLERO (FEUST 2026-2027)
app.post('/api/firmar_contrato', async (req, res) => {
  const { rut, correo, torre, piso, n_casillero, firmaBase64 } = req.body;

  try {
    // 1. Limpiamos el texto de la imagen y la convertimos en un archivo real
    const base64Data = firmaBase64.replace(/^data:image\/\w+;base64,/, "");
    const firmaBuffer = Buffer.from(base64Data, 'base64');
    
    // 2. Creamos un nombre único para el archivo (Ej: firma_12345678-9_1680000.png)
    const nombreArchivo = `firma_${rut}_${Date.now()}.png`;

    // 3. Subimos la imagen al cajón 'firmas_contratos' en Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('firmas_contratos')
      .upload(nombreArchivo, firmaBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.log("Error Storage:", uploadError);
      return res.status(400).json({ mensaje: "No se pudo subir la firma." });
    }

    // 4. Pedimos el link público de la firma que acabamos de subir
    const { data: urlData } = supabase
      .storage
      .from('firmas_contratos')
      .getPublicUrl(nombreArchivo);
    
    const firmaUrl = urlData.publicUrl;

    // 5. Guardamos todo el contrato legal en la tabla de Supabase
    const { error: dbError } = await supabase
      .from('contratos_firmados')
      .insert([{
        rut: rut,
        correo: correo,
        torre: torre,
        piso: piso,
        n_casillero: n_casillero,
        firma_url: firmaUrl,
        monto_pagado: 10000,
        periodo: "2026-2027",
        fecha_firma: new Date().toISOString()
      }]);

    if (dbError) {
      console.log("Error BD:", dbError);
      return res.status(400).json({ mensaje: "Error al guardar el contrato legal." });
    }

    // 6. Finalmente, le asignamos el casillero al alumno en la tabla 'usuarios'
    await supabase.from('usuarios').update({ id_locker: n_casillero }).eq('correo', correo);

    // Si todo salió bien, le avisamos a la app móvil
    res.json({ 
      mensaje: "Contrato firmado y casillero reservado con éxito.", 
      url_documento: firmaUrl 
    });

  } catch (error) {
    console.error("Error crítico en el servidor:", error);
    res.status(500).json({ mensaje: "Error interno del servidor." });
  }
});
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