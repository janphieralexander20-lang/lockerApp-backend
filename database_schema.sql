-- 1. Tabla de Usuarios
CREATE TABLE usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_completo VARCHAR(100) NOT NULL,
    correo_institucional VARCHAR(100) UNIQUE NOT NULL,
    pin_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('estudiante', 'admin')) DEFAULT 'estudiante',
    estado_cuenta BOOLEAN DEFAULT TRUE
);

-- 2. Tabla de Casilleros (Hardware)
CREATE TABLE casilleros (
    id_casillero VARCHAR(20) PRIMARY KEY,
    bloque_ubicacion VARCHAR(100) NOT NULL,
    mac_esp32 VARCHAR(17) UNIQUE NOT NULL,
    estado_hardware VARCHAR(20) CHECK (estado_hardware IN ('operativo', 'mantenimiento', 'clausurado')) DEFAULT 'operativo'
);

-- 3. Tabla de Asignaciones (El préstamo al estudiante)
CREATE TABLE asignaciones (
    id_asignacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    id_casillero VARCHAR(20) REFERENCES casilleros(id_casillero) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NOT NULL,
    estado_asignacion VARCHAR(20) CHECK (estado_asignacion IN ('activa', 'vencida', 'revocada')) DEFAULT 'activa'
);

-- 4. Tabla de Historial de Accesos (Auditoría de Seguridad)
CREATE TABLE historial_accesos (
    id_evento UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_casillero VARCHAR(20) REFERENCES casilleros(id_casillero),
    id_usuario UUID REFERENCES usuarios(id_usuario),
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metodo_apertura VARCHAR(30) CHECK (metodo_apertura IN ('app_qr', 'app_boton', 'teclado_pin', 'intento_fallido_pin')),
    apertura_exitosa BOOLEAN NOT NULL
);
