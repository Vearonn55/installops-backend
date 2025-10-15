export default (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    actor_id: DataTypes.UUID,
    action: { type: DataTypes.STRING(120), allowNull: false },
    entity: { type: DataTypes.STRING(120), allowNull: false },
    entity_id: DataTypes.UUID,
    data: DataTypes.JSONB,
    ip: DataTypes.STRING(45),
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'audit_logs',
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ['actor_id'] }, { fields: ['action'] }, { fields: ['created_at'] }]
  });
  return AuditLog;
};
