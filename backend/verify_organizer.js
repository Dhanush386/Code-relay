const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'admin@test.com';
    const organizer = await prisma.organizer.findUnique({ where: { email } });

    if (organizer) {
        console.log(`✅ Verified: Organizer ${email} exists.`);
        console.log(`ID: ${organizer.id}`);
        console.log(`Name: ${organizer.name}`);
    } else {
        console.log(`❌ Organizer ${email} NOT found.`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
