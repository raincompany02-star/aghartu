require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const USE_PG = !!process.env.DATABASE_URL;
let pool;

if (USE_PG) {
  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'employee',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      assigned_to INT,
      created_by INT,
      due_date TEXT,
      type TEXT DEFAULT 'daily',
      status TEXT DEFAULT 'todo',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT,
      check_in_lat REAL,
      check_in_lon REAL,
      check_out TEXT,
      check_out_lat REAL,
      check_out_lon REAL,
      UNIQUE(user_id, date)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `).catch(console.error);
}

const DIR = path.join(__dirname, 'data');
if (!USE_PG && !fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function load(table) {
  const f = path.join(DIR, `${table}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : [];
}
function save(table, rows) {
  fs.writeFileSync(path.join(DIR, `${table}.json`), JSON.stringify(rows));
}
function nextId(rows) {
  return rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
}
function now() { return new Date().toISOString(); }

const db = {
  users: {
    async all() {
      if (USE_PG) {
        const { rows } = await pool.query('SELECT * FROM users ORDER BY id');
        return rows;
      }
      return load('users');
    },
    async get(id) {
      if (USE_PG) {
        const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
        return rows[0] || null;
      }
      return load('users').find(u => u.id === id) || null;
    },
    async byPhone(phone) {
      if (USE_PG) {
        const { rows } = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
        return rows[0] || null;
      }
      return load('users').find(u => u.phone === phone) || null;
    },
    async insert(data) {
      if (USE_PG) {
        try {
          const { rows } = await pool.query(
            'INSERT INTO users (phone,password_hash,first_name,last_name,role,created_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
            [data.phone, data.password_hash, data.first_name, data.last_name, data.role || 'employee', now()]
          );
          return rows[0];
        } catch(e) {
          if (e.code === '23505') throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
          throw e;
        }
      }
      const rows = load('users');
      if (rows.find(u => u.phone === data.phone)) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
      const row = { id: nextId(rows), created_at: now(), ...data };
      rows.push(row); save('users', rows); return row;
    },
    async setRole(id, role) {
      if (USE_PG) {
        await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, id]);
        return;
      }
      const rows = load('users');
      const u = rows.find(u => u.id === id);
      if (u) u.role = role;
      save('users', rows);
    }
  },

  tasks: {
    async all() {
      if (USE_PG) {
        const { rows } = await pool.query(`
          SELECT t.*,
            u1.first_name||' '||u1.last_name AS assigned_to_name,
            u2.first_name||' '||u2.last_name AS created_by_name
          FROM tasks t
          LEFT JOIN users u1 ON t.assigned_to = u1.id
          LEFT JOIN users u2 ON t.created_by  = u2.id
          ORDER BY t.id
        `);
        return rows;
      }
      return load('tasks');
    },
    async insert(data) {
      if (USE_PG) {
        const { rows } = await pool.query(
          'INSERT INTO tasks (title,description,assigned_to,created_by,due_date,type,status,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
          [data.title, data.description||null, data.assigned_to||null, data.created_by||null,
           data.due_date||null, data.type||'daily', data.status||'todo', now(), now()]
        );
        return rows[0];
      }
      const rows = load('tasks');
      const row = { id: nextId(rows), status: 'todo', created_at: now(), updated_at: now(), ...data };
      rows.push(row); save('tasks', rows); return row;
    },
    async setStatus(id, status) {
      if (USE_PG) {
        await pool.query('UPDATE tasks SET status=$1, updated_at=$2 WHERE id=$3', [status, now(), id]);
        return;
      }
      const rows = load('tasks');
      const t = rows.find(t => t.id === id);
      if (t) { t.status = status; t.updated_at = now(); }
      save('tasks', rows);
    },
    async del(id) {
      if (USE_PG) {
        await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
        return;
      }
      save('tasks', load('tasks').filter(t => t.id !== id));
    }
  },

  attendance: {
    async today(userId, date) {
      if (USE_PG) {
        const { rows } = await pool.query('SELECT * FROM attendance WHERE user_id=$1 AND date=$2', [userId, date]);
        return rows[0] || null;
      }
      return load('attendance').find(a => a.user_id === userId && a.date === date) || null;
    },
    async forDate(date) {
      if (USE_PG) {
        const { rows } = await pool.query(`
          SELECT a.*, u.first_name||' '||u.last_name AS name
          FROM attendance a JOIN users u ON a.user_id=u.id
          WHERE a.date=$1 ORDER BY a.check_in
        `, [date]);
        return rows;
      }
      return load('attendance').filter(a => a.date === date);
    },
    async forUser(userId) {
      if (USE_PG) {
        const { rows } = await pool.query('SELECT * FROM attendance WHERE user_id=$1 ORDER BY date DESC LIMIT 30', [userId]);
        return rows;
      }
      return load('attendance').filter(a => a.user_id === userId).slice(-30);
    },
    async checkin(userId, date, time, lat, lon) {
      if (USE_PG) {
        await pool.query(`
          INSERT INTO attendance (user_id,date,check_in,check_in_lat,check_in_lon)
          VALUES($1,$2,$3,$4,$5)
          ON CONFLICT(user_id,date) DO UPDATE SET check_in=$3, check_in_lat=$4, check_in_lon=$5
        `, [userId, date, time, lat||null, lon||null]);
        return;
      }
      const rows = load('attendance');
      let r = rows.find(a => a.user_id === userId && a.date === date);
      if (!r) { r = { id: nextId(rows), user_id: userId, date }; rows.push(r); }
      r.check_in = time; r.check_in_lat = lat||null; r.check_in_lon = lon||null;
      save('attendance', rows);
    },
    async checkout(userId, date, time, lat, lon) {
      if (USE_PG) {
        await pool.query(`
          UPDATE attendance SET check_out=$1, check_out_lat=$2, check_out_lon=$3
          WHERE user_id=$4 AND date=$5
        `, [time, lat||null, lon||null, userId, date]);
        return;
      }
      const rows = load('attendance');
      const r = rows.find(a => a.user_id === userId && a.date === date);
      if (r) { r.check_out = time; r.check_out_lat = lat||null; r.check_out_lon = lon||null; }
      save('attendance', rows);
    }
  },

  reports: {
    async all() {
      if (USE_PG) {
        const { rows } = await pool.query(`
          SELECT r.*, u.first_name||' '||u.last_name AS name
          FROM reports r JOIN users u ON r.user_id=u.id
          ORDER BY r.created_at DESC
        `);
        return rows;
      }
      return load('reports');
    },
    async forDate(date) {
      if (USE_PG) {
        const { rows } = await pool.query(`
          SELECT r.*, u.first_name||' '||u.last_name AS name
          FROM reports r JOIN users u ON r.user_id=u.id
          WHERE r.date=$1 ORDER BY r.created_at DESC
        `, [date]);
        return rows;
      }
      return load('reports').filter(r => r.date === date);
    },
    async forUser(userId) {
      if (USE_PG) {
        const { rows } = await pool.query('SELECT * FROM reports WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [userId]);
        return rows;
      }
      return load('reports').filter(r => r.user_id === userId).slice(-30);
    },
    async insert(data) {
      if (USE_PG) {
        const { rows } = await pool.query(
          'INSERT INTO reports (user_id,date,content,created_at) VALUES($1,$2,$3,$4) RETURNING *',
          [data.user_id, data.date, data.content, now()]
        );
        return rows[0];
      }
      const rows = load('reports');
      const row = { id: nextId(rows), created_at: now(), ...data };
      rows.push(row); save('reports', rows); return row;
    }
  }
};

module.exports = db;
