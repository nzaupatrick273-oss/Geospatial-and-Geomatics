// server.js
const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// 1️⃣ Serve static files (CSS, JS, uploads)
app.use(express.static("public"));

// 2️⃣ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: "geomatic-secret",
    resave: false,
    saveUninitialized: true
}));

// 3️⃣ Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = "public/uploads";
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname);
    }
});
const upload = multer({ storage: storage });

// 4️⃣ Admin credentials
const ADMIN_USERNAME = "KIMANGI";
const ADMIN_PASSWORD = "Patrick";

// 5️⃣ Home page (public)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

// 6️⃣ API endpoint to get uploaded files (for modal)
app.get("/api/files", (req, res) => {
    const filesDir = path.join(__dirname, "public/uploads");
    if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true });

    const files = fs.readdirSync(filesDir)
        .sort((a, b) => fs.statSync(path.join(filesDir, b)).mtimeMs - fs.statSync(path.join(filesDir, a)).mtimeMs);

    res.json(files);
});

// 7️⃣ Admin login page
app.get("/admin-login", (req, res) => {
    res.send(`
    <h1>Admin Login</h1>
    <form action="/admin-login" method="POST">
        <input type="text" name="username" placeholder="Username" required><br><br>
        <input type="password" name="password" placeholder="Password" required><br><br>
        <button type="submit">Login</button>
    </form>
    <a href="/">Back to Home</a>
    `);
});

// 8️⃣ Admin login POST
app.post("/admin-login", (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect("/admin");
    } else {
        res.send("Invalid credentials. <a href='/admin-login'>Try again</a>");
    }
});

// 9️⃣ Admin panel (upload)
app.get("/admin", (req, res) => {
    if (!req.session.loggedIn) return res.redirect("/admin-login");

    res.send(`
    <h1>Admin Panel</h1>
    <form action="/upload" method="POST" enctype="multipart/form-data">
        <input type="file" name="file" required>
        <button type="submit">Upload File</button>
    </form>
    <br>
    <a href="/logout">Logout</a>
    `);
});

// 10️⃣ Admin logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// 11️⃣ Upload route
app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.session.loggedIn) return res.send("Unauthorized. <a href='/admin-login'>Login</a>");
    res.redirect("/admin");
});

// 12️⃣ Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});