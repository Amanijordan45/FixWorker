// ── STATE ──────────────────────────────────────────────
let profile = {};
let posts   = JSON.parse(localStorage.getItem("fixwork_posts")) || [];
let selectedStar      = 0;
let pendingMediaFiles = [];

// ── INIT ───────────────────────────────────────────────
function init() {
    // Get the currently logged-in user
    const currentUser = JSON.parse(localStorage.getItem("fixwork_current_user")) || {};

    // Load this worker's profile from the shared workers list
    const workers = JSON.parse(localStorage.getItem("fixwork_workers")) || [];
    const myWorker = workers.find(function(w) { return w.email === currentUser.email; });

    if (myWorker) {
        profile = myWorker;
    } else {
        // Fallback: build a basic profile from the logged-in user
        profile = {
            name:     currentUser.name  || "Worker",
            email:    currentUser.email || "",
            role:     "",
            bio:      "",
            skills:   "",
            location: "",
            image:    "",
            rating:   []
        };
    }

    if (!profile.rating) profile.rating = [];
    profile.views = (profile.views || 0) + 1;

    // Save updated views back
    syncWorkerToList();

    document.getElementById("statViews").textContent = profile.views;

    renderProfile();
    renderPosts();
    renderRatings();
}

// ── SYNC PROFILE TO SHARED LIST ────────────────────────
// This is the key function — every save updates the shared
// fixwork_workers list so clients can find this worker.
function syncWorkerToList() {
    const workers = JSON.parse(localStorage.getItem("fixwork_workers")) || [];
    const idx = workers.findIndex(function(w) { return w.email === profile.email; });

    if (idx !== -1) {
        workers[idx] = profile;
    } else {
        workers.push(profile);
    }

    localStorage.setItem("fixwork_workers", JSON.stringify(workers));
}

// ── RENDER PROFILE ─────────────────────────────────────
function renderProfile() {
    document.getElementById("displayName").textContent    = profile.name     || "Your Name";
    document.getElementById("displayRole").textContent    = profile.role     || "Worker";
    document.getElementById("editName").value             = profile.name     || "";
    document.getElementById("editRole").value             = profile.role     || "";
    document.getElementById("editBio").value              = profile.bio      || "";
    document.getElementById("editSkills").value           = profile.skills   || "";
    document.getElementById("editLocation").value         = profile.location || "";
    document.getElementById("topbarGreeting").textContent = "Hello, " + (profile.name || "Worker");

    // Avatar
    const av = document.getElementById("avatarDisplay");
    if (profile.image) {
        av.innerHTML = '<img src="' + profile.image + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    } else {
        av.textContent = (profile.name || "W")
            .split(" ").map(function(w) { return w[0]; }).join("").toUpperCase().slice(0, 2);
    }

    // Location
    const locEl = document.getElementById("displayLocation");
    if (profile.location) {
        locEl.style.display = "block";
        document.getElementById("locationText").textContent = profile.location;
    } else {
        locEl.style.display = "none";
    }

    // Bio
    if (profile.bio) {
        document.getElementById("bioDisplay").style.display     = "block";
        document.getElementById("bioDisplay").textContent       = profile.bio;
        document.getElementById("bioPlaceholder").style.display = "none";
    } else {
        document.getElementById("bioDisplay").style.display     = "none";
        document.getElementById("bioPlaceholder").style.display = "block";
    }

    // Skills
    const sl = document.getElementById("skillsList");
    if (profile.skills) {
        const tags = profile.skills.split(",").map(function(s) { return s.trim(); }).filter(Boolean);
        sl.innerHTML = tags.map(function(t) { return '<span class="skill-tag">' + t + '</span>'; }).join("");
    } else {
        sl.innerHTML = '<span class="no-data">No skills added yet</span>';
    }
}

// ── AVATAR ─────────────────────────────────────────────
function handleImageChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        profile.image = e.target.result;
        syncWorkerToList();
        renderProfile();
    };
    reader.readAsDataURL(file);
}

