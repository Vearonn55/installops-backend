export default (sequelize, DataTypes) => {
  const ChecklistTemplate = sequelize.define('ChecklistTemplate', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(160), allowNull: false },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    rules: DataTypes.JSONB
  }, {
    tableName: 'checklist_templates',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  ChecklistTemplate.associate = (db) => {
    ChecklistTemplate.hasMany(db.ChecklistItem, { foreignKey: 'template_id', as: 'items' });
  };
  return ChecklistTemplate;
};
