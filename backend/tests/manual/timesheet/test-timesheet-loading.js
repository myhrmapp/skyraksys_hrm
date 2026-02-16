const { Timesheet, Project, Task, Employee, User } = require('./models');
const dayjs = require('dayjs');
const isoWeek = require('dayjs/plugin/isoWeek');
const isBetween = require('dayjs/plugin/isBetween');

// Enable dayjs plugins
dayjs.extend(isoWeek);
dayjs.extend(isBetween);

async function testTimesheetLoading() {
  try {
    console.log('Testing timesheet loading...');
    
    // Get all timesheets with associations (like the API does)
    const timesheets = await Timesheet.findAll({
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'name']
        },
        {
          model: Employee,
          as: 'employee',
          attributes: ['id', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    console.log('Found', timesheets.length, 'timesheets total');
    
    // Test week filtering (current week logic)
    const currentWeek = dayjs().startOf('isoWeek');
    console.log('Current week start:', currentWeek.format('YYYY-MM-DD'));
    console.log('Current week end:', currentWeek.add(6, 'day').format('YYYY-MM-DD'));
    
    const weekTimesheets = timesheets.filter(timesheet => {
      const workDate = dayjs(timesheet.workDate);
      const isInWeek = workDate.isBetween(currentWeek, currentWeek.add(6, 'day'), 'day', '[]');
      if (isInWeek) {
        console.log('Found timesheet for', workDate.format('YYYY-MM-DD'), 'hours:', timesheet.hoursWorked);
      }
      return isInWeek;
    });
    
    console.log('Week timesheets:', weekTimesheets.length);
    
    if (weekTimesheets.length > 0) {
      console.log('\nSample timesheet data structure:');
      const sample = weekTimesheets[0];
      console.log({
        id: sample.id,
        workDate: sample.workDate,
        hoursWorked: sample.hoursWorked,
        description: sample.description,
        status: sample.status,
        projectId: sample.projectId,
        taskId: sample.taskId,
        project: sample.project ? { id: sample.project.id, name: sample.project.name } : null,
        task: sample.task ? { id: sample.task.id, name: sample.task.name } : null
      });
      
      // Test the grouping logic
      console.log('\nTesting grouping logic...');
      const groupedTimesheets = {};
      
      weekTimesheets.forEach(timesheet => {
        const key = `${timesheet.projectId}-${timesheet.taskId}`;
        if (!groupedTimesheets[key]) {
          groupedTimesheets[key] = {
            id: Date.now() + Math.random(),
            projectId: timesheet.projectId,
            taskId: timesheet.taskId,
            hours: { monday: '', tuesday: '', wednesday: '', thursday: '', friday: '', saturday: '', sunday: '' },
            notes: timesheet.description.split(' - ').length > 2 ? timesheet.description.split('. Notes: ')[1] || '' : ''
          };
        }
        
        // Map work date to day of week
        const workDate = dayjs(timesheet.workDate);
        const dayIndex = workDate.isoWeekday() - 1; // 0=Monday, 6=Sunday
        const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        if (dayIndex >= 0 && dayIndex < 7) {
          groupedTimesheets[key].hours[dayNames[dayIndex]] = timesheet.hoursWorked;
          console.log(`Mapped ${workDate.format('YYYY-MM-DD')} (${dayNames[dayIndex]}) = ${timesheet.hoursWorked} hours`);
        }
      });
      
      const loadedTasks = Object.values(groupedTimesheets);
      console.log('\nGrouped tasks:', loadedTasks.length);
      console.log('Sample grouped task:', loadedTasks[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testTimesheetLoading();