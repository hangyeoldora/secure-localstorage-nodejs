const dotenv = require('dotenv');
const Joi = require('joi')

// server 폴더 루트에 위치한게 아니면 path 명령어로 config 구성
dotenv.config();

// 환경변수 valid 옵션 
const envVarsSchema = Joi.object().keys({
  MODE: Joi.string().valid('development', 'production').required(),
  SERVER_PORT: Joi.number().default(3002),
  MYSQL_USER: Joi.string().required(),
  MYSQL_PASSWORD: Joi.string().required(),
  MYSQL_DATABASE: Joi.string().required(),
  MYSQL_HOST: Joi.string().required(),
  MYSQL_DIALECT: Joi.string().default('mysql'),
  MYSQL_PORT: Joi.number().default(3306),
}).unknown();

const { value: envVars, error }  = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}
const { MODE, SERVER_PORT, MYSQL_USER, MYSQL_DATABASE, MYSQL_HOST, MYSQL_PASSWORD, MYSQL_DIALECT, MYSQL_PORT } = envVars;

module.exports = {
  mode: MODE,
  server: {
    port: SERVER_PORT,
  },
  mysqlConfig: {
    username: MYSQL_USER,
    database: MYSQL_DATABASE,
    host: MYSQL_HOST,
    password: MYSQL_PASSWORD,
    dialect: MYSQL_DIALECT,
    port: MYSQL_PORT
  }
}