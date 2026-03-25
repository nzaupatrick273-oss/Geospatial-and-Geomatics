document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("filesModal");
    const btn = document.getElementById("view-files-btn");
    const closeBtn = document.querySelector(".close-btn");
    const fileList = document.getElementById("file-list");

    // Open modal
    btn.addEventListener("click", async () => {
        // Fetch file list from server
        const res = await fetch("/api/files");
        const files = await res.json();

        fileList.innerHTML = files.length
            ? files.map(f => `<li><a href="uploads/${f}" download>${f}</a></li>`).join("")
            : "<li>No files uploaded yet.</li>";

        modal.style.display = "block";
    });

    // Close modal
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Close when clicking outside modal
    window.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });
});