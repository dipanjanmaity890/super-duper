require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Demo users
    const users = [
      { username: 'TacticalAce',  email: 'ace@demo.com',     password: 'demo123', color: 'teal'   },
      { username: 'KickBoss99',   email: 'kick@demo.com',    password: 'demo123', color: 'coral'  },
      { username: 'StrikerGuru',  email: 'striker@demo.com', password: 'demo123', color: 'blue'   },
      { username: 'admin',        email: 'admin@demo.com',   password: 'admin123',color: 'amber', isAdmin: true },
    ];

    const userIds = [];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const initials = u.username.slice(0,2).toUpperCase();
      const { rows: [user] } = await client.query(
        `INSERT INTO users (username, email, password_hash, avatar_initials, avatar_color, is_admin)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (email) DO UPDATE SET username = EXCLUDED.username
         RETURNING id`,
        [u.username, u.email, hash, initials, u.color, u.isAdmin || false]
      );
      userIds.push(user.id);
    }

    // Start the demo match
    const { rows: [match] } = await client.query(
      `UPDATE matches SET status = 'live', started_at = NOW(), match_minute = 22
       WHERE id = 'aaaaaaaa-0000-0000-0000-000000000001'
       RETURNING *`
    );

    if (match) {
      // Insert a kickoff event
      const { rows: [evt] } = await client.query(
        `INSERT INTO match_events (match_id, event_type, minute, description, is_key_moment)
         VALUES ($1,'kickoff',1,'Kick off! Manchester FC vs Arsenal North',false)
         ON CONFLICT DO NOTHING RETURNING id`,
        [match.id]
      );

      // Insert a goal event
      const { rows: [goalEvt] } = await client.query(
        `INSERT INTO match_events (match_id, event_type, minute, team_id, player_name, description, is_key_moment)
         VALUES ($1,'goal',18,'11111111-0000-0000-0000-000000000001','Harry Kane','Kane heads home from a Foden cross. Clinical finish!',true)
         RETURNING id`,
        [match.id]
      );

      await client.query(
        `UPDATE matches SET home_score = 1, active_event_id = $1 WHERE id = $2`,
        [goalEvt.id, match.id]
      );

      // Update stats
      await client.query(
        `UPDATE match_stats SET possession = 62, shots = 6, shots_on_target = 3, passes = 210, corners = 2
         WHERE match_id = $1 AND team_id = '11111111-0000-0000-0000-000000000001'`,
        [match.id]
      );
      await client.query(
        `UPDATE match_stats SET possession = 38, shots = 3, shots_on_target = 1, passes = 143, corners = 1
         WHERE match_id = $1 AND team_id = '11111111-0000-0000-0000-000000000002'`,
        [match.id]
      );

      // Create a live poll
      const { rows: [poll] } = await client.query(
        `INSERT INTO polls (match_id, question, poll_type, points_reward)
         VALUES ($1,'Who wins this match?','outcome',10) RETURNING id`,
        [match.id]
      );

      const options = ['Manchester FC', 'Draw', 'Arsenal North'];
      const votes   = [58, 21, 21];
      for (let i = 0; i < options.length; i++) {
        await client.query(
          `INSERT INTO poll_options (poll_id, option_text, display_order, vote_count)
           VALUES ($1,$2,$3,$4)`,
          [poll.id, options[i], i, votes[i]]
        );
      }

      await client.query(
        `UPDATE matches SET active_poll_id = $1 WHERE id = $2`,
        [poll.id, match.id]
      );

      // Seed leaderboard entries
      const pts = [340, 290, 255];
      for (let i = 0; i < Math.min(3, userIds.length); i++) {
        await client.query(
          `INSERT INTO match_leaderboard (match_id, user_id, points)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [match.id, userIds[i], pts[i]]
        );
      }

      // Reaction counts
      const reactionTypes = ['fire','shock','target','angry','chat'];
      const rcCounts = [9200, 4100, 3700, 1800, 810];
      for (let i = 0; i < reactionTypes.length; i++) {
        await client.query(
          `INSERT INTO reaction_counts (match_event_id, reaction_type, count)
           VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [goalEvt.id, reactionTypes[i], rcCounts[i]]
        );
      }
    }

    await client.query('COMMIT');
    console.log('✓ Seed complete');
    console.log('  Demo logins: admin@demo.com / admin123, ace@demo.com / demo123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed error:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
