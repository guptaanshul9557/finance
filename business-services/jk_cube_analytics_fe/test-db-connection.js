require('dotenv').config();
const { Pool } = require('pg');

// Test with exact password from env
const password = process.env.DB_PASSWORD;
console.log('=== Testing Database Connection ===');
console.log('Password from env:', password);
console.log('Password type:', typeof password);
console.log('Password length:', password.length);
console.log('Password first char code:', password.charCodeAt(0));
console.log('Password last char code:', password.charCodeAt(password.length - 1));
console.log('Password preview:', password.substring(0, 3) + '***' + password.slice(-4));

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: password, // Use exact password from env
});

console.log('\nAttempting connection...');

pool.query('SELECT NOW() as current_time')
  .then(result => {
    console.log('✅ Connection successful!');
    console.log('Server time:', result.rows[0].current_time);
    return pool.end();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    pool.end();
  });
