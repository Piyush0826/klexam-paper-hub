// Force Vercel's bundler to include mysql2
require('mysql2')
require('mysql2/promise')

const app = require('../src/app')
const { connectDatabase } = require('../src/config/db')

module.exports = async (req, res) => {
  try {
    await connectDatabase()
  } catch (err) {
    console.error('Database connection error in serverless:', err)
  }
  return app(req, res)
}
