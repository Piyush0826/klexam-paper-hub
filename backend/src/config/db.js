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
    await ensureAdminUsers()
    isDbConnected = true
    console.log(`MySQL/Sequelize connected: ${host}:${port}/${database}`)
  } catch (error) {
    if (setupConnection) await setupConnection.end().catch(() => {})
    console.error(`MySQL/Sequelize connection failed: ${error.message}`)
    throw error
  }
}

async function ensureAdminUsers() {
  try {
    const User = require('../models/User')
    const bcrypt = require('bcryptjs')
    const adminPassword = process.env.ADMIN_PASSWORD || 'Piyush@1919'
    const hashedPassword = await bcrypt.hash(adminPassword, 12)
    const adminAccounts = [
      { email: 'piyushvkb0826@gmail.com', collegeId: 'ADMIN-001' },
      { email: 'piyushvkb0862@gmail.com', collegeId: 'ADMIN-002' }
    ]

    for (const account of adminAccounts) {
      const existing = await User.findOne({ where: { email: account.email } })
      if (!existing) {
        await User.create({
          name: 'Admin',
          collegeId: account.collegeId,
          email: account.email,
          role: 'admin',
          password: hashedPassword,
          isEmailVerified: true,
          isBlocked: false,
        })
        console.log(`[DB Admin Seed] Created admin account: ${account.email}`)
      } else {
        const updates = {}
        if (existing.role !== 'admin') updates.role = 'admin'
        if (!existing.isEmailVerified) updates.isEmailVerified = true
        if (existing.isBlocked) updates.isBlocked = false
        if (Object.keys(updates).length > 0) {
          await User.update(updates, { where: { id: existing.id } })
          console.log(`[DB Admin Seed] Updated privileges for: ${account.email}`)
        }
      }
    }
  } catch (err) {
    console.warn(`[DB Admin Seed notice] Failed to ensure admin accounts: ${err.message}`)
  }
}

function getSequelize() {
  return sequelize
}

module.exports = { connectDatabase, getSequelize }
