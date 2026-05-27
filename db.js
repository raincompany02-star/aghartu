const fs   = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

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
    all() { return load('users'); },
    get(id) { return load('users').find(u => u.id === id); },
    byPhone(phone) { return load('users').find(u => u.phone === phone); },
    insert(data) {
      const rows = load('users');
      if (rows.find(u => u.phone === data.phone)) throw Object.assign(new Error('UNIQUE'), { code: 'UNIQUE' });
      const row = { id: nextId(rows), created_at: now(), ...data };
      rows.push(row); save('users', rows); return row;
    },
    setRole(id, role) {
      const rows = load('users');
      const u = rows.find(u => u.id === id);
      if (u) u.role = role;
      save('users', rows);
    }
  },

  tasks: {
    all() { return load('tasks'); },
    forUser(userId) { return load('tasks').filter(t => t.assigned_to === userId); },
    insert(data) {
      const rows = load('tasks');
      const row = { id: nextId(rows), status: 'todo', created_at: now(), updated_at: now(), ...data };
      rows.push(row); save('tasks', rows); return row;
    },
    setStatus(id, status) {
      const rows = load('tasks');
      const t = rows.find(t => t.id === id);
      if (t) { t.status = status; t.updated_at = now(); }
      save('tasks', rows);
    },
    del(id) { save('tasks', load('tasks').filter(t => t.id !== id)); }
  },

  attendance: {
    today(userId, date) { return load('attendance').find(a => a.user_id === userId && a.date === date); },
    forDate(date)       { return load('attendance').filter(a => a.date === date); },
    forUser(userId)     { return load('attendance').filter(a => a.user_id === userId).slice(-30); },
    checkin(userId, date, time, lat, lon) {
      const rows = load('attendance');
      let r = rows.find(a => a.user_id === userId && a.date === date);
      if (!r) { r = { id: nextId(rows), user_id: userId, date }; rows.push(r); }
      r.check_in = time; r.check_in_lat = lat || null; r.check_in_lon = lon || null;
      save('attendance', rows);
    },
    checkout(userId, date, time, lat, lon) {
      const rows = load('attendance');
      const r = rows.find(a => a.user_id === userId && a.date === date);
      if (r) { r.check_out = time; r.check_out_lat = lat || null; r.check_out_lon = lon || null; }
      save('attendance', rows);
    }
  },

  reports: {
    all()         { return load('reports'); },
    forDate(date) { return load('reports').filter(r => r.date === date); },
    forUser(userId) { return load('reports').filter(r => r.user_id === userId).slice(-30); },
    insert(data)  {
      const rows = load('reports');
      const row = { id: nextId(rows), created_at: now(), ...data };
      rows.push(row); save('reports', rows); return row;
    }
  }
};

module.exports = db;
