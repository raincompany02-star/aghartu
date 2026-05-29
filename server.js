require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: ['https://aghartu.onrender.com', 'http://localhost:3000'],
  credentials: true
}));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/tasks',      require('./routes/tasks'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/users',      require('./routes/users'));

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.get('/employee',   (_, res) => res.sendFile(path.join(__dirname, 'public', 'employee.html')));
app.get('/manager',    (_, res) => res.sendFile(path.join(__dirname, 'public', 'manager.html')));
app.get('/director',   (_, res) => res.sendFile(path.join(__dirname, 'public', 'director.html')));
app.get('*',           (_, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Aghartu: http://localhost:' + PORT));
