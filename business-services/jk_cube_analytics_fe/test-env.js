require('dotenv').config();

console.log('=== Environment Variables Test ===');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_PASSWORD type:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD length:', process.env.DB_PASSWORD?.length);
console.log('DB_PASSWORD first char:', process.env.DB_PASSWORD?.charCodeAt(0));
console.log('DB_PASSWORD last char:', process.env.DB_PASSWORD?.charCodeAt(process.env.DB_PASSWORD.length - 1));
console.log('');
console.log('FIN_DB_PASSWORD:', process.env.FIN_DB_PASSWORD);
console.log('FIN_DB_PASSWORD type:', typeof process.env.FIN_DB_PASSWORD);
console.log('');
console.log('CUBEJS_DB_PASS:', process.env.CUBEJS_DB_PASS);
console.log('CUBEJS_DB_PASS type:', typeof process.env.CUBEJS_DB_PASS);
console.log('');
console.log('CUBEJS_FIN_DB_PASS:', process.env.CUBEJS_FIN_DB_PASS);
console.log('CUBEJS_FIN_DB_PASS type:', typeof process.env.CUBEJS_FIN_DB_PASS);
