const { Client } = require('pg');

const TARGET_URL = 'postgresql://postgres.ldwvsovcsrbbuosyguaw:magangairnavpolimdo2026@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
const OLD_URL = 'postgresql://postgres.myewtzbhfubufnywzjpo:natanaelkumentas2511@aws-1-ap-south-1.pooler.supabase.com:5432/postgres';

async function migrateDb(url, label) {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`Connected to ${label}.`);

    // Clean sub_group to numbers only (e.g. 'CNS 1' -> '1', 'ESS 2' -> '2')
    const updateRes = await client.query(`
      UPDATE jadwal.staff
      SET sub_group = REGEXP_REPLACE(sub_group, '[^0-9]', '', 'g')
      WHERE sub_group ~ '[0-9]';

      UPDATE jadwal.staff
      SET sub_group = '-'
      WHERE role_level = 'Manager Teknik' OR sub_group IS NULL OR sub_group = '';

      NOTIFY pgrst, 'reload schema';
    `);

    const checkRes = await client.query(`SELECT name, group, sub_group, role_level FROM jadwal.staff ORDER BY name;`);
    console.log(`Updated ${checkRes.rowCount} staff rows in ${label}. Sample:`, checkRes.rows.slice(0, 5));
  } catch (err) {
    console.error(`Error updating ${label}:`, err.message);
  } finally {
    await client.end();
  }
}

async function main() {
  await migrateDb(TARGET_URL, 'TARGET DB (ldwvsovcsrbbuosyguaw)');
  await migrateDb(OLD_URL, 'OLD DB (myewtzbhfubufnywzjpo)');
}

main();
