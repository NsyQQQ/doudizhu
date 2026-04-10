const mysql = require('mysql2/promise');

async function clearRooms() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'doudizhu',
        waitForConnections: true,
        connectionLimit: 10,
    });

    try {
        const [result] = await pool.query('DELETE FROM rooms');
        console.log(`Deleted ${result.affectedRows} rooms`);
    } finally {
        await pool.end();
    }
}

clearRooms().catch(console.error);