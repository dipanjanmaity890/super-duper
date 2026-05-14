// backend/src/db/seedIPL.js
// Seeds all 10 IPL 2026 teams + upcoming matches linked to CricAPI IDs

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const query = (text, params) => pool.query(text, params);

// ─── IPL Teams ─────────────────────────────────────────────────────────────────
const IPL_TEAMS = [
  { name: 'Mumbai Indians',            short_code: 'MI',   badge_color: 'blue',   city: 'Mumbai',    country: 'India' },
  { name: 'Chennai Super Kings',        short_code: 'CSK',  badge_color: 'amber',  city: 'Chennai',   country: 'India' },
  { name: 'Royal Challengers Bengaluru',short_code: 'RCB',  badge_color: 'coral',  city: 'Bengaluru', country: 'India' },
  { name: 'Kolkata Knight Riders',      short_code: 'KKR',  badge_color: 'purple', city: 'Kolkata',   country: 'India' },
  { name: 'Delhi Capitals',             short_code: 'DC',   badge_color: 'blue',   city: 'Delhi',     country: 'India' },
  { name: 'Punjab Kings',               short_code: 'PBKS', badge_color: 'coral',  city: 'Mohali',    country: 'India' },
  { name: 'Rajasthan Royals',           short_code: 'RR',   badge_color: 'purple', city: 'Jaipur',    country: 'India' },
  { name: 'Sunrisers Hyderabad',        short_code: 'SRH',  badge_color: 'amber',  city: 'Hyderabad', country: 'India' },
  { name: 'Lucknow Super Giants',       short_code: 'LSG',  badge_color: 'teal',   city: 'Lucknow',   country: 'India' },
  { name: 'Gujarat Titans',             short_code: 'GT',   badge_color: 'teal',   city: 'Ahmedabad', country: 'India' },
];

// ─── Upcoming + Recent IPL 2026 matches (linked to CricAPI IDs in metadata) ───
const IPL_MATCHES = [
  // Recently completed — shown as finished with real scores
  { home: 'Royal Challengers Bengaluru', away: 'Kolkata Knight Riders', date: '2026-05-13T14:00:00Z', venue: 'Shaheed Veer Narayan Singh International Stadium, Raipur', match_num: 57, home_score: 194, away_score: 192, status: 'finished', cric_id: '0b3bab15-12b2-4a16-9f41-1096e40ff202' },
  { home: 'Gujarat Titans', away: 'Sunrisers Hyderabad', date: '2026-05-12T14:00:00Z', venue: 'Narendra Modi Stadium, Ahmedabad', match_num: 56, home_score: 168, away_score: 86, status: 'finished', cric_id: '9413d7dd-bf8e-49f6-8ce7-91faf29a0115' },
  { home: 'Punjab Kings', away: 'Delhi Capitals', date: '2026-05-11T14:00:00Z', venue: 'Punjab Cricket Association IS Bindra Stadium, Mohali', match_num: 55, home_score: 210, away_score: 216, status: 'finished', cric_id: 'ee5ab0d9-acd2-42bf-b5bc-f4d287e0f434' },
  { home: 'Royal Challengers Bengaluru', away: 'Mumbai Indians', date: '2026-05-10T14:00:00Z', venue: 'M Chinnaswamy Stadium, Bengaluru', match_num: 54, home_score: 167, away_score: 166, status: 'finished', cric_id: '02d3614d-9727-43c5-a80c-0bf46c7499c6' },
  { home: 'Chennai Super Kings', away: 'Lucknow Super Giants', date: '2026-05-09T14:00:00Z', venue: 'MA Chidambaram Stadium, Chennai', match_num: 53, home_score: 208, away_score: 203, status: 'finished', cric_id: '6aced947-319c-4e4a-9214-6f94f14c043e' },

  // Today / upcoming — shown as scheduled or live
  { home: 'Kolkata Knight Riders', away: 'Gujarat Titans', date: '2026-05-16T14:00:00Z', venue: 'Eden Gardens, Kolkata', match_num: 60, status: 'scheduled', cric_id: '166633a2-cecb-4cf3-a984-78dc898b5345' },
  { home: 'Punjab Kings', away: 'Royal Challengers Bengaluru', date: '2026-05-17T10:00:00Z', venue: 'Punjab Cricket Association IS Bindra Stadium, Mohali', match_num: 61, status: 'scheduled', cric_id: '288e3406-3692-400a-bc22-fb8cfa0db2ca' },
  { home: 'Delhi Capitals', away: 'Rajasthan Royals', date: '2026-05-17T14:00:00Z', venue: 'Arun Jaitley Stadium, Delhi', match_num: 62, status: 'scheduled', cric_id: '990e89ea-3f6a-4196-ac73-7ad1a5f8c451' },
  { home: 'Chennai Super Kings', away: 'Sunrisers Hyderabad', date: '2026-05-18T14:00:00Z', venue: 'MA Chidambaram Stadium, Chennai', match_num: 63, status: 'scheduled', cric_id: '8416c2a9-4a74-4ac2-a6ae-5ad2538cbc56' },
  { home: 'Rajasthan Royals', away: 'Lucknow Super Giants', date: '2026-05-19T14:00:00Z', venue: 'Sawai Mansingh Stadium, Jaipur', match_num: 64, status: 'scheduled', cric_id: '3b225f44-ddf2-41d4-8079-7a3f81876e35' },
  { home: 'Kolkata Knight Riders', away: 'Mumbai Indians', date: '2026-05-20T14:00:00Z', venue: 'Eden Gardens, Kolkata', match_num: 65, status: 'scheduled', cric_id: '5b1d59f9-51fd-449d-8cf1-9fc15ef15675' },
  { home: 'Gujarat Titans', away: 'Chennai Super Kings', date: '2026-05-21T14:00:00Z', venue: 'Narendra Modi Stadium, Ahmedabad', match_num: 66, status: 'scheduled', cric_id: 'fd660ab1-c4bf-4c0f-b1b9-7232361cd1e8' },
  { home: 'Sunrisers Hyderabad', away: 'Royal Challengers Bengaluru', date: '2026-05-22T14:00:00Z', venue: 'Rajiv Gandhi International Cricket Stadium, Hyderabad', match_num: 67, status: 'scheduled', cric_id: 'bf23431b-ba1c-4147-94d9-b8d361a3ce9e' },
];

