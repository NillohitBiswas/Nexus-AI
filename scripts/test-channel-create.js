const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const id = 'test_null_user_' + Date.now();
  try {
    console.log('Attempting to create channel with id', id);
    const ch = await prisma.channel.create({
      data: {
        id,
        name: 'test-null-user',
        subCount: 0,
        thumbnail: '',
        isCompetitor: false,
      },
    });
    console.log('Created channel:', ch.id);
    await prisma.channel.delete({ where: { id } });
    console.log('Deleted test channel');
    process.exit(0);
  } catch (err) {
    console.error('Error from prisma.channel.create():', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
