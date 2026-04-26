// ── SIGNUP ─────────────────────────────────────────────
const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", function(e) {
        e.preventDefault();

        const inputs = signupForm.querySelectorAll("input");
        const select = signupForm.querySelector("select");

        const name     = inputs[0].value.trim();
        const email    = inputs[1].value.trim();
        const password = inputs[2].value.trim();
        const role     = select.value;

        if (!name || !email || !password || !role) {
            alert("Please fill in all fields.");
            return;
        }

        // Load existing users list
        const users = JSON.parse(localStorage.getItem("fixwork_users")) || [];

        // Check if email already registered
        const exists = users.find(function(u) { return u.email === email; });
        if (exists) {
            alert("An account with this email already exists. Please login.");
            return;
        }

        const newUser = {
            name:     name,
            email:    email,
            password: password,
            role:     role
        };

        // Add to users list
        users.push(newUser);
        localStorage.setItem("fixwork_users", JSON.stringify(users));

        // If worker, also add them to the workers list so clients can find them
        if (role === "worker") {
            const workers = JSON.parse(localStorage.getItem("fixwork_workers")) || [];
            // Only add if not already there
            const alreadyWorker = workers.find(function(w) { return w.email === email; });
            if (!alreadyWorker) {
                workers.push({
                    name:     name,
                    email:    email,
                    role:     "",
                    bio:      "",
                    skills:   "",
                    location: "",
                    image:    "",
                    rating:   []
                });
                localStorage.setItem("fixwork_workers", JSON.stringify(workers));
            }
        }

        alert("Account created successfully!");
        window.location.href = "login.html";
    });
}


// ── LOGIN ──────────────────────────────────────────────
const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(e) {
        e.preventDefault();

        const inputs   = loginForm.querySelectorAll("input");
        const email    = inputs[0].value.trim();
        const password = inputs[1].value.trim();

        // Load users list
        const users = JSON.parse(localStorage.getItem("fixwork_users")) || [];

        if (users.length === 0) {
            alert("No accounts found. Please sign up first.");
            return;
        }

        // Find matching user
        const user = users.find(function(u) {
            return u.email === email && u.password === password;
        });

        if (!user) {
            alert("Invalid email or password.");
            return;
        }

        // Save current session
        localStorage.setItem("fixwork_logged_in", "true");
        localStorage.setItem("fixwork_current_user", JSON.stringify(user));

        // Redirect based on role
        if (user.role === "worker") {
            window.location.href = "worker.html";
        } else {
            window.location.href = "client.html";
        }
    });
}


// ── LOGOUT ─────────────────────────────────────────────
function logout() {
    localStorage.removeItem("fixwork_logged_in");
    localStorage.removeItem("fixwork_current_user");
    window.location.href = "login.html";
}
