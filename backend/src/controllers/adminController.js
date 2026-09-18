const { Op } = require('sequelize')
const User = require('../models/User')
const Paper = require('../models/Paper')
const Download = require('../models/Download')
const Report = require('../models/Report')
const EmailVerification = require('../models/EmailVerification')
const PasswordReset = require('../models/PasswordReset')
const { removeCloudinaryFiles } = require('../services/fileService')

const allowedReportStatuses = ['pending', 'reviewed', 'resolved', 'rejected']

async function getAdminStats(request, response) {
  try {
    const [totalUsers, students, faculty, verifiedUsers, blockedUsers, totalPapers, totalReports] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'student' } }),
      User.count({ where: { role: 'faculty' } }),
      User.count({ where: { isEmailVerified: true } }),
      User.count({ where: { isBlocked: true } }),
      Paper.count(),
      Report.count(),
    ])

    return response.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          students,
          faculty,
          verifiedUsers,
          blockedUsers,
          totalPapers,
          totalReports,
        },
      },
    })
  } catch (error) {
    console.error('Failed to get admin stats:', error)
    return response.status(500).json({ success: false, message: 'Failed to retrieve admin stats' })
  }
}

async function listUsers(request, response) {
  const pagination = getPagination(request)
  if (pagination.error) return response.status(400).json({ success: false, message: pagination.error })

  const search = typeof request.query.search === 'string' ? request.query.search.trim() : ''
  const role = typeof request.query.role === 'string' ? request.query.role.trim().toLowerCase() : ''
  const where = {}

  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { collegeId: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
    ]
  }

  if (['student', 'faculty', 'admin'].includes(role)) {
    where.role = role
  }

  if (request.query.isBlocked !== undefined && request.query.isBlocked !== '') {
    where.isBlocked = request.query.isBlocked === 'true' || request.query.isBlocked === '1'
  }

  const result = await User.findAndCountAll({
    where,
    attributes: ['id', 'name', 'collegeId', 'email', 'role', 'isEmailVerified', 'isBlocked', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
  })

  return response.status(200).json({
    success: true,
    data: {
      users: result.rows,
      pagination: buildPagination(pagination, result.count),
    },
  })
}

async function blockUser(request, response) {
  const user = await findUser(request.params.id)
  if (!user) return response.status(404).json({ success: false, message: 'User not found' })
  if (user.id === request.user.id) return response.status(400).json({ success: false, message: 'You cannot block your own admin account' })

  await User.update({ isBlocked: true }, { where: { id: user.id } })
  return response.status(200).json({ success: true, message: 'User blocked successfully', data: { userId: user.id, isBlocked: true } })
}

async function unblockUser(request, response) {
  const user = await findUser(request.params.id)
  if (!user) return response.status(404).json({ success: false, message: 'User not found' })

  await User.update({ isBlocked: false }, { where: { id: user.id } })
  return response.status(200).json({ success: true, message: 'User unblocked successfully', data: { userId: user.id, isBlocked: false } })
}

async function resetUserPassword(request, response) {
  const user = await findUser(request.params.id)
  if (!user) return response.status(404).json({ success: false, message: 'User not found' })
  const newPassword = typeof request.body.password === 'string' ? request.body.password : ''
  if (newPassword.length < 8) return response.status(400).json({ success: false, message: 'Password must be at least 8 characters long' })

  const bcrypt = require('bcryptjs')
  const hashedPassword = await bcrypt.hash(newPassword, 12)
  await User.update({ password: hashedPassword }, { where: { id: user.id } })
  return response.status(200).json({ success: true, message: `Password for ${user.email} updated successfully.` })
}

