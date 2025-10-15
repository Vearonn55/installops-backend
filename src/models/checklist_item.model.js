export default (sequelize, DataTypes) => {
  const ChecklistItem = sequelize.define('ChecklistItem', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    template_id: { type: DataTypes.UUID, allowNull: false },
    label: { type: DataTypes.STRING(200), allowNull: false },
    type: { type: DataTypes.STRING(48), allowNull: false },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {
    tableName: 'checklist_items',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ fields: ['template_id'] }]
  });
  ChecklistItem.associate = (db) => {
    ChecklistItem.belongsTo(db.ChecklistTemplate, { foreignKey: 'template_id', as: 'template' });
    ChecklistItem.hasMany(db.ChecklistResponse, { foreignKey: 'item_id', as: 'responses' });
  };
  return ChecklistItem;
};
