const axios = require('axios');

async function testProjectsAndTasks() {
    try {
        console.log('🔐 Logging in...');
        const loginResponse = await axios.post('http://localhost:8080/api/auth/login', {
            email: 'admin@company.com',
            password: 'Kx9mP7qR2nF8sA5t'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');

        console.log('\n📂 Fetching projects...');
        const projectsResponse = await axios.get('http://localhost:8080/api/projects', {
            headers: { Authorization: 'Bearer ' + token }
        });
        
        console.log(`Projects found: ${projectsResponse.data.data?.length || 0}`);
        if (projectsResponse.data.data?.length > 0) {
            projectsResponse.data.data.forEach((project, i) => {
                console.log(`  ${i+1}. ${project.name} (${project.status})`);
            });
        }

        console.log('\n📋 Fetching tasks...');
        const tasksResponse = await axios.get('http://localhost:8080/api/tasks', {
            headers: { Authorization: 'Bearer ' + token }
        });
        
        console.log(`Tasks found: ${tasksResponse.data.data?.length || 0}`);
        if (tasksResponse.data.data?.length > 0) {
            tasksResponse.data.data.forEach((task, i) => {
                console.log(`  ${i+1}. ${task.name} (${task.status}) - ${task.estimatedHours}h`);
            });
        }

        console.log('\n🎉 Projects and tasks are now available!');

    } catch (error) {
        console.log('❌ Error:', error.message);
        if (error.response) {
            console.log('Response:', error.response.data);
        }
    }
}

testProjectsAndTasks();