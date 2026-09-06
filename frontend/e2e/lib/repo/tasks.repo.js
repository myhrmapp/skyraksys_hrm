const tid = (id) => `[data-testid="${id}"]`;

module.exports = {
  tasks: {
    page: tid('my-tasks-page'),
    search: tid('tasks-search'),
    statusFilter: tid('tasks-status-filter'),
    priorityFilter: tid('tasks-priority-filter'),
  },
  projectTaskConfig: {
    page: tid('project-task-config-page'),
    tabProjects: tid('ptc-tab-projects'),
    tabTasks: tid('ptc-tab-tasks'),
    search: tid('ptc-search-input'),
    addProjectBtn: tid('ptc-add-project-btn'),
    addTaskBtn: tid('ptc-add-task-btn'),
  }
};
