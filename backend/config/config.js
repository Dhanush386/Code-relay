require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  database: {
    url: process.env.DATABASE_URL
  },
  jwt: {
    organizerSecret: process.env.ORGANIZER_JWT_SECRET,
    participantSecret: process.env.PARTICIPANT_JWT_SECRET,
    expiresIn: '24h'
  },
  docker: {
    image: 'coding-exam-executor',
    timeLimit: 5000, // milliseconds
    memoryLimit: '256m'
  }
};
