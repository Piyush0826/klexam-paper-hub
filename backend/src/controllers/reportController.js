const Paper = require('../models/Paper')
const Report = require('../models/Report')

const allowedReasons = ['wrong_subject', 'wrong_year', 'wrong_semester', 'duplicate', 'inappropriate', 'other']

async function createReport(request, response) {
  const paperId = typeof request.body.paperId === 'string' ? request.body.paperId.trim() : ''
  const reason = typeof request.body.reason === 'string' ? request.body.reason.trim().toLowerCase() : ''
  const details = typeof request.body.details === 'string' ? request.body.details.trim() : null

  if (!isValidUuid(paperId)) return response.status(400).json({ success: false, message: 'A valid paperId is required' })
  if (!allowedReasons.includes(reason)) return response.status(400).json({ success: false, message: 'Invalid report reason' })
  if (details && details.length > 1000) return response.status(400).json({ success: false, message: 'Report details must be 1000 characters or fewer' })

  const paper = await Paper.findByPk(paperId, { attributes: ['id'] })
  if (!paper) return response.status(404).json({ success: false, message: 'Paper not found' })

  const duplicate = await Report.findOne({ where: { reportedBy: request.user.id, paperId, reason } })
  if (duplicate) return response.status(409).json({ success: false, message: 'You have already submitted this report for the paper' })

  try {
    const report = await Report.create({ paperId, reportedBy: request.user.id, reason, details: details || null, status: 'pending' })
    return response.status(201).json({
      success: true,
      message: 'Paper report submitted successfully',
      data: { report: { id: report.id, paperId: report.paperId, reason: report.reason, status: report.status, createdAt: report.createdAt } },
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') return response.status(409).json({ success: false, message: 'You have already submitted this report for the paper' })
    console.error(`Paper report creation failed: ${error.message}`)
    return response.status(500).json({ success: false, message: 'Paper report could not be submitted' })
  }
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

module.exports = { createReport }
