const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
require('dotenv').config({ quiet: true });

const app = express(); // 1. Primero se declara la app

const session = require('express-session'); // 2. Luego se importa la sesión
app.use(session({                           // 3. Y luego se usa app.use(session(...))
    secret: 'Byakko2026#',
    resave: false,
    saveUninitialized: false
}));

app.use(express.json());
app.use(express.static(__dirname));

// Middleware para proteger el panel
function verificarAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/login.html');
}

app.use(express.json());

// 1. Permite que Express lea tus archivos HTML y CSS de la carpeta
app.use(express.static(__dirname));

// 2. Ruta principal que abre tu página de login (o index) al entrar a la web
app.get('/', (req, res) => {  res.sendFile(__dirname + '/index.html');});

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
const db = databaseUrl
    ? mysql.createPool(databaseUrl)
    : mysql.createPool({
        host: process.env.DB_HOST || process.env.MYSQLHOST,
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER,
        password: process.env.DB_PASS || process.env.MYSQLPASSWORD,
        database: process.env.DB_NAME || process.env.MYSQLDATABASE,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
        queueLimit: 0
    });

app.get('/health', async (_req, res) => {
    try {
        await db.promise().query('SELECT 1');
        res.status(200).json({ status: 'ok' });
    } catch (_error) {
        res.status(503).json({ status: 'database_unavailable' });
    }
});

// Ruta para recibir la contraseña del login
app.post('/api/login', express.urlencoded({ extended: true }), (req, res) => {
    const { password } = req.body;
    
    // Cambia 'TuPassword123' por la contraseña que quieras usar
    if (password === 'Byakko2026#') {
        req.session.isAdmin = true;
        return res.redirect('/admin.html');
    } else {
        return res.send("<script>alert('Contraseña incorrecta'); window.location.href='/login.html';</script>");
    }
});

// 1. LOGIN DE DUEÑOS (CON CONTROL DE BLOQUEO
    // 1. LOGIN DE DUEÑOS SEGURO (CON CONTROL DE BLOQUEO)
    app.post('/api/login', (req, res) => {
        const { email, password } = req.body;
        
        // ATENCIÓN: Solo buscamos por email, pero ahora TRAEMOS el password de la BD
        const query = `
            SELECT id, nombre_gym, password, estado, fecha_vencimiento_app,
            DATEDIFF(fecha_vencimiento_app, CURDATE()) as dias_restantes
            FROM duenos
            WHERE email = ?
        `;

        // Ponemos "async" en el callback para poder usar "await" con bcrypt
        db.query(query, [email], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Si no existe el email
            if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });

           
            const dueno = results[0];

            // 🛑 VALIDACIÓN: Si la cuenta está pendiente, no puede iniciar sesión
            if (dueno.estado === 'pendiente') {
                return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por el administrador.' });
            }

            // Comparamos la contraseña en texto plano que llega con el hash de la BD
            const passwordValida = await bcrypt.compare(password, dueno.password);

            if (!passwordValida) {
                return res.status(401).json({ error: 'Credenciales incorrectas' });
            }

            // Si la contraseña es correcta, continúa con tu validación de días restantes
            if (dueno.dias_restantes < 0) {
                return res.status(403).json({
                    error: 'Tu acceso a Mi Gym se encuentra suspendido por falta de pago. Contacta a soporte técnico.'
                });
            }

            res.json({
                mensaje: 'Login exitoso',
                duenoId: dueno.id,
                nombreGym: dueno.nombre_gym,
                diasRestantes: dueno.dias_restantes
            });
        });
    });

// REGISTRO DE DUEÑOS
// REGISTRO DE DUEÑOS SEGURO (Con teléfono y estado pendiente)
// REGISTRO DE DUEÑOS
app.post('/api/registro-dueno', async (req, res) => {
    const { email, password, nombre_gym, telefono } = req.body;

    try {
        // Generamos el hash de la contraseña antes de guardarla
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Calculamos la fecha de vencimiento a 15 días para la prueba
        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

        // Incluimos la fecha de vencimiento en el INSERT para que no falle
        const query = `INSERT INTO duenos (email, password, nombre_gym, telefono, estado, fecha_vencimiento_app) VALUES (?, ?, ?, ?, 'pendiente', ?)`;

        db.query(query, [email, hashedPassword, nombre_gym, telefono, fechaVencimiento], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo ya está registrado.' });
                return res.status(500).json({ error: err.message });
            }
            res.json({ mensaje: 'Gimnasio registrado con éxito. Pendiente de aprobación.', id: result.insertId });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar la seguridad' });
    }
});

