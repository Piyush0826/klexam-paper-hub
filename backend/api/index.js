// Force Vercel's bundler to include mysql2
require('mysql2')
require('mysql2/promise')

const app = require('../src/app')
const { connectDatabase } = require('../src/config/db')

let dbPromise = null

module.exports = async (req, res) => {
  // Preflight OPTIONS requests do not need a database connection
  if (req.method === 'OPTIONS') {
    return app(req, res)
  }

  if (!dbPromise) {
    dbPromise = connectDatabase().catch((err) => {
      console.error('Database connection error in serverless:', err)
      dbPromise = null
    })
  }
  await dbPromise

  return new Promise((resolve, reject) => {
    res.on('finish', resolve)
    res.on('close', resolve)
    res.on('error', reject)
    app(req, res)
  })
}
