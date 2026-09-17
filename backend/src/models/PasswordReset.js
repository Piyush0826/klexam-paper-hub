const { DataTypes, Model } = require('sequelize')
const { getSequelize } = require('../config/db')
const User = require('./User')

class PasswordReset extends Model {}

PasswordReset.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { sequelize: getSequelize(), modelName: 'PasswordReset', tableName: 'password_resets', underscored: true, timestamps: true })

User.hasMany(PasswordReset, { foreignKey: 'userId', onDelete: 'CASCADE' })
PasswordReset.belongsTo(User, { foreignKey: 'userId' })

module.exports = PasswordReset