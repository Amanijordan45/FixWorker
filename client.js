// ── DATA ───────────────────────────────────────────────
let allWorkers = [];
let sortMode   = 'default';
let activeWorkerIndex = null;

// ── INIT ───────────────────────────────────────────────
function init() {
  const user = JSON.parse(localStorage.getItem('fixwork_user')) || {};
  if (user.name) {
    document.getElementById('topbarGreeting').textContent = 'Hello, ' + user.name;
  }
  loadWorkers();
}

function loadWorkers() {
  // Load real registered workers from the shared list
  const realWorkers = JSON.parse(localStorage.getItem('fixwork_workers')) || [];
  allWorkers = realWorkers.filter(function(w) { return w.name; });

  // Only show demo workers if no real workers have signed up yet
  if (allWorkers.length > 0) {
    applyFilters();
    return;
  }

  const demoWorkers = [
    {
      name: 'David Ochieng',
      role: 'Plumber',
      bio: 'Certified plumber with 8+ years fixing pipes, taps, and drainage systems across Kampala. Fast, reliable, and affordable.',
      skills: 'Pipe fitting, Drainage, Water systems, Borehole',
      location: 'Ntinda, Kampala',
      rating: [
        { name: 'Sarah K.', stars: 5, text: 'Fixed our burst pipe in 30 minutes. Very professional!', date: '12 Apr 2025' },
        { name: 'Moses T.', stars: 4, text: 'Good work, arrived on time.', date: '2 Mar 2025' },
      ],
      image: '',
      _demo: true
    },
    {
      name: 'Grace Namukasa',
      role: 'Electrician',
      bio: 'Licensed electrician specializing in residential wiring, solar installation, and electrical fault diagnosis.',
      skills: 'Wiring, Solar panels, Fault diagnosis, Switches',
      location: 'Kyanja, Kampala',
      rating: [
        { name: 'John M.', stars: 5, text: 'Installed solar perfectly. Very knowledgeable!', date: '8 Apr 2025' },
        { name: 'Aisha N.', stars: 5, text: 'Best electrician I have used. Highly recommended.', date: '1 Apr 2025' },
        { name: 'Peter W.', stars: 4, text: 'Did a great job on our wiring.', date: '15 Mar 2025' },
      ],
      image: '',
      _demo: true
    },
    {
      name: 'Robert Ssemakula',
      role: 'Carpenter',
      bio: 'Skilled carpenter crafting custom furniture, doors, window frames, and roofing. Quality materials, precise workmanship.',
      skills: 'Furniture, Doors, Roofing, Cabinets',
      location: 'Wakiso',
      rating: [
        { name: 'Linda A.', stars: 5, text: 'Built our kitchen cabinets — beautiful work!', date: '5 Apr 2025' },
      ],
      image: '',
      _demo: true
    },
    {
      name: 'Fatuma Nalwoga',
      role: 'House Cleaner',
      bio: 'Professional house cleaner offering deep cleaning, after-party cleanup, office cleaning, and regular maintenance packages.',
      skills: 'Deep cleaning, Office cleaning, Laundry, After-party cleanup',
      location: 'Bukoto, Kampala',
      rating: [
        { name: 'Rita O.', stars: 5, text: 'My house has never been this clean. Amazing!', date: '10 Apr 2025' },
        { name: 'Tom B.', stars: 4, text: 'Very thorough and efficient.', date: '28 Mar 2025' },
      ],
      image: '',
      _demo: true
    },
    {
      name: 'Isaac Muwanguzi',
      role: 'Mechanic',
      bio: 'Auto mechanic with 10 years experience servicing all car brands. Engine repair, brake systems, and general maintenance.',
      skills: 'Engine repair, Brakes, Oil change, Diagnostics',
      location: 'Ndeeba, Kampala',
      rating: [
        { name: 'Dennis R.', stars: 5, text: 'Diagnosed my car issue instantly. Saved me a lot of money.', date: '9 Apr 2025' },
        { name: 'Claire S.', stars: 3, text: 'Good work but took a bit long.', date: '20 Mar 2025' },
      ],
      image: '',
      _demo: true
    },
    {
      name: 'Sylvia Apio',
      role: 'Painter',
      bio: 'Interior and exterior painting professional. Wall murals, texture finishes, and colour consulting for homes and offices.',
      skills: 'Interior painting, Exterior, Murals, Texture finishes',
      location: 'Gulu',
      rating: [],
      image: '',
      _demo: true
    }
  ];

  demoWorkers.forEach(function(d) {
    if (!allWorkers.find(function(w) { return w.name === d.name; })) {
      allWorkers.push(d);
    }
  });

  applyFilters();
}

