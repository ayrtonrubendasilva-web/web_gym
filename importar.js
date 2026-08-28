const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config({ quiet: true });

async function importarBaseDeDatos() {
    const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
    const conexionConfig = databaseUrl ? {
        uri: databaseUrl,
        multipleStatements: true
    } : {
        host: process.env.DB_HOST || process.env.MYSQLHOST,
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER,
        password: process.env.DB_PASS || process.env.MYSQLPASSWORD,
        database: process.env.DB_NAME || process.env.MYSQLDATABASE,
        multipleStatements: true
    };

   const archivoSql = 'gym_gestion.sql'; // Cambia esto por el nombre exacto de tu archivo .sql

    try {
        console.log('Conectando a MySQL...');
        const connection = await mysql.createConnection(conexionConfig);
        console.log('¡Conectado con éxito!');

        console.log(`Leyendo el archivo ${archivoSql}...`);
        const sqlContent = fs.readFileSync(archivoSql, 'utf8');

        console.log('Ejecutando consultas en la base de datos online...');
        await connection.query(sqlContent);

        console.log('¡Listo! Las tablas y datos se importaron correctamente.');
        await connection.end();
    } catch (error) {
        console.error('Error durante la importación:', error);
    }
}

importarBaseDeDatos();
