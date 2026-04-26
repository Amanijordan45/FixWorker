// ── SECURITY GATE ──────────────────────────────────────
(function() {
  if (localStorage.getItem('fixwork_admin_session') !== 'true') {
    window.location.href = 'admin-login.html';
  }
})();

// ── STATE ──────────────────────────────────────────────
let allUsers   = [];
let allWorkers = [];
let allPosts   = [];
let blockedEmails = [];
let activityLog = [];
let currentModalUser = null;
let pendingConfirmFn  = null;

// ── INIT ───────────────────────────────────────────────
function init() {
  loadData();
  updateStats();
  renderOverviewTable();
  renderClientsTable();
  renderWorkersTable();
  renderBlockedTable();
  renderPostsTable();
  renderActivity();
  updateTopLists();
}

function loadData() {
  allUsers      = JSON.parse(localStorage.getItem('fixwork_users'))    || [];
  allWorkers    = JSON.parse(localStorage.getItem('fixwork_workers'))  || [];
  allPosts      = JSON.parse(localStorage.getItem('fixwork_posts'))    || [];
  blockedEmails = JSON.parse(localStorage.getItem('fixwork_blocked'))  || [];
  activityLog   = JSON.parse(localStorage.getItem('fixwork_activity')) || [];
}

function saveData() {
  localStorage.setItem('fixwork_blocked',  JSON.stringify(blockedEmails));
  localStorage.setItem('fixwork_activity', JSON.stringify(activityLog));
}

// ── STATS ──────────────────────────────────────────────
function updateStats() {
  const clients = allUsers.filter(function(u) { return u.role === 'client'; });
  const workers = allUsers.filter(function(u) { return u.role === 'worker'; });
  const blocked = blockedEmails.length;

  document.getElementById('stat-total').textContent   = allUsers.length;
  document.getElementById('stat-clients').textContent = clients.length;
  document.getElementById('stat-workers').textContent = workers.length;
  document.getElementById('stat-blocked').textContent = blocked;
  document.getElementById('topTotalUsers').textContent = allUsers.length;
  document.getElementById('clientBadge').textContent  = clients.length;
  document.getElementById('workerBadge').textContent  = workers.length;
  document.getElementById('blockedBadge').textContent = blocked;
}

function updateTopLists() {
  // Top rated workers
  const rated = allWorkers.filter(function(w) { return w.rating && w.rating.length > 0; });
  rated.sort(function(a, b) { return avgRating(b) - avgRating(a); });
  const topEl = document.getElementById('topWorkersList');
  if (rated.length === 0) {
    topEl.innerHTML = '<p style="color:var(--muted);font-size:13px;">No rated workers yet.</p>';
  } else {
    topEl.innerHTML = rated.slice(0, 5).map(function(w) {
      const avg = avgRating(w).toFixed(1);
      return '<div class="mini-item">' +
        '<div class="mini-item-left">' +
          '<div class="mini-avatar">' + initials(w.name) + '</div>' +
          '<span class="mini-name">' + w.name + '</span>' +
        '</div>' +
        '<span class="mini-val">⭐ ' + avg + '</span>' +
      '</div>';
    }).join('');
  }

  // Recent sign-ups (last 5 users)
  const recent = allUsers.slice(-5).reverse();
  const recEl = document.getElementById('recentSignupsList');
  if (recent.length === 0) {
    recEl.innerHTML = '<p style="color:var(--muted);font-size:13px;">No sign-ups yet.</p>';
  } else {
    recEl.innerHTML = recent.map(function(u) {
      return '<div class="mini-item">' +
        '<div class="mini-item-left">' +
          '<div class="mini-avatar" style="background:' + (u.role === 'worker' ? 'var(--blue)' : '#059669') + ';">' +
            initials(u.name) +
          '</div>' +
          '<span class="mini-name">' + u.name + '</span>' +
        '</div>' +
        '<span style="font-size:11px;color:var(--muted);">' + (u.role || 'user') + '</span>' +
      '</div>';
    }).join('');
  }
}

