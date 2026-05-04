import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const tables = [
  `CREATE TABLE IF NOT EXISTS \`leads\` (
    \`id\` varchar(36) NOT NULL,
    \`name\` varchar(255) NOT NULL,
    \`phone\` varchar(50) NOT NULL DEFAULT '',
    \`email\` varchar(320) NOT NULL DEFAULT '',
    \`caseType\` varchar(50) NOT NULL,
    \`caseNumber\` varchar(100) NOT NULL DEFAULT '',
    \`source\` varchar(100) NOT NULL DEFAULT '',
    \`stage\` enum('New Lead','Consultation','Retained','Lost') NOT NULL DEFAULT 'New Lead',
    \`notes\` text NOT NULL,
    \`date\` varchar(10) NOT NULL,
    \`retainerBooked\` decimal(10,2) NOT NULL DEFAULT '0',
    \`downpayment\` decimal(10,2) NOT NULL DEFAULT '0',
    \`quotedAmount\` decimal(10,2) NOT NULL DEFAULT '0',
    \`referredBy\` varchar(255) NOT NULL DEFAULT '',
    \`convertedDate\` varchar(10),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`leads_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`payments\` (
    \`id\` varchar(36) NOT NULL,
    \`date\` varchar(10) NOT NULL,
    \`clientName\` varchar(255) NOT NULL,
    \`leadId\` varchar(36),
    \`caseType\` varchar(50) NOT NULL,
    \`caseNumber\` varchar(100) NOT NULL DEFAULT '',
    \`paymentType\` enum('New Client','Existing Client') NOT NULL,
    \`amount\` decimal(10,2) NOT NULL,
    \`receivedFor\` varchar(500) NOT NULL DEFAULT '',
    \`notes\` text NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`payments_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of tables) {
  try {
    await conn.query(sql);
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `(\w+)`/)?.[1];
    console.log(`✓ ${tableName} table ready`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

// Mark all pending migrations as applied in __drizzle_migrations
const migrations = [
  { hash: '0001_crazy_sugar_man', created_at: Date.now() },
  { hash: '0002_cynical_machine_man', created_at: Date.now() + 1 },
];

for (const m of migrations) {
  try {
    await conn.query(
      `INSERT IGNORE INTO \`__drizzle_migrations\` (hash, created_at) VALUES (?, ?)`,
      [m.hash, m.created_at]
    );
    console.log(`✓ Migration ${m.hash} marked as applied`);
  } catch (err) {
    console.error('Migration mark error:', err.message);
  }
}

const [rows] = await conn.query('SHOW TABLES');
console.log('\nAll tables:', rows.map(r => Object.values(r)[0]));

await conn.end();
