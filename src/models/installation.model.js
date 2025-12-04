export default (sequelize, DataTypes) => {
  const Installation = sequelize.define('Installation', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    external_order_id: { type: DataTypes.STRING(64), allowNull: false },
    store_id: { type: DataTypes.UUID, allowNull: false },
    scheduled_start: DataTypes.DATE,
    scheduled_end: DataTypes.DATE,
    status: {
      type: DataTypes.ENUM('scheduled','in_progress','completed','failed','canceled','staged'),
      allowNull: false,
      defaultValue: 'scheduled'
    },
    notes: DataTypes.TEXT,
    created_by: DataTypes.UUID,
    updated_by: DataTypes.UUID
  }, {
    tableName: 'installations',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['store_id'] },
      { fields: ['external_order_id'] },
      { fields: ['status'] }
    ]
  });
  Installation.associate = (db) => {
    Installation.belongsTo(db.Store, { foreignKey: 'store_id', as: 'store' });
    Installation.belongsTo(db.User, { foreignKey: 'created_by', as: 'creator' });
    Installation.belongsTo(db.User, { foreignKey: 'updated_by', as: 'updater' });
    Installation.hasMany(db.InstallationItem, { foreignKey: 'installation_id', as: 'items' });
    Installation.hasMany(db.CrewAssignment, { foreignKey: 'installation_id', as: 'crew' });
    Installation.hasMany(db.ChecklistResponse, { foreignKey: 'installation_id', as: 'checklistResponses' });
    Installation.hasMany(db.MediaAsset, { foreignKey: 'installation_id', as: 'media' });
  };
  return Installation;
};