// ── COVER ──────────────────────────────────────────────
function handleCoverChange(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const cover = document.getElementById("coverArea");
        cover.style.backgroundImage    = "url(" + e.target.result + ")";
        cover.style.backgroundSize     = "cover";
        cover.style.backgroundPosition = "center";
    };
    reader.readAsDataURL(file);
}

// ── EDIT MODAL ─────────────────────────────────────────
function openEditModal() {
    document.getElementById("editModal").classList.add("active");
}
function closeEditModal() {
    document.getElementById("editModal").classList.remove("active");
}

document.getElementById("editModal").addEventListener("click", function(e) {
    if (e.target === this) closeEditModal();
});

function saveProfile() {
    profile.name     = document.getElementById("editName").value.trim()     || profile.name;
    profile.role     = document.getElementById("editRole").value.trim();
    profile.bio      = document.getElementById("editBio").value.trim();
    profile.skills   = document.getElementById("editSkills").value.trim();
    profile.location = document.getElementById("editLocation").value.trim();

    // Save to the shared workers list — this is what clients see
    syncWorkerToList();

    renderProfile();
    closeEditModal();
}

// ── POSTS ──────────────────────────────────────────────
function previewPostMedia(event) {
    pendingMediaFiles = Array.from(event.target.files);
    document.getElementById("mediaPreviewCount").textContent =
        pendingMediaFiles.length ? pendingMediaFiles.length + " file(s) selected" : "";
}

function submitPost() {
    const txt = document.getElementById("postText").value.trim();
    if (!txt && pendingMediaFiles.length === 0) {
        alert("Write something or add a photo/video first.");
        return;
    }

    const post = {
        id:          Date.now(),
        author:      profile.name  || "Worker",
        authorImage: profile.image || "",
        text:        txt,
        media:       [],
        time:        new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    };

    if (pendingMediaFiles.length === 0) {
        finalizePost(post);
        return;
    }

    let done = 0;
    pendingMediaFiles.forEach(function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            post.media.push({
                src:  e.target.result,
                type: file.type.startsWith("video") ? "video" : "image"
            });
            done++;
            if (done === pendingMediaFiles.length) finalizePost(post);
        };
        reader.readAsDataURL(file);
    });
}

function finalizePost(post) {
    posts.unshift(post);
    localStorage.setItem("fixwork_posts", JSON.stringify(posts));
    document.getElementById("postText").value                = "";
    document.getElementById("postMediaInput").value          = "";
    document.getElementById("mediaPreviewCount").textContent = "";
    pendingMediaFiles = [];
    renderPosts();
}

function renderPosts() {
    document.getElementById("statPosts").textContent = posts.length;

    if (!posts.length) {
        document.getElementById("postsFeed").innerHTML =
            '<div class="empty-state">&#128444;<br>No posts yet. Share your work!</div>';
        return;
    }

    document.getElementById("postsFeed").innerHTML = posts.map(function(post) {
        const av = post.authorImage
            ? '<img src="' + post.authorImage + '" alt="">'
            : (post.author || "W").split(" ").map(function(w) { return w[0]; }).join("").toUpperCase().slice(0, 2);

        const media = post.media && post.media.length
            ? '<div class="post-media">' +
              post.media.slice(0, 3).map(function(m) {
                  return m.type === "video"
                      ? '<video src="' + m.src + '" controls></video>'
                      : '<img src="' + m.src + '" alt="post image">';
              }).join("") + '</div>'
            : "";

        return '<div class="post-item">' +
            '<div class="post-header">' +
                '<div class="post-avatar">' + av + '</div>' +
                '<div class="post-meta">' +
                    '<strong>' + (post.author || "Worker") + '</strong>' +
                    '<span>' + post.time + '</span>' +
                '</div>' +
            '</div>' +
            (post.text ? '<p class="post-text">' + post.text + '</p>' : '') +
            media +
            '<div class="post-footer">' +
                '<button class="post-action-btn">&#128077; Like</button>' +
                '<button class="post-action-btn">&#128172; Comment</button>' +
            '</div>' +
        '</div>';
    }).join("");
}

