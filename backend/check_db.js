const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const exams = await prisma.exam.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        startTime: true,
        endTime: true
      }
    });
    console.log('Current Server Time:', new Date().toISOString());
    console.log('Exams:');
    exams.forEach(e => {
      console.log(`- ID: ${e.id}, Code: ${e.code}, Title: ${e.title}`);
      console.log(`  Start: ${e.startTime ? e.startTime.toISOString() : 'null'}`);
      console.log(`  End:   ${e.endTime ? e.endTime.toISOString() : 'null'}`);
    });
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
