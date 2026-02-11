const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const organizerRoutes = require('./routes/organizerRoutes');
const participantRoutes = require('./routes/participantRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/organizer', organizerRoutes);
app.use('/api/participant', participantRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Coding Exam Platform API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 Organizer Secret Loaded: ${!!config.jwt.organizerSecret}`);
    console.log(`🔑 Participant Secret Loaded: ${!!config.jwt.participantSecret}`);
});

module.exports = app;
