const axios = require('axios');

async function main() {
    try {
        console.log('Attempting login...');
        const response = await axios.post('http://localhost:5000/api/organizer/login', {
            email: 'admin@test.com',
            password: 'password123'
        });

        console.log('✅ Login successful!');
        console.log('Token received:', !!response.data.token);
        console.log('Organizer:', response.data.organizer);
    } catch (error) {
        console.error('❌ Login failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

main();
