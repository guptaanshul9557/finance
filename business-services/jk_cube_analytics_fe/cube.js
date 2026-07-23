require('dotenv').config();

module.exports = {
  schemaPath: 'schema',

  apiSecret: process.env.CUBEJS_API_SECRET,

  dataSources: {
    default: {
      type: 'postgres',
      host: process.env.CUBEJS_DB_HOST,
      port: Number(process.env.CUBEJS_DB_PORT),
      database: process.env.CUBEJS_DB_NAME,
      user: process.env.CUBEJS_DB_USER,
      password: String(process.env.CUBEJS_DB_PASS),
    },

    finance: {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.CUBEJS_DB_PORT_FINANCE),
      database: process.env.CUBEJS_DB_NAME_FINANCE,
      user: process.env.CUBEJS_DB_USER_FINANCE,
      password: String(process.env.CUBEJS_DB_PASS_FINANCE),
    }
  }
};