// ── FILTERS / SORT ─────────────────────────────────────
function setSort(mode, el) {
  sortMode = mode;
  document.querySelectorAll('.filter-chip').forEach(function(c) {
    c.classList.remove('active');
  });
  el.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const q   = document.getElementById('searchInput').value.toLowerCase().trim();
  const cat = document.getElementById('categoryFilter').value.toLowerCase();

  let list = allWorkers.filter(function(w) {
    const haystack = (w.name + ' ' + w.role + ' ' + w.skills + ' ' + w.location).toLowerCase();
    const matchQ   = !q   || haystack.includes(q);
    const matchCat = !cat || w.role.toLowerCase().includes(cat);
    return matchQ && matchCat;
  });

  if (sortMode === 'rating') {
    list.sort(function(a, b) { return avgRating(b) - avgRating(a); });
  } else if (sortMode === 'reviews') {
    list.sort(function(a, b) { return (b.rating || []).length - (a.rating || []).length; });
  }

  renderWorkers(list);
}

function avgRating(w) {
  const r = w.rating || [];
  return r.length ? r.reduce(function(s, x) { return s + x.stars; }, 0) / r.length : 0;
}

// ── RENDER GRID ────────────────────────────────────────
function renderWorkers(list) {
  const grid = document.getElementById('workersGrid');
  document.getElementById('resultsCount').textContent =
    list.length + ' worker' + (list.length !== 1 ? 's' : '') + ' found';

  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No workers found.<br>Try a different search or category.</p></div>';
    return;
  }

  grid.innerHTML = list.map(function(w, i) {
    const idx      = allWorkers.indexOf(w);
    const avg      = avgRating(w);
    const reviews  = (w.rating || []).length;
    const starsHtml = avg > 0 ? starsStr(avg) : '';
    const delay    = (i * 0.06).toFixed(2);

    const avatarHtml = w.image
      ? '<img src="' + w.image + '" alt="">'
      : initials(w.name);

    const skillTags = (w.skills || '')
      .split(',').map(function(s) { return s.trim(); })
      .filter(Boolean).slice(0, 3)
      .map(function(s) { return '<span class="card-skill">' + s + '</span>'; })
      .join('');

    return (
      '<div class="worker-card" style="animation-delay:' + delay + 's" onclick="openWorkerModal(' + idx + ')">' +
        '<div class="card-cover"></div>' +
        '<div class="card-body">' +
          '<div class="card-avatar">' + avatarHtml + '</div>' +
          '<div class="card-name">' + w.name + '</div>' +
          '<div class="card-role">' + (w.role || 'Worker') + '</div>' +
          (w.location ? '<div class="card-location">📍 ' + w.location + '</div>' : '') +
          '<div class="card-bio">' + (w.bio || 'No bio available.') + '</div>' +
          '<div class="card-skills">' + skillTags + '</div>' +
          '<div class="card-footer">' +
            '<div class="card-rating">' +
              (avg > 0
                ? '<span class="card-stars">' + starsHtml + '</span> ' + avg.toFixed(1) + ' <span class="card-reviews">(' + reviews + ')</span>'
                : '<span style="color:var(--muted);font-size:12px;font-weight:400;">No reviews yet</span>') +
            '</div>' +
            '<button class="contact-btn" onclick="event.stopPropagation(); openContactModal(' + idx + ')">Contact</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// ── WORKER MODAL ───────────────────────────────────────
function openWorkerModal(idx) {
  const w = allWorkers[idx];
  activeWorkerIndex = idx;

  document.getElementById('modalCover').innerHTML = '';
  document.getElementById('modalAvatar').innerHTML = w.image
    ? '<img src="' + w.image + '" alt="">'
    : initials(w.name);
  document.getElementById('modalName').textContent     = w.name;
  document.getElementById('modalRole').textContent     = w.role || 'Worker';
  document.getElementById('modalLocation').textContent = w.location ? '📍 ' + w.location : '';
  document.getElementById('modalBio').textContent      = w.bio || 'No bio provided.';

  const skills = (w.skills || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  document.getElementById('modalSkills').innerHTML = skills.length
    ? skills.map(function(s) { return '<span class="modal-skill">' + s + '</span>'; }).join('')
    : '<span style="color:var(--muted);font-size:13px;">No skills listed.</span>';

  renderModalRatings(w);

  document.getElementById('modalContactBtn').onclick = function() {
    closeWorkerModal();
    openContactModal(idx);
  };
  document.getElementById('workerModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeWorkerModal() {
  document.getElementById('workerModal').classList.remove('active');
  document.body.style.overflow = '';
}

function renderModalRatings(w) {
  const ratings = w.rating || [];
  const el = document.getElementById('modalRatings');

  if (!ratings.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--muted);padding:8px 0;">No reviews yet.</p>';
    return;
  }

  const avg = avgRating(w);
  const reviewsHtml = ratings.map(function(r) {
    return (
      '<div class="review-item">' +
        '<div class="review-header">' +
          '<span class="reviewer-name">' + r.name + '</span>' +
          '<span class="review-date">'   + r.date + '</span>' +
        '</div>' +
        '<div class="review-stars">' + starsStr(r.stars) + '</div>' +
        '<p class="review-text">'    + r.text + '</p>' +
      '</div>'
    );
  }).join('');

  el.innerHTML =
    '<div class="modal-rating-summary">' +
      '<div>' +
        '<div class="modal-avg">' + avg.toFixed(1) + '</div>' +
        '<div class="modal-stars-row">' + starsStr(avg) + '</div>' +
        '<div class="modal-review-count">' + ratings.length + ' review' + (ratings.length !== 1 ? 's' : '') + '</div>' +
      '</div>' +
    '</div>' +
    reviewsHtml;
}

// ── CONTACT MODAL ──────────────────────────────────────
function openContactModal(idx) {
  const w = allWorkers[idx];
  document.getElementById('contactWorkerName').textContent = 'Sending job request to ' + w.name;
  document.getElementById('contactModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeContactModal() {
  document.getElementById('contactModal').classList.remove('active');
  document.body.style.overflow = '';
}

function sendContact() {
  const name    = document.getElementById('contactName').value.trim();
  const phone   = document.getElementById('contactPhone').value.trim();
  const jobType = document.getElementById('contactJobType').value;
  const message = document.getElementById('contactMessage').value.trim();

  if (!name)    { alert('Please enter your name.');         return; }
  if (!phone)   { alert('Please enter your phone number.'); return; }
  if (!jobType) { alert('Please select a job type.');       return; }
  if (!message) { alert('Please describe the job.');        return; }

  closeContactModal();
  showToast('✅ Request sent! The worker will contact you soon.');

  document.getElementById('contactName').value    = '';
  document.getElementById('contactPhone').value   = '';
  document.getElementById('contactJobType').value = '';
  document.getElementById('contactMessage').value = '';
}

// ── HELPERS ────────────────────────────────────────────
function initials(name) {
  return (name || 'W').split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
}

function starsStr(rating) {
  return [1, 2, 3, 4, 5].map(function(i) {
    return '<span style="color:' + (i <= Math.round(rating) ? '#f59e0b' : '#ddd') + '">★</span>';
  }).join('');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3500);
}

function logout() {
  localStorage.removeItem('fixwork_logged_in');
  window.location.href = 'login.html';
}

// Close modals when clicking outside
document.getElementById('workerModal').addEventListener('click', function(e) {
  if (e.target === this) closeWorkerModal();
});
document.getElementById('contactModal').addEventListener('click', function(e) {
  if (e.target === this) closeContactModal();
});

// ── START ──────────────────────────────────────────────
init();


// ── NOTIFICATION SYSTEM ─────────────────────────

// Get notifications
function getNotifications() {
  return JSON.parse(localStorage.getItem("fixwork_notifications")) || [];
}

// Save notifications
function saveNotifications(data) {
  localStorage.setItem("fixwork_notifications", JSON.stringify(data));
}

// Add new notification
function addNotification(message) {
  const list = getNotifications();

  list.unshift({
    message: message,
    time: new Date().toLocaleString(),
    read: false
  });

  saveNotifications(list);
  renderNotifications();
}

// Render notifications in dropdown
function renderNotifications() {
  const dropdown = document.getElementById("notifDropdown");
  const count = document.getElementById("notifCount");

  if (!dropdown || !count) return;

  const list = getNotifications();
  dropdown.innerHTML = "";

  // If no notifications
  if (list.length === 0) {
    dropdown.innerHTML = `<div class="notif-empty">No notifications</div>`;
  }

  let unread = 0;

  list.forEach((n, i) => {
    if (!n.read) unread++;

    const item = document.createElement("div");
    item.className = "notif-item" + (n.read ? "" : " unread");

    item.innerHTML = `
      <p>${n.message}</p>
      <small>${n.time}</small>
    `;

    // Mark as read
    item.onclick = () => {
      list[i].read = true;
      saveNotifications(list);
      renderNotifications();
    };

    dropdown.appendChild(item);
  });

  // Update count
  count.textContent = unread;
}

// Toggle dropdown
function initNotificationBell() {
  const bell = document.getElementById("notifBell");

  if (bell) {
    bell.onclick = () => {
      document.getElementById("notifDropdown").classList.toggle("show");
    };
  }

  renderNotifications();
}