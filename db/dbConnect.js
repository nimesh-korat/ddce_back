const mysql = require('mysql2');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true, // Queue queries if no connection is available
    connectionLimit: 10,      // Maximum number of connections in the pool
    queueLimit: 0             // Unlimited queue length
});

// Test the connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL database!');
    connection.release(); // Release the connection back to the pool
});

// Export the pool for use in other files
module.exports = pool;
