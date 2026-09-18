const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const errorHandler = require('./middleware/errorMiddleware')
const authRoutes = require('./routes/authRoutes')
const paperRoutes = require('./routes/paperRoutes')
const reportRoutes = require('./routes/reportRoutes')
const adminRoutes = require('./routes/adminRoutes')

const path = require('path')

const app = express()

const configuredOrigin = process.env.FRONTEND_URL

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    xFrameOptions: false,
    contentSecurityPolicy: false,
  })
)
app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin === configuredOrigin ||
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) ||
      /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
      /\.vercel\.app$/.test(origin)
    ) return callback(null, true)
    return callback(null, false)
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-8', legacyHeaders: false }))

app.use(
  '/uploads',
  (req, res, next) => {
    res.removeHeader('X-Frame-Options')
    res.removeHeader('Content-Security-Policy')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Access-Control-Allow-Origin', '*')
    next()
  },
  express.static(path.join(__dirname, '../uploads'), {
    setHeaders: (res, filePath) => {
      res.removeHeader('X-Frame-Options')
      res.removeHeader('Content-Security-Policy')
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      res.setHeader('Access-Control-Allow-Origin', '*')
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline')
      }
    },
  })
)

app.use('/api/auth', authRoutes)
app.use('/api/papers', paperRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/test', (request, response) => {
  response.status(200).json({ success: true, message: 'KLExamPrep backend is working' })
})

app.get('/api/health', (request, response) => {
  response.status(200).json({ success: true, message: 'KLExamPrep API is healthy' })
})

app.use((request, response) => {
  response.status(404).json({ success: false, message: 'Route not found' })
})

app.use(errorHandler)

module.exports = app