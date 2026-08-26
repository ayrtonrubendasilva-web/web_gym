const express = require('express');
const mysql = require('mysql2');

const app = express(); 
app.use(express.json());

// 1. Permite que Express lea tus archivos HTML y CSS de la carpeta
app.use(express.static(__dirname));

// 2. Ruta principal que abre tu página de login (o index) al entrar a la web
app.get('/', (req, res) => {  res.sendFile(__dirname + '/index.html');});

// Si existe la variable DATABASE_URL...
const connectionString = process.env.DATABASE_URL || 'mysql://usuario:contraseña@localhost:3306/tu_base_local';

const db = mysql.createConnection(connectionString);

db.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
        return;
    }
    console.log('¡Conectado exitosamente a la base de datos!');
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
// 1. Importa bcrypt al inicio de tu server.js si no lo tienes:
const bcrypt = require('bcrypt');

// REGISTRO DE DUEÑOS SEGURO (Con teléfono y estado pendiente)
app.post('/api/registro-dueno', async (req, res) => {
    const { email, password, nombre_gym, telefono } = req.body;

    try {
        // Generamos el hash de la contraseña antes de guardarla
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Guardamos con estado 'pendiente' y el teléfono recibido
        const query = `INSERT INTO duenos (email, password, nombre_gym, telefono, estado, fecha_vencimiento_app) VALUES (?, ?, ?, ?, 'pendiente', NULL)`;

        db.query(query, [email, hashedPassword, nombre_gym, telefono], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo ya está registrado' });
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
app.put('/api/socios/:id/pagar', (req, res) => {
    const { id } = req.params;
    const meses = Number.parseInt(req.body.meses, 10) || 1;

    if (![1, 2, 3, 6, 12].includes(meses)) {
        return res.status(400).json({ error: 'Cantidad de meses inválida.' });
    }

    db.beginTransaction((transactionError) => {
        if (transactionError) return res.status(500).json({ error: transactionError.message });

        const cancelar = (error) => db.rollback(() => res.status(500).json({ error: error.message }));
        const buscarSocio = `
            SELECT s.id, s.nombre, s.apellido, s.whatsapp, s.dueno_id, p.precio
            FROM socios s
            JOIN planes p ON p.id = s.plan_id
            WHERE s.id = ?
        `;

        db.query(buscarSocio, [id], (err, results) => {
            if (err) return cancelar(err);
            if (results.length === 0) {
                return db.rollback(() => res.status(404).json({ error: 'Socio o plan no encontrado.' }));
            }

            const socio = results[0];
            const monto = Number(socio.precio) * meses;
            const dias = meses * 30;

            db.query(
                `UPDATE socios
                 SET fecha_vencimiento = DATE_ADD(CURDATE(), INTERVAL ? DAY), monto_cuota = ?
                 WHERE id = ?`,
                [dias, monto, id],
                (updateError) => {
                    if (updateError) return cancelar(updateError);

                    db.query(
                        `INSERT INTO pagos (socio_id, dueno_id, monto, meses, fecha_vencimiento)
                         VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))`,
                        [id, socio.dueno_id, monto, meses, dias],
                        (insertError, result) => {
                            if (insertError) return cancelar(insertError);

                            db.commit((commitError) => {
                                if (commitError) return cancelar(commitError);
                                res.json({
                                    mensaje: 'Pago registrado con éxito',
                                    comprobante: {
                                        id: result.insertId,
                                        nombre: `${socio.nombre} ${socio.apellido}`,
                                        whatsapp: socio.whatsapp,
                                        monto,
                                        meses,
                                        fecha_pago: new Date(),
                                        fecha_vencimiento: new Date(Date.now() + dias * 86400000)
                                    }
                                });
                            });
                        }
                    );
                }
            );
        });
    });
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

// Obtener historial de un dueño/gimnasio
app.get('/api/admin/historial/:id', async (req, res) => {
    const duenoId = req.params.id;
    try {
        // Asegúrate de cambiar 'historial_admin' por el nombre real de tu tabla en la base de datos
        const [rows] = await pool.query('SELECT * FROM historial_gimnasios WHERE dueno_id = ? ORDER BY fecha_evento DESC', [duenoId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener el historial' });
    }
});

// Guardar un evento o nota en el historial
app.post('/api/admin/historial', async (req, res) => {
    const { dueno_id, tipo_evento, detalles } = req.body;
    try {
        await pool.query(
    'INSERT INTO historial_gimnasios (dueno_id, tipo_evento, detalles, fecha_evento) VALUES (?, ?, ?, NOW())',
    [dueno_id, tipo_evento, detalles]
);
        res.json({ success: true, mensaje: 'Evento guardado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el evento' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

