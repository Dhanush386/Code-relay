const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Middleware to authenticate organizer requests
const authenticateOrganizer = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        const decoded = jwt.verify(token, config.jwt.organizerSecret);
        req.organizerId = decoded.organizerId;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware to authenticate participant requests
const authenticateParticipant = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        const decoded = jwt.verify(token, config.jwt.participantSecret);
        req.participantId = decoded.participantId;
        req.examId = decoded.examId || null;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = {
    authenticateOrganizer,
    authenticateParticipant
};
