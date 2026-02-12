const crypto = require('crypto');

// The logic from participantRoutes.js
const seededRandom = (s) => {
    let h = 0xdeadbeef;
    for (let i = 0; i < s.length; i++) {
        h = Math.imul(h ^ s.charCodeAt(i), 0x517cc1b7);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 0x22468225);
        h = Math.imul(h ^ (h >>> 13), 0x3266489a);
        return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
};

function shuffleQuestions(questions, participantId, examId) {
    const seedStr = `${participantId}-${examId}`;
    const rng = seededRandom(seedStr);
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Test Data
const mockQuestions = [
    { id: 1, title: 'Q1' },
    { id: 2, title: 'Q2' },
    { id: 3, title: 'Q3' },
    { id: 4, title: 'Q4' },
    { id: 5, title: 'Q5' }
];

console.log('--- Shuffling Verification ---');

// Test 1: Determinism (Same participant, same exam)
const p1_e1_v1 = shuffleQuestions(mockQuestions, 1, 10).map(q => q.id);
const p1_e1_v2 = shuffleQuestions(mockQuestions, 1, 10).map(q => q.id);
console.log(`P1, E1 (Run 1): [${p1_e1_v1.join(', ')}]`);
console.log(`P1, E1 (Run 2): [${p1_e1_v2.join(', ')}]`);
const test1Passed = JSON.stringify(p1_e1_v1) === JSON.stringify(p1_e1_v2);
console.log(`Test 1 (Determinism): ${test1Passed ? '✅ PASSED' : '❌ FAILED'}`);

// Test 2: Uniqueness (Different participants, same exam)
const p2_e1 = shuffleQuestions(mockQuestions, 2, 10).map(q => q.id);
console.log(`P2, E1:          [${p2_e1.join(', ')}]`);
const test2Passed = JSON.stringify(p1_e1_v1) !== JSON.stringify(p2_e1);
console.log(`Test 2 (Uniqueness across P): ${test2Passed ? '✅ PASSED' : '❌ FAILED'}`);

// Test 3: Uniqueness (Same participant, different exams)
const p1_e2 = shuffleQuestions(mockQuestions, 1, 11).map(q => q.id);
console.log(`P1, E2:          [${p1_e2.join(', ')}]`);
const test3Passed = JSON.stringify(p1_e1_v1) !== JSON.stringify(p1_e2);
console.log(`Test 3 (Uniqueness across E): ${test3Passed ? '✅ PASSED' : '❌ FAILED'}`);

if (test1Passed && test2Passed && test3Passed) {
    console.log('\nAll tests passed successfully! 🚀');
} else {
    process.exit(1);
}
