const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const { createReport } = require('../controllers/reportController')

const router = express.Router()

router.post('/', authMiddleware, createReport)

module.exports = router
