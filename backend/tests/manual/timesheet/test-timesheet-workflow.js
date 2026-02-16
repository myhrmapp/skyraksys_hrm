const db = require('./models');

async function testTimesheetWorkflow() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected');
    
    // Find the employee who has timesheets (John Developer)
    const employee = await db.Employee.findOne({
      where: {
        firstName: 'John',
        lastName: 'Developer'
      },
      include: [{ model: db.User, as: 'user' }]
    });
    
    if (!employee) {
      console.log('No John Developer found, finding any employee with timesheets');
      
      // Find any employee with timesheets
      const timesheetEmployeeId = await db.Timesheet.findOne({
        attributes: ['employeeId'],
        raw: true
      });
      
      if (timesheetEmployeeId) {
        const emp = await db.Employee.findByPk(timesheetEmployeeId.employeeId, {
          include: [{ model: db.User, as: 'user' }]
        });
        if (emp) {
          console.log(`Found employee with timesheets: ${emp.firstName} ${emp.lastName}`);
          return await testWithEmployee(emp);
        }
      }
      
      console.log('No employee with timesheets found');
      return;
    }
    
    return await testWithEmployee(employee);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

async function testWithEmployee(employee) {
async function testWithEmployee(employee) {
    console.log(`Testing with employee: ${employee.firstName} ${employee.lastName}`);
    
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
      console.log({
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
      });
    }
}

testTimesheetWorkflow();