// ── OVERVIEW TABLE ─────────────────────────────────────
function renderOverviewTable() {
  const tbody = document.getElementById('overviewTable');
  if (!allUsers.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No users registered yet.</td></tr>';
    return;
  }
  tbody.innerHTML = allUsers.map(function(u) {
    return userRow(u, 'overview');
  }).join('');
}

// ── CLIENTS TABLE ──────────────────────────────────────
function renderClientsTable(filter) {
  var list = allUsers.filter(function(u) { return u.role === 'client'; });
  if (filter) {
    var q = filter.toLowerCase();
    list = list.filter(function(u) {
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }
  const tbody = document.getElementById('clientsTable');
  if (!list.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No clients found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(u) { return userRow(u, 'clients'); }).join('');
}

// ── WORKERS TABLE ──────────────────────────────────────
function renderWorkersTable(filter) {
  // Merge allUsers (for email/blocked check) with allWorkers (for profile data)
  var list = allUsers.filter(function(u) { return u.role === 'worker'; }).map(function(u) {
    var wp = allWorkers.find(function(w) { return w.email === u.email; }) || {};
    return Object.assign({}, u, wp);
  });
  if (filter) {
    var q = filter.toLowerCase();
    list = list.filter(function(u) {
      return ((u.name||'') + (u.role||'') + (u.location||'')).toLowerCase().includes(q);
    });
  }
  const tbody = document.getElementById('workersTable');
  if (!list.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No workers found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(function(u) {
    const blocked = blockedEmails.includes(u.email);
    const avg     = avgRating(u);
    const stars   = avg > 0
      ? '<span style="color:#f59e0b;">★</span> ' + avg.toFixed(1) + ' <span style="color:var(--muted);font-size:11px;">(' + (u.rating||[]).length + ')</span>'
      : '<span style="color:var(--muted);font-size:12px;">No reviews</span>';
    return '<tr>' +
      '<td>' + userCell(u) + '</td>' +
      '<td>' +
        '<div style="font-size:13px;color:var(--text);font-weight:500;">' + (u.role || '—') + '</div>' +
        (u.location ? '<div style="font-size:11px;color:var(--muted);">📍 ' + u.location + '</div>' : '') +
      '</td>' +
      '<td>' + stars + '</td>' +
      '<td>' + statusBadge(blocked) + '</td>' +
      '<td>' + actionBtns(u, blocked) + '</td>' +
    '</tr>';
  }).join('');
}

// ── BLOCKED TABLE ──────────────────────────────────────
function renderBlockedTable() {
  const blocked = allUsers.filter(function(u) { return blockedEmails.includes(u.email); });
  const tbody = document.getElementById('blockedTable');
  if (!blocked.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No blocked users.</td></tr>';
    return;
  }
  tbody.innerHTML = blocked.map(function(u) {
    return '<tr>' +
      '<td>' + userCell(u) + '</td>' +
      '<td><span class="role-badge ' + (u.role||'client') + '">' + (u.role||'client') + '</span></td>' +
      '<td><span style="font-size:12px;color:var(--muted);">Blocked by Founder</span></td>' +
      '<td>' +
        '<div class="action-btns">' +
          '<button class="btn-unblock" onclick="unblockUser(\'' + u.email + '\')">✅ Unblock</button>' +
          '<button class="btn-delete"  onclick="deleteUser(\'' + u.email + '\')">🗑</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// ── POSTS TABLE ────────────────────────────────────────
function renderPostsTable() {
  const tbody = document.getElementById('postsTable');
  if (!allPosts.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No posts yet.</td></tr>';
    return;
  }
  tbody.innerHTML = allPosts.map(function(p, i) {
    const mediaCount = (p.media || []).length;
    const hasVideo   = (p.media || []).some(function(m) { return m.type === 'video'; });
    return '<tr>' +
      '<td>' +
        '<div class="user-cell">' +
          '<div class="user-avi">' + initials(p.author || 'W') + '</div>' +
          '<div><div class="user-name">' + (p.author||'Unknown') + '</div></div>' +
        '</div>' +
      '</td>' +
      '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:13px;">' +
        (p.text || '<em>No caption</em>') +
      '</td>' +
      '<td style="font-size:12px;color:var(--muted);">' +
        (mediaCount > 0 ? (hasVideo ? '🎬 ' : '🖼 ') + mediaCount + ' file(s)' : '—') +
      '</td>' +
      '<td style="font-size:12px;color:var(--muted);white-space:nowrap;">' + (p.time || '—') + '</td>' +
      '<td>' +
        '<button class="btn-delete" onclick="deletePost(' + i + ')">🗑 Remove</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// ── ACTIVITY ───────────────────────────────────────────
function renderActivity() {
  const el = document.getElementById('activityList');
  if (!activityLog.length) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--muted);font-size:14px;">No activity recorded yet.</div>';
    return;
  }
  el.innerHTML = activityLog.slice().reverse().map(function(a) {
    const iconMap = { join:'🟢', block:'🔴', unblock:'✅', login:'🔵', delete:'🗑', post_remove:'🗑' };
    const typeMap = { join:'join', block:'block', unblock:'join', login:'login', delete:'block', post_remove:'block' };
    return '<div class="activity-item">' +
      '<div class="activity-dot-icon ' + (typeMap[a.type]||'login') + '">' + (iconMap[a.type]||'•') + '</div>' +
      '<div class="activity-text">' + a.message + '</div>' +
      '<div class="activity-time">' + a.time + '</div>' +
    '</div>';
  }).join('');
}

function logActivity(type, message) {
  const now = new Date();
  activityLog.push({
    type: type,
    message: message,
    time: now.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) +
          ' ' + now.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  });
  if (activityLog.length > 100) activityLog = activityLog.slice(-100);
  saveData();
  renderActivity();
}

function clearLog() {
  showConfirm('🗑 Clear Log?', 'This will permanently delete all activity records.', function() {
    activityLog = [];
    saveData();
    renderActivity();
    showToast('Activity log cleared.');
  });
}

// ── BLOCK / UNBLOCK ────────────────────────────────────
function blockUser(email) {
  const user = allUsers.find(function(u) { return u.email === email; });
  showConfirm(
    '🚫 Block User?',
    'Block <strong style="color:white;">' + (user ? user.name : email) + '</strong>? They will be prevented from accessing the platform.',
    function() {
      if (!blockedEmails.includes(email)) {
        blockedEmails.push(email);
        saveData();
        logActivity('block', '<strong>' + (user ? user.name : email) + '</strong> was blocked by the Founder.');
        refreshAll();
        showToast('🚫 ' + (user ? user.name : email) + ' has been blocked.');
      }
    }
  );
}

function unblockUser(email) {
  const user = allUsers.find(function(u) { return u.email === email; });
  blockedEmails = blockedEmails.filter(function(e) { return e !== email; });
  saveData();
  logActivity('unblock', '<strong>' + (user ? user.name : email) + '</strong> was unblocked by the Founder.');
  refreshAll();
  showToast('✅ ' + (user ? user.name : email) + ' has been unblocked.');
}

function deleteUser(email) {
  const user = allUsers.find(function(u) { return u.email === email; });
  showConfirm(
    '⚠️ Delete Account?',
    'Permanently delete <strong style="color:white;">' + (user ? user.name : email) + '</strong>? This cannot be undone.',
    function() {
      allUsers   = allUsers.filter(function(u) { return u.email !== email; });
      allWorkers = allWorkers.filter(function(w) { return w.email !== email; });
      blockedEmails = blockedEmails.filter(function(e) { return e !== email; });
      localStorage.setItem('fixwork_users',   JSON.stringify(allUsers));
      localStorage.setItem('fixwork_workers', JSON.stringify(allWorkers));
      saveData();
      logActivity('delete', '<strong>' + (user ? user.name : email) + '</strong> account was deleted by the Founder.');
      refreshAll();
      showToast('🗑 Account deleted.');
    }
  );
}

function deletePost(idx) {
  showConfirm('🗑 Remove Post?', 'This post will be permanently removed from the platform.', function() {
    logActivity('post_remove', 'Post by <strong>' + (allPosts[idx] ? allPosts[idx].author : 'unknown') + '</strong> was removed by the Founder.');
    allPosts.splice(idx, 1);
    localStorage.setItem('fixwork_posts', JSON.stringify(allPosts));
    renderPostsTable();
    showToast('Post removed.');
  });
}

// ── BLOCK CHECK (used by script.js login) ─────────────
// This function is called by the login flow to check if a user is blocked
window.isUserBlocked = function(email) {
  const blocked = JSON.parse(localStorage.getItem('fixwork_blocked')) || [];
  return blocked.includes(email);
};

// ── USER MODAL ─────────────────────────────────────────
function openUserModal(email) {
  const baseUser = allUsers.find(function(u) { return u.email === email; }) || {};
  const wpData   = allWorkers.find(function(w) { return w.email === email; }) || {};
  const u = Object.assign({}, baseUser, wpData);
  currentModalUser = u;

  const blocked = blockedEmails.includes(email);
  const avg = avgRating(u);

  document.getElementById('modalAvi').innerHTML = u.image
    ? '<img src="' + u.image + '" alt="">'
    : initials(u.name || 'U');
  document.getElementById('modalName').textContent = u.name || 'Unknown';
  document.getElementById('modalRoleLoc').textContent =
    (u.role || 'user') + (u.location ? ' · 📍 ' + u.location : '');

  var details = '';
  details += detailRow('Email',    u.email    || '—');
  details += detailRow('Role',     '<span class="role-badge ' + (u.role||'client') + '">' + (u.role||'client') + '</span>');
  details += detailRow('Status',   statusBadge(blocked));
  if (u.role === 'worker') {
    details += detailRow('Rating',  avg > 0 ? '⭐ ' + avg.toFixed(1) + ' (' + (u.rating||[]).length + ' reviews)' : 'No reviews');
    details += detailRow('Skills',  u.skills || '—');
    if (u.bio) {
      details += '<div style="padding:10px 0;border-bottom:1px solid var(--border);">' +
        '<div class="detail-label" style="margin-bottom:6px;">Bio</div>' +
        '<p class="modal-bio">' + u.bio + '</p>' +
      '</div>';
    }
    if (u.skills) {
      const tags = u.skills.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
      details += '<div style="padding:10px 0;">' +
        '<div class="detail-label" style="margin-bottom:8px;">Skills</div>' +
        '<div class="modal-skills">' + tags.map(function(t) { return '<span class="modal-skill">' + t + '</span>'; }).join('') + '</div>' +
      '</div>';
    }
  }
  document.getElementById('modalDetails').innerHTML = details;

  const blockBtn = document.getElementById('modalBlockBtn');
  if (blocked) {
    blockBtn.textContent = '✅ Unblock User';
    blockBtn.style.background = 'rgba(34,197,94,0.12)';
    blockBtn.style.borderColor = 'rgba(34,197,94,0.3)';
    blockBtn.style.color = '#4ade80';
    blockBtn.onclick = function() { closeUserModal(); unblockUser(email); };
  } else {
    blockBtn.textContent = '🚫 Block User';
    blockBtn.style.background = 'rgba(239,68,68,0.12)';
    blockBtn.style.borderColor = 'rgba(239,68,68,0.3)';
    blockBtn.style.color = '#fca5a5';
    blockBtn.onclick = function() { closeUserModal(); blockUser(email); };
  }

  document.getElementById('userModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUserModal() {
  document.getElementById('userModal').classList.remove('active');
  document.body.style.overflow = '';
}

function detailRow(label, value) {
  return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + value + '</span></div>';
}

// ── CONFIRM MODAL ──────────────────────────────────────
function showConfirm(title, text, onYes) {
  document.getElementById('confirmTitle').innerHTML = title;
  document.getElementById('confirmText').innerHTML  = text;
  document.getElementById('confirmYes').onclick = function() {
    closeConfirm();
    onYes();
  };
  document.getElementById('confirmModal').classList.add('active');
}

function closeConfirm() {
  document.getElementById('confirmModal').classList.remove('active');
}

// ── PANEL NAVIGATION ───────────────────────────────────
function showPanel(name, btn) {
  document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.nav-item').forEach(function(b) { b.classList.remove('active'); });
  document.getElementById('panel-' + name).classList.add('active');
  if (btn) btn.classList.add('active');

  const titles = {
    overview:'Dashboard', clients:'Clients', workers:'Workers',
    blocked:'Blocked Accounts', posts:'Posts & Media', activity:'Activity Log'
  };
  document.getElementById('topbarTitle').textContent = titles[name] || name;

  // Reload data on switch
  loadData();
  updateStats();
  if (name === 'overview')  { renderOverviewTable(); updateTopLists(); }
  if (name === 'clients')   renderClientsTable();
  if (name === 'workers')   renderWorkersTable();
  if (name === 'blocked')   renderBlockedTable();
  if (name === 'posts')     renderPostsTable();
  if (name === 'activity')  renderActivity();
}

function refreshAll() {
  loadData();
  updateStats();
  renderOverviewTable();
  renderClientsTable();
  renderWorkersTable();
  renderBlockedTable();
  renderPostsTable();
  updateTopLists();
}

// ── FILTER ─────────────────────────────────────────────
function filterTable(type, val) {
  if (type === 'clients') renderClientsTable(val);
  if (type === 'workers') renderWorkersTable(val);
}

// ── HELPERS ────────────────────────────────────────────
function initials(name) {
  return (name || 'U').split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);
}

function avgRating(w) {
  var r = w.rating || [];
  return r.length ? r.reduce(function(s, x) { return s + x.stars; }, 0) / r.length : 0;
}

function userCell(u) {
  const imgHtml = u.image
    ? '<div class="user-avi"><img src="' + u.image + '" alt=""></div>'
    : '<div class="user-avi">' + initials(u.name) + '</div>';
  return '<div class="user-cell">' + imgHtml +
    '<div><div class="user-name">' + (u.name||'Unknown') + '</div>' +
    '<div class="user-email">' + (u.email||'') + '</div></div></div>';
}

function statusBadge(blocked) {
  return blocked
    ? '<span class="status-dot"><span class="dot blocked"></span> Blocked</span>'
    : '<span class="status-dot"><span class="dot active"></span> Active</span>';
}

function actionBtns(u, blocked) {
  return '<div class="action-btns">' +
    '<button class="btn-view" onclick="openUserModal(\'' + u.email + '\')">👤 View</button>' +
    (blocked
      ? '<button class="btn-unblock" onclick="unblockUser(\'' + u.email + '\')">✅ Unblock</button>'
      : '<button class="btn-block"   onclick="blockUser(\''   + u.email + '\')">🚫 Block</button>') +
    '<button class="btn-delete" onclick="deleteUser(\'' + u.email + '\')">🗑</button>' +
  '</div>';
}

function userRow(u, ctx) {
  const blocked = blockedEmails.includes(u.email);
  return '<tr>' +
    '<td>' + userCell(u) + '</td>' +
    '<td><span class="role-badge ' + (u.role||'client') + '">' + (u.role||'client') + '</span></td>' +
    '<td>' + statusBadge(blocked) + '</td>' +
    '<td>' + actionBtns(u, blocked) + '</td>' +
  '</tr>';
}

// ── TOAST ──────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 3500);
}

// ── SIDEBAR TOGGLE (mobile) ────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── LOGOUT ─────────────────────────────────────────────
function adminLogout() {
  localStorage.removeItem('fixwork_admin_session');
  window.location.href = 'admin-login.html';
}

// Close modals on backdrop click
document.getElementById('userModal').addEventListener('click', function(e) {
  if (e.target === this) closeUserModal();
});
document.getElementById('confirmModal').addEventListener('click', function(e) {
  if (e.target === this) closeConfirm();
});

// ── START ──────────────────────────────────────────────
init();

// Log an admin login event on first load
(function() {
  var key = 'fixwork_admin_last_login';
  var last = localStorage.getItem(key);
  var now  = Date.now();
  if (!last || (now - parseInt(last)) > 60000) {
    logActivity('login', 'Founder logged into the Admin Dashboard.');
    localStorage.setItem(key, now);
  }
})();
