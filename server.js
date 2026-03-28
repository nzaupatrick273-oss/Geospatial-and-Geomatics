const express = require('express');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Session setup
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// Serve static files (CSS, JS, uploads, HTML)
app.use(express.static('public'));

// Body parser
app.use(express.urlencoded({ extended: true }));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ================= ROUTES ==================

// Admin login page
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Admin login POST
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'KIMANGI' && password === 'Patrick') {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('Invalid credentials');
  }
});

// Admin dashboard
app.get('/admin', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/admin-login');

  const folder = path.join(__dirname, 'public/uploads');
  let files = [];
  if (fs.existsSync(folder)) {
    files = fs.readdirSync(folder);
  }

  // Inject uploaded files into admin.html
  const adminHtmlPath = path.join(__dirname, 'public', 'admin.html');
  let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');
  const filesListHtml = files.map(f => `<li><a href="/uploads/${f}" target="_blank">${f}</a></li>`).join('');
  adminHtml = adminHtml.replace('{{filesList}}', filesListHtml);

  res.send(adminHtml);
});

// Handle file upload
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send('Unauthorized');
  res.redirect('/admin');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

// ================= Public Routes ==================

// Public home page (example)
app.get('/', (req, res) => {
  // Simple page with "Available Files" link
  res.send(`
    <h1>Welcome to Public Dashboard</h1>
    <a href="/files" style="font-size:20px; text-decoration:none; color:#007BFF;">Available Files</a>
  `);
});

// Public page to list uploaded files
app.get('/files', (req, res) => {
  const folder = path.join(__dirname, 'public/uploads');
  let filesList = '';
  if (fs.existsSync(folder)) {
    const files = fs.readdirSync(folder);
    if (files.length === 0) {
      filesList = '<li>No files uploaded yet.</li>';
    } else {
      filesList = files.map(f => `<li><a href="/uploads/${f}" target="_blank">${f}</a></li>`).join('');
    }
  }
  res.send(`
    <h1>Available Files</h1>
    <ul>${filesList}</ul>
    <a href="/" style="margin-top:20px; display:inline-block;">Back to Dashboard</a>
  `);
});

// ================= Start Server ==================
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));