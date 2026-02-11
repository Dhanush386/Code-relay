const axios = require('axios');

const API_URL = 'http://localhost:5000';

async function registerOrganizer() {
    try {
        const response = await axios.post(`${API_URL}/api/organizer/register`, {
            email: 'admin@test.com',
            password: 'admin123',
            name: 'Admin Organizer'
        });
        console.log('✅ Organizer registered successfully!');
        console.log('Email: admin@test.com');
        console.log('Password: admin123');
        console.log('Response:', response.data);
    } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error === 'Organizer already exists') {
            console.log('ℹ️ Organizer already exists. You can login with:');
            console.log('Email: admin@test.com');
            console.log('Password: admin123');
        } else {
            console.error('❌ Error:', error.response?.data || error.message);
        }
    }
}

registerOrganizer();
