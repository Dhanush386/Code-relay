const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = 'organizer@codeexam.com';
    const password = 'password123';
    const name = 'Admin Organizer';

    // Check if organizer already exists
    const existing = await prisma.organizer.findUnique({ where: { email } });

    if (existing) {
        console.log(`Organizer with email ${email} already exists.`);
        console.log('You can login with:');
        console.log(`Email: ${email}`);
        console.log(`Password: (The one you set previously)`);
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organizer
    const organizer = await prisma.organizer.create({
        data: {
            email,
            password: hashedPassword,
            name
        }
    });

    console.log('✅ Organizer created successfully!');
    console.log('Login credentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
