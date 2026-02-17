// frontend/public/login.js
const loginForm = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const errorMessageDiv = document.getElementById("error-message");
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessageDiv.classList.add("d-none");
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) {
    showError("Please enter both username and password.");
    return;
  }
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (response.ok) {
      console.log("Login successful:", data);
      window.location.href = "/index.html";
    } else {
      console.error("Login failed:", data.error);
      showError(data.error || "Login failed. Please check your credentials.");
    }
  } catch (error) {
    console.error("Network or other error during login:", error);
    showError("An error occurred during login. Please try again later.");
  }
});
function showError(message) {
  errorMessageDiv.textContent = message;
  errorMessageDiv.classList.remove("d-none");
}
async function checkInitialAuthStatus() {
  try {
    const response = await fetch("/api/auth/status");
    if (response.ok) {
      const data = await response.json();
      if (data.isAuthenticated) {
        console.log("Already logged in, redirecting to dashboard...");
        window.location.href = "/index.html";
      }
    }
  } catch (error) {
    console.error("Error checking initial auth status:", error);
  }
}
document.addEventListener("DOMContentLoaded", checkInitialAuthStatus);
