'use strict';
const db = require('../models');
async function run() {
  const tasks = await db.Task.findAll({ attributes: ['id', 'name', 'projectId'], limit: 10 });
  const projects = await db.Project.findAll({ attributes: ['id', 'name'], limit: 10 });
  console.log('PROJECTS:', JSON.stringify(projects.map(p => ({ id: p.id, name: p.name }))));
  console.log('TASKS:', JSON.stringify(tasks.map(t => ({ id: t.id, name: t.name, projectId: t.projectId }))));
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
