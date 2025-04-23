document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("admin-login-btn");
    document.getElementById('back-btn').addEventListener('click', function () {
      // חזרה לעמוד הראשי
      window.location.href = '../index.html';
    });

    loginBtn?.addEventListener("click", function () {
        const email = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (!email || !password) {
            alert("אנא הזן אימייל וסיסמה");
            return;
        }

        fetch("../php/login.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&isAdminLogin=1`
    })
    .then(response => response.text())  // כי PHP מחזיר "admin_success"
    .then(data => {
        if (data === "admin_success") {
            window.location.href = "adminMonitor.html";
        } else if (data === "not_admin") {
            alert("המשתמש אינו מנהל. אין גישה.");
        } else {
            alert("שם משתמש או סיסמה שגויים");
        }
    })
    .catch(error => {
        console.error("שגיאה:", error);
        alert("שגיאה בהתחברות");
    });

    });
});
