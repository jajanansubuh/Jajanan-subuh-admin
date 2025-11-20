(async function(){
  try {
    const { PrismaClient } = require('../generated/prisma');
    const prisma = new PrismaClient();

    const users = await prisma.user.findMany({
      where: { storeId: { not: null } },
      select: { id: true, storeId: true, name: true, email: true, createdAt: true }
    });

    if (!users || users.length === 0) {
      console.log('NO_USERS_WITH_STOREID');
    } else {
      console.log(JSON.stringify(users, null, 2));
    }

    await prisma.$disconnect();
  } catch (err) {
    console.error('ERROR_CHECKING_USERS:', err);
    process.exit(1);
  }
})();
