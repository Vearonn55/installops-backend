export default (sequelize, DataTypes) => {
  const WebhookEvent = sequelize.define('WebhookEvent', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    event: { type: DataTypes.STRING(120), allowNull: false },
    payload: { type: DataTypes.JSONB, allowNull: false },
    delivered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    signature: DataTypes.STRING(180)
  }, {
    tableName: 'webhook_events',
    underscored: true,
    timestamps: false,
    indexes: [{ fields: ['event'] }, { fields: ['delivered'] }]
  });
  return WebhookEvent;
};
