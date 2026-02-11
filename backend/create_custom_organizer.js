const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    // Get arguments from command line
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.log('Usage: node create_custom_organizer.js <email> <password> [name]');
        console.log('Example: node create_custom_organizer.js user@example.com mypassword "John Doe"');
        return;
    }

    const email = args[0];
    const password = args[1];
    const name = args[2] || 'Organizer';

    console.log(`Attempting to create organizer: ${name} (${email})`);

    // Check if organizer already exists
    const existing = await prisma.organizer.findUnique({ where: { email } });

    if (existing) {
        console.log(`❌ Organizer with email ${email} already exists.`);
        return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organizer
    try {
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
        console.log(`Name: ${name}`);
    } catch (error) {
        console.error('❌ Failed to create organizer:', error);
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