// ── RATINGS ────────────────────────────────────────────
function selectStar(val) {
    selectedStar = val;
    document.querySelectorAll(".star-btn").forEach(function(btn) {
        btn.classList.toggle("active", parseInt(btn.dataset.val) <= val);
    });
}

function submitRating() {
    if (selectedStar === 0) { alert("Please select a star rating."); return; }
    const name = document.getElementById("reviewerName").value.trim();
    const text = document.getElementById("reviewText").value.trim();
    if (!name) { alert("Please enter your name."); return; }
    if (!text) { alert("Please write a review.");  return; }

    profile.rating = profile.rating || [];
    profile.rating.unshift({
        name:  name,
        stars: selectedStar,
        text:  text,
        date:  new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    });

    // Sync ratings to the shared list too
    syncWorkerToList();

    selectedStar = 0;
    document.querySelectorAll(".star-btn").forEach(function(b) { b.classList.remove("active"); });
    document.getElementById("reviewerName").value = "";
    document.getElementById("reviewText").value   = "";

    renderRatings();
}

function renderRatings() {
    const ratings = profile.rating || [];
    document.getElementById("statReviews").textContent = ratings.length;

    if (!ratings.length) {
        document.getElementById("ratingSummary").style.display = "none";
        document.getElementById("reviewsList").innerHTML =
            '<div class="empty-state">&#11088;<br>No reviews yet.</div>';
        document.getElementById("statRating").textContent = "—";
        return;
    }

    const avg = ratings.reduce(function(s, r) { return s + r.stars; }, 0) / ratings.length;
    document.getElementById("statRating").textContent       = avg.toFixed(1) + " ★";
    document.getElementById("ratingSummary").style.display  = "block";
    document.getElementById("avgRatingBig").textContent     = avg.toFixed(1);
    document.getElementById("reviewCountText").textContent  =
        ratings.length + " review" + (ratings.length !== 1 ? "s" : "");

    const fullStars = Math.round(avg);
    document.getElementById("avgStarsDisplay").innerHTML =
        [1, 2, 3, 4, 5].map(function(i) {
            return '<span style="color:' + (i <= fullStars ? "#f59e0b" : "#ddd") + '">&#9733;</span>';
        }).join("");

    document.getElementById("ratingBars").innerHTML =
        [5, 4, 3, 2, 1].map(function(star) {
            const count = ratings.filter(function(r) { return r.stars === star; }).length;
            const pct   = Math.round((count / ratings.length) * 100);
            return '<div class="rating-bar-row">' +
                '<span style="width:14px;">' + star + '</span>' +
                '<span style="font-size:11px;color:#f59e0b;">&#9733;</span>' +
                '<div class="bar-bg"><div class="bar-fill" style="width:' + pct + '%;"></div></div>' +
                '<span style="width:28px;text-align:right;">' + count + '</span>' +
            '</div>';
        }).join("");

    document.getElementById("reviewsList").innerHTML =
        ratings.map(function(r) {
            const stars = [1, 2, 3, 4, 5].map(function(i) {
                return '<span style="color:' + (i <= r.stars ? "#f59e0b" : "#ddd") + '">&#9733;</span>';
            }).join("");
            return '<div class="review-item">' +
                '<div class="review-header">' +
                    '<span class="reviewer-name">' + r.name + '</span>' +
                    '<span class="review-date">'   + r.date + '</span>' +
                '</div>' +
                '<div class="review-stars">' + stars + '</div>' +
                '<p class="review-text">'    + r.text + '</p>' +
            '</div>';
        }).join("");
}

// ── LOGOUT ─────────────────────────────────────────────
function logout() {
    localStorage.removeItem("fixwork_logged_in");
    localStorage.removeItem("fixwork_current_user");
    window.location.href = "login.html";
}

// ── START ──────────────────────────────────────────────
init();
