const mysql = require('mysql2/promise')
const { Sequelize } = require('sequelize')

const dbUrl = process.env.MYSQL_URL || process.env.DATABASE_URL
const host = process.env.MYSQL_HOST || 'localhost'
const port = Number(process.env.MYSQL_PORT) || 3306
const user = process.env.MYSQL_USER || 'root'
const password = process.env.MYSQL_PASSWORD || ''
const database = process.env.MYSQL_DATABASE || 'klexam'

const dialectOptions = {}
if (process.env.MYSQL_SSL === 'true' || (dbUrl && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'))) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false
  }
}

const sequelize = dbUrl
  ? new Sequelize(dbUrl, { dialect: 'mysql', logging: false, dialectOptions })
  : new Sequelize(database, user, password, { host, port, dialect: 'mysql', logging: false, dialectOptions })

let isDbConnected = false

async function connectDatabase() {
  if (isDbConnected) return sequelize
  let setupConnection

  try {
    if (!dbUrl) {
      try {
        setupConnection = await mysql.createConnection({ host, port, user, password })
        await setupConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database.replace(/`/g, '')}\``)
        await setupConnection.end()
      } catch (setupErr) {
        console.warn(`[DB setup notice] Skipping CREATE DATABASE check: ${setupErr.message}`)
      }
    }

    await sequelize.authenticate()
    require('../models/User')
    const User = require('../models/User')
    require('../models/EmailVerification')
    require('../models/PasswordReset')
    const Paper = require('../models/Paper')
    const Download = require('../models/Download')
    const Report = require('../models/Report')
    User.hasMany(Paper, { foreignKey: 'userId', onDelete: 'CASCADE' })
    Paper.belongsTo(User, { foreignKey: 'userId' })
    User.hasMany(Download, { foreignKey: 'userId', onDelete: 'CASCADE' })
    Download.belongsTo(User, { foreignKey: 'userId' })
    Paper.hasMany(Download, { foreignKey: 'paperId', onDelete: 'CASCADE' })
    Download.belongsTo(Paper, { foreignKey: 'paperId' })
    Paper.hasMany(Report, { foreignKey: 'paperId', onDelete: 'CASCADE' })
    Report.belongsTo(Paper, { foreignKey: 'paperId' })
    User.hasMany(Report, { foreignKey: 'reportedBy', onDelete: 'CASCADE' })
    Report.belongsTo(User, { foreignKey: 'reportedBy' })
    await sequelize.sync()
    isDbConnected = true
    console.log(`MySQL/Sequelize connected: ${host}:${port}/${database}`)
  } catch (error) {
    if (setupConnection) await setupConnection.end().catch(() => {})
    console.error(`MySQL/Sequelize connection failed: ${error.message}`)
    throw error
  }
}

function getSequelize() {
  return sequelize
}

module.exports = { connectDatabase, getSequelize }
