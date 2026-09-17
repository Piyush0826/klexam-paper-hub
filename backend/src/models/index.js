// backend/src/models/index.js
// Central export for Sequelize models and the Sequelize instance.
// This file allows scripts (e.g., admin seed) to import all models via
// `const { User } = require('../src/models');`

const path = require('path');
const { getSequelize } = require('../config/db');

// Initialize Sequelize connection (ensures DB is ready)
const sequelize = getSequelize();

// Import individual models
const User = require('./User');
const Paper = require('./Paper');
const Report = require('./Report');
const Download = require('./Download');
const EmailVerification = require('./EmailVerification');
const PasswordReset = require('./PasswordReset');

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Paper,
  Report,
  Download,
  EmailVerification,
  PasswordReset,
};
