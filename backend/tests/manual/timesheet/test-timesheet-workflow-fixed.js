const db = require('./models');

async function testWithEmployee(employee) {
    console.log(`Testing with employee: ${employee.firstName} ${employee.lastName}`);
    
    // Get all timesheets for this employee first
    const allTimesheets = await db.Timesheet.findAll({
      where: { employeeId: employee.id },
      include: [
        { model: db.Project, as: 'project' },
        { model: db.Task, as: 'task' }
      ]
    });
    
    console.log(`Found ${allTimesheets.length} total timesheets`);
    
    // Get all draft timesheets for this employee
    const draftTimesheets = await db.Timesheet.findAll({
      where: {
        employeeId: employee.id,
        status: 'Draft'
      },
      include: [
        { model: db.Project, as: 'project' },
        { model: db.Task, as: 'task' }
      ]
    });
    
    console.log(`Found ${draftTimesheets.length} draft timesheets`);
    
    if (draftTimesheets.length > 0) {
      // Submit the first timesheet
      const timesheetToSubmit = draftTimesheets[0];
      console.log(`Submitting timesheet ID: ${timesheetToSubmit.id}`);
      console.log(`  Work Date: ${timesheetToSubmit.workDate}`);
      console.log(`  Hours: ${timesheetToSubmit.hoursWorked}`);
      console.log(`  Description: ${timesheetToSubmit.description}`);
      
      await timesheetToSubmit.update({
        status: 'Submitted',
        submittedAt: new Date()
      });
      
      console.log('✅ Timesheet submitted successfully');
      
      // Check status distribution again
      const statusCounts = await db.Timesheet.findAll({
        where: { employeeId: employee.id },
        attributes: ['status', [db.sequelize.fn('COUNT', '*'), 'count']],
        group: ['status'],
        raw: true
      });
      
      console.log('\nStatus Distribution after submission:');
      statusCounts.forEach(sc => {
        console.log(`${sc.status}: ${sc.count}`);
      });
      
      // Test the API endpoint response format
      const timesheets = await db.Timesheet.findAll({
        where: { employeeId: employee.id },
        include: [
          { model: db.Employee, as: 'employee', attributes: ['firstName', 'lastName'] },
          { model: db.Project, as: 'project', attributes: ['name'] },
          { model: db.Task, as: 'task', attributes: ['name'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      
      console.log('\nAPI Response Format Test:');
      console.log(JSON.stringify({
        success: true,
        data: timesheets.map(ts => ({
          id: ts.id,
          workDate: ts.workDate,
          hoursWorked: ts.hoursWorked,
          status: ts.status,
          description: ts.description,
          project: ts.project ? { name: ts.project.name } : null,
          task: ts.task ? { name: ts.task.name } : null,
          submittedAt: ts.submittedAt
        }))
      }, null, 2));
    } else {
      console.log('No draft timesheets found to submit');
    }
}

async function testTimesheetWorkflow() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected');
    
    // Find any employee with timesheets
    const timesheetEmployeeId = await db.Timesheet.findOne({
      attributes: ['employeeId'],
      raw: true
    });
    
    if (timesheetEmployeeId) {
      const employee = await db.Employee.findByPk(timesheetEmployeeId.employeeId, {
        include: [{ model: db.User, as: 'user' }]
      });
      
      if (employee) {
        await testWithEmployee(employee);
      } else {
        console.log('Employee not found');
      }
    } else {
      console.log('No timesheets found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testTimesheetWorkflow();