async function listAdminPapers(request, response) {
  const pagination = getPagination(request)
  if (pagination.error) return response.status(400).json({ success: false, message: pagination.error })

  const search = typeof request.query.search === 'string' ? request.query.search.trim() : ''
  const where = {}

  if (search) {
    where[Op.or] = [
      { subject: { [Op.like]: `%${search}%` } },
      { department: { [Op.like]: `%${search}%` } },
    ]
  }

  const result = await Paper.findAndCountAll({
    where,
    attributes: ['id', 'userId', 'subject', 'department', 'semester', 'year', 'fileType', 'files', 'uploadedAt'],
    include: [{ model: User, attributes: ['id', 'name', 'collegeId', 'email'] }],
    order: [['uploadedAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
  })

  return response.status(200).json({
    success: true,
    data: {
      papers: result.rows.map((paper) => {
        const files = Array.isArray(paper.files) ? paper.files : []
        return {
          id: paper.id,
          userId: paper.userId,
          subject: paper.subject,
          department: paper.department,
          semester: paper.semester,
          year: paper.year,
          fileType: paper.fileType,
          filesCount: files.length || 1,
          uploadedAt: paper.uploadedAt,
          uploader: paper.User ? { id: paper.User.id, name: paper.User.name, collegeId: paper.User.collegeId, email: paper.User.email } : null,
        }
      }),
      pagination: buildPagination(pagination, result.count),
    },
  })
}

async function deleteAnyPaper(request, response) {
  if (!isValidUuid(request.params.id)) return response.status(404).json({ success: false, message: 'Paper not found' })
  const paper = await Paper.findByPk(request.params.id, { attributes: ['id', 'files', 'fileType', 'fileUrl', 'cloudinaryPublicId'] })
  if (!paper) return response.status(404).json({ success: false, message: 'Paper not found' })

  try {
    await removeCloudinaryFiles(getCloudinaryFiles(paper))
    await Download.destroy({ where: { paperId: paper.id } })
    await Report.destroy({ where: { paperId: paper.id } })
    await Paper.destroy({ where: { id: paper.id } })
    return response.status(200).json({ success: true, message: 'Paper deleted successfully', data: { paperId: paper.id } })
  } catch (error) {
    console.error(`Admin paper deletion failed: ${error.message}`)
    return response.status(500).json({ success: false, message: 'Paper could not be deleted safely' })
  }
}

async function listReports(request, response) {
  const pagination = getPagination(request)
  if (pagination.error) return response.status(400).json({ success: false, message: pagination.error })

  const where = {}
  const status = typeof request.query.status === 'string' ? request.query.status.trim().toLowerCase() : ''
  if (allowedReportStatuses.includes(status)) {
    where.status = status
  }

  const result = await Report.findAndCountAll({
    where,
    attributes: ['id', 'paperId', 'reportedBy', 'reason', 'details', 'status', 'createdAt'],
    include: [
      { model: Paper, attributes: ['id', 'subject', 'semester', 'year'] },
      { model: User, attributes: ['id', 'name', 'collegeId', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: pagination.limit,
    offset: pagination.offset,
  })

  return response.status(200).json({
    success: true,
    data: {
      reports: result.rows.map((report) => ({
        id: report.id,
        paperId: report.paperId,
        paper: report.Paper,
        reporter: report.User ? { id: report.User.id, name: report.User.name, collegeId: report.User.collegeId, email: report.User.email } : null,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
      })),
      pagination: buildPagination(pagination, result.count),
    },
  })
}

async function updateReportStatus(request, response) {
  const status = typeof request.body.status === 'string' ? request.body.status.trim().toLowerCase() : ''
  if (!allowedReportStatuses.includes(status)) return response.status(400).json({ success: false, message: 'Invalid report status' })

  const report = await Report.findByPk(request.params.id)
  if (!report) return response.status(404).json({ success: false, message: 'Report not found' })

  await Report.update({ status }, { where: { id: report.id } })
  return response.status(200).json({ success: true, message: 'Report status updated successfully', data: { reportId: report.id, status } })
}

async function findUser(id) {
  if (!isValidUuid(id)) return null
  return User.findByPk(id, { attributes: ['id'] })
}

function getCloudinaryFiles(paper) {
  const storedFiles = Array.isArray(paper.files) ? paper.files.filter((file) => file && file.publicId) : []
  if (storedFiles.length) return storedFiles
  if (paper.cloudinaryPublicId) return [{ publicId: paper.cloudinaryPublicId, resourceType: paper.fileType === 'pdf' ? 'raw' : 'image' }]
  return []
}

function getPagination(request) {
  const page = request.query.page === undefined ? 1 : Number(request.query.page)
  const limit = request.query.limit === undefined ? 10 : Number(request.query.limit)
  if (!Number.isInteger(page) || page < 1) return { error: 'Page must be a positive integer' }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return { error: 'Limit must be between 1 and 50' }
  return { page, limit, offset: (page - 1) * limit }
}

function buildPagination(pagination, totalItems) {
  return { page: pagination.page, limit: pagination.limit, totalItems, totalPages: Math.ceil(totalItems / pagination.limit) }
}

function isValidUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

async function deleteUserAccount(request, response) {
  const userId = request.params.id
  if (!isValidUuid(userId)) return response.status(404).json({ success: false, message: 'User not found' })

  const user = await User.findByPk(userId)
  if (!user) return response.status(404).json({ success: false, message: 'User not found' })
  if (user.id === request.user.id) {
    return response.status(400).json({ success: false, message: 'You cannot delete your own admin account' })
  }

  try {
    // 1. Find all papers uploaded by this user and clean up cloudinary files & paper records
    const papers = await Paper.findAll({ where: { userId: user.id } })
    for (const paper of papers) {
      await removeCloudinaryFiles(getCloudinaryFiles(paper)).catch(() => {})
      await Download.destroy({ where: { paperId: paper.id } })
      await Report.destroy({ where: { paperId: paper.id } })
      await paper.destroy()
    }

    // 2. Remove reports created by this user
    await Report.destroy({ where: { reportedBy: user.id } })

    // 3. Remove downloads tracked for this user
    await Download.destroy({ where: { userId: user.id } })

    // 4. Remove verification and password reset tokens
    await EmailVerification.destroy({ where: { userId: user.id } })
    await PasswordReset.destroy({ where: { userId: user.id } })

    // 5. Delete the user
    await user.destroy()

    return response.status(200).json({
      success: true,
      message: `User account (${user.email}) deleted successfully`,
      data: { userId: user.id }
    })
  } catch (error) {
    console.error(`Failed to delete user: ${error.message}`)
    return response.status(500).json({ success: false, message: 'Failed to delete user account safely' })
  }
}

module.exports = {
  blockUser,
  deleteAnyPaper,
  deleteUserAccount,
  getAdminStats,
  listAdminPapers,
  listReports,
  listUsers,
  resetUserPassword,
  unblockUser,
  updateReportStatus,
}
