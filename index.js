require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

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
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});