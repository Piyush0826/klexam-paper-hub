const express = require('express')
const authMiddleware = require('../middleware/authMiddleware')
const adminMiddleware = require('../middleware/adminMiddleware')
const {
  blockUser,
  deleteAnyPaper,
  deleteUserAccount,
  getAdminStats,
  listAdminPapers,
  listReports,
  listUsers,
  unblockUser,
  updateReportStatus,
} = require('../controllers/adminController')

const router = express.Router()

router.use(authMiddleware, adminMiddleware)
router.get('/stats', getAdminStats)
router.get('/users', listUsers)
router.delete('/users/:id', deleteUserAccount)
router.patch('/users/:id/block', blockUser)
router.patch('/users/:id/unblock', unblockUser)
router.get('/papers', listAdminPapers)
router.delete('/papers/:id', deleteAnyPaper)
router.get('/reports', listReports)
router.patch('/reports/:id/status', updateReportStatus)

module.exports = router
