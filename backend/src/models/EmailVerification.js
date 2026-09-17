const { DataTypes, Model } = require('sequelize')
const { getSequelize } = require('../config/db')
const User = require('./User')

class EmailVerification extends Model {}

EmailVerification.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false, unique: true },
  otpHash: { type: DataTypes.STRING(255), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { sequelize: getSequelize(), modelName: 'EmailVerification', tableName: 'email_verifications', underscored: true, timestamps: true })

User.hasOne(EmailVerification, { foreignKey: 'userId', onDelete: 'CASCADE' })
EmailVerification.belongsTo(User, { foreignKey: 'userId' })

module.exports = EmailVerification
