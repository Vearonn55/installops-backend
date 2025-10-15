export default (sequelize, DataTypes) => {
  const Webhook = sequelize.define('Webhook', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(120), allowNull: false },
    target_url: { type: DataTypes.STRING(500), allowNull: false },
    secret: DataTypes.STRING(120),
    events: DataTypes.JSONB
  }, {
    tableName: 'webhooks',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return Webhook;
};
