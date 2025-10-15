export default (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    kind: { type: DataTypes.ENUM('email','sms','push','webhook'), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'queued' },
    attempt_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    last_attempt_at: DataTypes.DATE
  }, {
    tableName: 'notifications',
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ['kind'] }, { fields: ['status'] }]
  });
  return Notification;
};
