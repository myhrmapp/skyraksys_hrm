const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const modelsDir = path.join(__dirname, '../models');
const excludeFiles = ['index.js'];

async function generateAudit() {
  let md = '# Full Stack Schema & RBAC Audit Report\n\n';
  md += 'This automated report extracts the schema definitions, field validations, and relationships for all modules to ensure consistency between the DB, Backend, and Frontend.\n\n';

  const files = fs.readdirSync(modelsDir).filter(file => file.endsWith('.js') && !excludeFiles.includes(file));

  // Initialize a mock sequelize instance to capture defines
  const sequelizeMock = {
    define: (modelName, attributes, options) => {
      md += `## Module: ${modelName}\n\n`;
      if (options && options.tableName) {
        md += `**Table Name:** \`${options.tableName}\`\n`;
      }
      if (options && options.paranoid) {
        md += `**Soft Deletes (Paranoid):** Enabled\n`;
      }
      md += '\n### Schema Definitions\n';
      md += '| Field | Type | Constraints & Validations |\n';
      md += '|---|---|---|\n';

      for (const [fieldName, fieldDef] of Object.entries(attributes)) {
        let typeStr = 'Unknown';
        if (fieldDef.type) {
           if (typeof fieldDef.type === 'string') typeStr = fieldDef.type;
           else if (fieldDef.type.key) typeStr = fieldDef.type.key;
           else if (fieldDef.type.options && fieldDef.type.options.type) typeStr = fieldDef.type.options.type.key;
        }

        let constraints = [];
        if (fieldDef.primaryKey) constraints.push('PrimaryKey');
        if (fieldDef.allowNull === false) constraints.push('NotNull');
        if (fieldDef.unique) constraints.push('Unique');
        if (fieldDef.defaultValue !== undefined) constraints.push(`Default: ${String(fieldDef.defaultValue)}`);
        
        if (fieldDef.references) {
           constraints.push(`FK -> ${fieldDef.references.model}.${fieldDef.references.key}`);
        }
        
        if (fieldDef.validate) {
           const valKeys = Object.keys(fieldDef.validate).filter(k => typeof fieldDef.validate[k] !== 'function');
           if (valKeys.length > 0) {
             constraints.push(`Validations: ${valKeys.join(', ')}`);
           }
        }

        md += `| \`${fieldName}\` | \`${typeStr}\` | ${constraints.join(' \\| ')} |\n`;
      }
      md += '\n---\n\n';
      return { associate: () => {} };
    }
  };

  for (const file of files) {
    try {
      const modelDefiner = require(path.join(modelsDir, file));
      modelDefiner(sequelizeMock, DataTypes);
    } catch (e) {
      console.error(`Error parsing ${file}:`, e.message);
    }
  }

  const outputPath = path.join(__dirname, '../../audit_report_auto.md');
  fs.writeFileSync(outputPath, md);
  console.log('Audit generated at:', outputPath);
}

generateAudit();