async function seed() {
  console.log('🏏 Seeding IPL 2026 teams and matches...\n');

  // 1. Insert teams
  const teamIds = {};
  for (const t of IPL_TEAMS) {
    const { rows } = await query(
      `INSERT INTO teams (name, short_code, badge_color, city, country)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [t.name, t.short_code, t.badge_color, t.city, t.country]
    );
    if (rows[0]) {
      teamIds[t.name] = rows[0].id;
      console.log(`  ✓ Team: ${rows[0].name}`);
    } else {
      // Already exists — look up id
      const { rows: existing } = await query('SELECT id FROM teams WHERE name=$1', [t.name]);
      if (existing[0]) teamIds[t.name] = existing[0].id;
    }
  }

  console.log(`\n✓ ${Object.keys(teamIds).length} IPL teams ready\n`);

  // 2. Insert matches
  let created = 0;
  for (const m of IPL_MATCHES) {
    const homeId = teamIds[m.home];
    const awayId = teamIds[m.away];
    if (!homeId || !awayId) {
      console.warn(`  ⚠ Skipping match ${m.match_num} — team not found`);
      continue;
    }

    const meta = JSON.stringify({ cric_id: m.cric_id, ipl: true, match_number: m.match_num });

    const { rows } = await query(
      `INSERT INTO matches
         (home_team_id, away_team_id, scheduled_at, venue, competition, season,
          status, home_score, away_score, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        homeId, awayId,
        m.date,
        m.venue,
        'Indian Premier League 2026',
        'IPL 2026',
        m.status || 'scheduled',
        m.home_score || 0,
        m.away_score || 0,
        meta,
      ]
    );

    if (rows[0]) {
      // Create empty match_stats rows
      await query(`INSERT INTO match_stats (match_id, team_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [rows[0].id, homeId]);
      await query(`INSERT INTO match_stats (match_id, team_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [rows[0].id, awayId]);
      console.log(`  ✓ Match ${m.match_num}: ${m.home} vs ${m.away} [${m.status || 'scheduled'}]`);
      created++;
    } else {
      console.log(`  – Match ${m.match_num} already exists, skipping`);
    }
  }

  console.log(`\n✅ IPL seed complete — ${created} matches added`);
  await pool.end();
}

seed().catch((e) => { console.error('Seed error:', e.message); process.exit(1); });
