import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

db = await mysql.createConnection(
  process.env.DB_HOST
    ? {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }
    : {
      socketPath: `/cloudsql/quizgame-491018:us-west1:quizgame`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }
);

await db.execute(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

const migrationsDir = './migrations';
const files = fs.readdirSync(migrationsDir).sort();

const [ran] = await db.execute('SELECT filename FROM migrations');
const ranFiles = ran.map(r => r.filename);

for (const file of files) {
  if (ranFiles.includes(file)) {
    console.log(`Skipping ${file} (already run)`);
    continue;
  }

  console.log(`Running ${file}...`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const statement of statements) {
    await db.execute(statement);
  }
  await db.execute('INSERT INTO migrations (filename) VALUES (?)', [file]);
  console.log(`Done ${file}`);
}

await db.end();
console.log('Migrations complete');