// 2. REPORTES BÁSICOS
app.get('/api/reportes', (req, res) => {
    const duenoId = req.query.duenoId;
    const query = `
        SELECT COUNT(*) as activos, IFNULL(SUM(monto_cuota), 0) as ingresos 
        FROM socios 
        WHERE dueno_id = ? AND (fecha_vencimiento >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))
    `;
    db.query(query, [duenoId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ activos: results[0].activos, ingresos: results[0].ingresos });
    });
});

// 3. PLANES / CUOTAS
app.get('/api/planes', (req, res) => {
    const duenoId = req.query.duenoId;
    db.query('SELECT * FROM planes WHERE dueno_id = ?', [duenoId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/planes', (req, res) => {
    const { nombre_plan, precio, duenoId } = req.body;
    db.query('INSERT INTO planes (nombre_plan, precio, dueno_id) VALUES (?, ?, ?)', [nombre_plan, precio, duenoId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Plan creado', id: result.insertId });
    });
});
// MODIFICAR PLAN
app.put('/api/planes/:id', (req, res) => {
    const { nombre_plan, precio, duenoId } = req.body;

    db.query(
        'UPDATE planes SET nombre_plan = ?, precio = ? WHERE id = ? AND dueno_id = ?',
        [nombre_plan, precio, req.params.id, duenoId],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Plan no encontrado' });
            }

            res.json({ mensaje: 'Plan actualizado' });
        }
    );
});

// ELIMINAR PLAN SOLO SI NO TIENE SOCIOS ASIGNADOS
app.delete('/api/planes/:id', (req, res) => {
    const { id } = req.params;
    const { duenoId } = req.query;

    db.query(
        'SELECT COUNT(*) AS cantidad FROM socios WHERE plan_id = ?',
        [id],
        (err, resultados) => {
            if (err) return res.status(500).json({ error: err.message });

            if (resultados[0].cantidad > 0) {
                return res.status(409).json({
                    error: 'No podés eliminar este plan porque tiene socios asignados.'
                });
            }

            db.query(
                'DELETE FROM planes WHERE id = ? AND dueno_id = ?',
                [id, duenoId],
                (error, result) => {
                    if (error) return res.status(500).json({ error: error.message });

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ error: 'Plan no encontrado' });
                    }

                    res.json({ mensaje: 'Plan eliminado' });
                }
            );
        }
    );
});
// 4. LISTAR SOCIOS (OCULTA MOROSOS DE MÁS DE 30 DÍAS)
app.get('/api/socios', (req, res) => {
    const duenoId = req.query.duenoId;
    const query = `
        SELECT * FROM socios 
        WHERE dueno_id = ? AND (fecha_vencimiento >= DATE_SUB(CURDATE(), INTERVAL 30 DAY))
    `;
    db.query(query, [duenoId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 5. CREAR SOCIO (Alta)
app.post('/api/socios', (req, res) => {
    const { nombre, apellido, plan_id, dni, whatsapp, monto_cuota, fecha_vencimiento, duenoId } = req.body;
    const query = 'INSERT INTO socios (nombre, apellido, plan_id, dni, whatsapp, monto_cuota, fecha_vencimiento, dueno_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [nombre, apellido, plan_id, dni, whatsapp, monto_cuota, fecha_vencimiento, duenoId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Socio registrado', id: result.insertId });
    });
});

// 6. MODIFICAR SOCIO
app.put('/api/socios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, plan_id, dni, whatsapp, monto_cuota, fecha_vencimiento } = req.body;
    const query = 'UPDATE socios SET nombre = ?, apellido = ?, plan_id = ?, dni = ?, whatsapp = ?, monto_cuota = ?, fecha_vencimiento = ? WHERE id = ?';
    db.query(query, [nombre, apellido, plan_id, dni, whatsapp, monto_cuota, fecha_vencimiento, id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Socio actualizado' });
    });
});

