// FETCH FILES FROM SERVER
async function loadFiles() {
  const res = await fetch('/api/files');
  const data = await res.json();

  displayFiles(data);
}

// DISPLAY FILES
function displayFiles(files) {

  const categories = {
    notes: document.getElementById("notes"),
    cat: document.getElementById("cat"),
    exams: document.getElementById("exams")
  };

  // CLEAR
  Object.values(categories).forEach(el => el.innerHTML = "");

  files.forEach(file => {

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h4>${file.name}</h4>
      <button class="read-btn">📖 Read</button>
      <button class="download-btn">⬇ Download</button>
    `;

    // READ BUTTON → opens inside your site
    card.querySelector(".read-btn").onclick = () => {
      window.location.href = `/view?url=${encodeURIComponent(file.readUrl)}`;
    };

    // DOWNLOAD BUTTON
    card.querySelector(".download-btn").onclick = () => {
      window.open(file.downloadUrl, "_blank");
    };

    categories[file.category].appendChild(card);
  });
}

// LOAD ON PAGE OPEN
loadFiles();