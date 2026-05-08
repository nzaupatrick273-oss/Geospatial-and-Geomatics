require('dotenv').config();

const express = require('express');
const session = require('express-session');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

const app = express();
const PORT = 3000;

/* ================= CLOUDINARY CONFIG ================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/* ================= MEMORY DATABASE ================= */
const fileDB = [];

/* ================= MIDDLEWARE ================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'gegis-secret-key',
  resave: false,
  saveUninitialized: true
}));

const upload = multer({ storage: multer.memoryStorage() });

/* ================= CLEAN FILE NAME ================= */
function cleanFileName(name) {
  return name
    .replace(/\.[^/.]+$/, "")      // remove extension
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .toLowerCase();
}

/* ================= CLOUDINARY UPLOAD ================= */
function uploadToCloudinary(fileBuffer, filename, ext) {
  return new Promise((resolve, reject) => {

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "gegis",

        // IMPORTANT FIX:
        resource_type: "raw",   // ✔ best for PDFs/docs

        public_id: filename     // NO extension here
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
}

/* ================= ADMIN LOGIN ================= */
app.get('/admin-login', (req, res) => {
  res.sendFile(__dirname + '/public/admin-login.html');
});

app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === 'KIMANGI' && password === 'Patrick') {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('Invalid credentials');
  }
});

/* ================= ADMIN DASHBOARD ================= */
app.get('/admin', (req, res) => {
  if (!req.session.loggedIn) return res.redirect('/admin-login');

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Dashboard</title>
<style>
body{font-family:Arial;margin:0;background:#f4f6f8;}
header{background:#007BFF;color:white;padding:20px;text-align:center;}
.container{max-width:600px;margin:auto;padding:20px;}
.box{background:white;padding:20px;border-radius:10px;margin-bottom:20px;}
select,input,button{width:100%;padding:10px;margin-top:10px;}
button{background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;}
a{text-decoration:none;color:red;}
</style>
</head>
<body>

<header><h2>Admin Dashboard</h2></header>

<div class="container">

  <div class="box">
    <h3>Upload Files</h3>

    <form action="/upload" method="POST" enctype="multipart/form-data">

      <select name="category" required>
        <option value="notes">NOTES</option>
        <option value="cat">CAT</option>
        <option value="exams">EXAMS</option>
      </select>

      <input type="file" name="files" multiple required>

      <button type="submit">Upload</button>
    </form>
  </div>

  <div class="box">
    <a href="/logout">Logout</a>
  </div>

</div>

</body>
</html>
  `);
});

/* ================= UPLOAD FILES ================= */
app.post('/upload', upload.array('files', 20), async (req, res) => {
  if (!req.session.loggedIn) return res.status(401).send('Unauthorized');

  const category = req.body.category || 'notes';

  try {
    for (const file of req.files) {

      const ext = file.originalname.split('.').pop().toLowerCase();

      const baseName = cleanFileName(file.originalname);

      const result = await uploadToCloudinary(file.buffer, baseName, ext);

      // FIXED READ URL (WORKS FOR RAW FILES)
     const readUrl = result.secure_url;

const downloadUrl = result.secure_url.replace(
  '/upload/',
  '/upload/fl_attachment/'
);

fileDB.push({
  name: file.originalname,
  category,
  readUrl,
  downloadUrl
});

      console.log("==== UPLOADED FILE ====");
      console.log("Name:", file.originalname);
      console.log("URL:", readUrl);
      console.log("=======================");
    }

    res.redirect('/admin');

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.send("Upload failed");
  }
});

/* ================= FILES PAGE ================= */
app.get('/files', (req, res) => {

  const categories = ["notes", "cat", "exams"];

  let sections = "";

  for (const cat of categories) {

    const files = fileDB.filter(f => f.category === cat);

    const filesHtml = files.length > 0
      ? files.map(file => `
          <div class="file-card">
            <h3>${file.name}</h3>
            <p>${cat.toUpperCase()}</p>

            <!-- FIX: Google Viewer (WORKING) -->
            <a href="/view?url=${encodeURIComponent(file.readUrl)}">📖 Read</a>

            <a href="${file.downloadUrl}">⬇ Download</a>
          </div>
        `).join('')
      : `<p>No files in ${cat.toUpperCase()}</p>`;

    sections += `
      <h2 style="margin-top:40px;">${cat.toUpperCase()}</h2>
      <div class="row">${filesHtml}</div>
    `;
  }

  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>GEGIS LMS</title>

<style>
body{
  font-family:Arial;
  margin:0;
  background:linear-gradient(135deg,#eef2f5,#dbe9f4);
  text-align:center;
}

header{
  background:#007BFF;
  color:white;
  padding:20px;
}

.row{
  display:flex;
  flex-wrap:wrap;
  justify-content:center;
  gap:20px;
  padding:20px;
}

.file-card{
  background:white;
  width:220px;
  padding:15px;
  border-radius:12px;
  box-shadow:0 6px 18px rgba(0,0,0,0.1);
}

.file-card a{
  display:block;
  margin-top:8px;
  padding:8px;
  background:#007BFF;
  color:white;
  text-decoration:none;
  border-radius:20px;
}
</style>

</head>

<body>

<header>
<h1>Geomatic & Geospatial Knowledge Portal</h1>
</header>

${sections}

</body>
</html>
  `);
});

/* ================= VIEW FILE ================= */
app.get('/view', (req, res) => {
  const fileUrl = req.query.url;

  if (!fileUrl) return res.send("No file");

  const viewer = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;

  res.redirect(viewer);
});

/* ================= LOGOUT ================= */
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

app.get('/', (req, res) => {
  res.send(`
    <h1>GEGIS HUB</h1>
    <p>Welcome to Geomatics & Geospatial Hub</p>
    <a href="/files">Go to Files</a>
    <br>
    <a href="/admin-login">Admin Login</a>
  `);
});

/* ================= START ================= */
module.exports = app;