// 7. ELIMINAR SOCIO (Baja)
app.delete('/api/socios/:id', (req, res) => {
    db.query('DELETE FROM socios WHERE id = ?', [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Socio eliminado' });
    });
});

// 8. RENOVAR PAGO Y GUARDAR COMPROBANTE EN EL HISTORIAL
app.put('/api/socios/:id/pagar', async (req, res) => {
    const { id } = req.params;
    const meses = Number.parseInt(req.body.meses, 10) || 1;

    if (![1, 2, 3, 6, 12].includes(meses)) {
        return res.status(400).json({ error: 'Cantidad de meses inválida.' });
    }

    let connection;
    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();
        const buscarSocio = `
            SELECT s.id, s.nombre, s.apellido, s.whatsapp, s.dueno_id, s.fecha_vencimiento, p.precio
            FROM socios s
            JOIN planes p ON p.id = s.plan_id
            WHERE s.id = ?
        `;
        const [results] = await connection.query(buscarSocio, [id]);
        if (results.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Socio o plan no encontrado.' });
        }

        const socio = results[0];
        const monto = Number(socio.precio) * meses;
        const dias = meses * 30;
        await connection.query(
            `UPDATE socios
             SET fecha_vencimiento = DATE_ADD(GREATEST(fecha_vencimiento, CURDATE()), INTERVAL ? DAY), monto_cuota = ?
             WHERE id = ?`,
            [dias, monto, id]
        );
        const [vencimiento] = await connection.query('SELECT fecha_vencimiento FROM socios WHERE id = ?', [id]);
        const fechaVencimiento = vencimiento[0].fecha_vencimiento;
        const [result] = await connection.query(
            `INSERT INTO pagos (socio_id, dueno_id, monto, meses, fecha_vencimiento)
             VALUES (?, ?, ?, ?, ?)`,
            [id, socio.dueno_id, monto, meses, fechaVencimiento]
        );
        await connection.commit();
        res.json({
            mensaje: 'Pago registrado con éxito',
            comprobante: {
                id: result.insertId,
                nombre: `${socio.nombre} ${socio.apellido}`,
                whatsapp: socio.whatsapp,
                monto,
                meses,
                fecha_pago: new Date(),
                fecha_vencimiento: fechaVencimiento
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error al registrar el pago:', error);
        res.status(500).json({ error: 'No se pudo registrar el pago.' });
    } finally {
        if (connection) connection.release();
    }
});

app.get('/api/socios/:id/pagos', (req, res) => {
    db.query(
        `SELECT id, fecha_pago, monto, meses, fecha_vencimiento
         FROM pagos
         WHERE socio_id = ?
         ORDER BY fecha_pago DESC, id DESC`,
        [req.params.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// 9. RUTAS EXCLUSIVAS DEL SÚPER ADMIN (AYRTON)
app.get('/api/admin/duenos', (req, res) => {
    const query = 'SELECT id, email, nombre_gym, fecha_vencimiento_app, DATEDIFF(fecha_vencimiento_app, CURDATE()) as dias_restantes FROM duenos';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

    // Ruta para aprobar una cuenta pendiente
        app.put('/api/admin/duenos/:id/aprobar', (req, res) => {
            const { id } = req.params;
            const query = `
                UPDATE duenos 
                SET estado = 'activo', 
                    fecha_vencimiento_app = DATE_ADD(CURDATE(), INTERVAL 30 DAY) 
                WHERE id = ?
            `;
            db.query(query, [id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, mensaje: 'Cuenta aprobada correctamente' });
            });
        });
app.put('/api/admin/duenos/:id/licencia', (req, res) => {
    const { id } = req.params;
    const { accion } = req.body;
    let query = '';

    if (accion === 'activar') {
        query = "UPDATE duenos SET fecha_vencimiento_app = DATE_ADD(GREATEST(fecha_vencimiento_app, CURDATE()), INTERVAL 30 DAY) WHERE id = ?";
    } else if (accion === 'bloquear') {
        query = "UPDATE duenos SET fecha_vencimiento_app = DATE_SUB(CURDATE(), INTERVAL 1 DAY) WHERE id = ?";
    } else {
        return res.status(400).json({ error: 'Acción de licencia inválida.' });
    }
    db.query(query, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Licencia modificada' });
    });
});

  app.get('/api/rutinas/socio/:socioId', (req, res) => {
        const query = `
            SELECT texto_rutina, fecha_actualizacion
            FROM rutinas
            WHERE socio_id = ?
        `;

        db.query(query, [req.params.socioId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });

            if (results.length === 0) {
                return res.json({ existe: false, texto_rutina: '' });
            }

            res.json({
                existe: true,
                texto_rutina: results[0].texto_rutina,
                fecha_actualizacion: results[0].fecha_actualizacion
            });
        });
    });
// 10. RUTAS PARA RUTA DE ALUMNOS (MOBILE)
app.post('/api/rutinas', (req, res) => {
    const { socio_id, texto_rutina } = req.body;
    const query = 'INSERT INTO rutinas (socio_id, texto_rutina) VALUES (?, ?) ON DUPLICATE KEY UPDATE texto_rutina = ?';
    db.query(query, [socio_id, texto_rutina, texto_rutina], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Rutina guardada' });
    });
});

app.get('/api/rutinas/alumno', (req, res) => {
    const { dni } = req.query;

    if (!dni) {
        return res.status(400).json({ error: 'Ingresá un DNI válido.' });
    }

    const query = `
        SELECT
            s.nombre AS nombre,
            s.apellido AS apellido,
            r.texto_rutina AS texto_rutina,
            r.fecha_actualizacion AS fecha_actualizacion
        FROM socios AS s
        LEFT JOIN rutinas AS r ON r.socio_id = s.id
        WHERE s.dni = ?
        LIMIT 1
    `;

    db.query(query, [dni], (err, results) => {
        if (err) {
            console.error('Error al buscar rutina:', err);
            return res.status(500).json({ error: 'No se pudo consultar la rutina.' });
        }

        if (!results || results.length === 0) {
            return res.status(404).json({
                error: 'No se encontró un socio con ese DNI.'
            });
        }

        const socio = results[0];

        // Si el socio existe pero su texto_rutina está vacío/null
        if (!socio.texto_rutina) {
            return res.status(404).json({
                error: 'El socio existe, pero todavía no tiene ejercicios cargados.'
            });
        }

        return res.json(socio);
    });
});
// 1. REGISTRAR UN EVENTO EN EL HISTORIAL (Pago, Nota, Bloqueo, etc.)
app.post('/api/admin/historial', (req, res) => {
    const { dueno_id, tipo_evento, detalles } = req.body;
    
    const query = 'INSERT INTO historial_gimnasios (dueno_id, tipo_evento, detalles) VALUES (?, ?, ?)';
    db.query(query, [dueno_id, tipo_evento, detalles], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Historial registrado con éxito', id: result.insertId });
    });
});

// 2. OBTENER EL HISTORIAL DE UN GIMNASIO ESPECÍFICO
    app.get('/api/admin/historial/:dueno_id', (req, res) => {
        const duenoId = req.params.dueno_id;
        
        const query = `
            SELECT id, tipo_evento, detalles, fecha_evento 
            FROM historial_gimnasios 
            WHERE dueno_id = ? 
            ORDER BY fecha_evento DESC
        `;
        db.query(query, [duenoId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });

    // Middleware y rutas de autenticación
    function verificarAdmin(req, res, next) {
        if (req.session && req.session.isAdmin) {
            return next();
        }
        res.redirect('/login.html');
    }

    app.post('/login', express.urlencoded({ extended: true }), (req, res) => {
        const { password } = req.body;
        const PASSWORD_ADMIN = "tu_contraseña_secreta"; // Cámbiala por la que quieras

        if (password === PASSWORD_ADMIN) {
            req.session.isAdmin = true;
            res.redirect('/admin.html');
        } else {
            res.send("<script>alert('Contraseña incorrecta'); window.location.href='/login.html';</script>");
        }
    });

    app.get('/admin.html', verificarAdmin, (req, res) => {
        res.sendFile(__dirname + '/panel-secreto.html');
    });

    app.get('/logout', (req, res) => {
        req.session.destroy();
        res.redirect('/login.html');
    });


const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        const connection = await db.promise().getConnection();
        connection.release();
        app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
    } catch (error) {
        console.error('No se pudo iniciar: la conexión a MySQL fue rechazada.', error.message);
        process.exit(1);
    }
}

startServer();

