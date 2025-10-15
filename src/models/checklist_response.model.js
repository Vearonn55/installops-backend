export default (sequelize, DataTypes) => {
  const ChecklistResponse = sequelize.define('ChecklistResponse', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    installation_id: { type: DataTypes.UUID, allowNull: false },
    item_id: { type: DataTypes.UUID, allowNull: false },
    value: DataTypes.JSONB,
    completed_at: DataTypes.DATE
  }, {
    tableName: 'checklist_responses',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['installation_id'] }, { fields: ['item_id'] }]
  });
  ChecklistResponse.associate = (db) => {
    ChecklistResponse.belongsTo(db.Installation, { foreignKey: 'installation_id', as: 'installation' });
    ChecklistResponse.belongsTo(db.ChecklistItem, { foreignKey: 'item_id', as: 'item' });
  };
  return ChecklistResponse;
};
