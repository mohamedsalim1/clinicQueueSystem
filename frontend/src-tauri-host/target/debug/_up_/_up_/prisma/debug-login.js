/**
 * Usage:
 *   node prisma/debug-login.js <username> <password>
 *
 * This script does not print the password or password hash.
 */

require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const [, , usernameArg, passwordArg] = process.argv;
  const username = String(usernameArg || '').trim();

  if (!username || !passwordArg) {
    console.error('Usage: node prisma/debug-login.js <username> <password>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      mustChangePass: true,
      passwordHash: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    console.log(JSON.stringify({
      ok: false,
      reason: 'USER_NOT_FOUND',
      username,
    }, null, 2));
    return;
  }

  const passwordMatches = await bcrypt.compare(passwordArg, user.passwordHash);

  console.log(JSON.stringify({
    ok: passwordMatches && user.isActive,
    reason: !user.isActive ? 'USER_INACTIVE' : passwordMatches ? 'LOGIN_SHOULD_WORK' : 'BAD_PASSWORD',
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      mustChangePass: user.mustChangePass,
      lastLoginAt: user.lastLoginAt,
    },
    passwordMatches,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Debug login failed:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
