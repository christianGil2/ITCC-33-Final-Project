document.addEventListener("DOMContentLoaded", async function () {
  document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      alert("Both email and password are required");
      return;
    }

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData).toString(),
      });

      const data = await response.text();

      if (data.includes('Login successful')) {
        const message = 'Login successful';
        const redirectUrl = '/index2.html';
        showAlert(message, redirectUrl);
        updateProfileInfo(); // Update profile information after login
      } else {
        const message = 'Invalid credentials';
        showAlert(message);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      alert("Password and Confirm Password do not match");
      return;
    }

    try {
      const response = await fetch('/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.text();

      if (data.includes('Registration successful')) {
        const message = 'Registration successful. Click OK to proceed to login.';
        const redirectUrl = '/';
        showAlert(message, redirectUrl);
        updateProfileInfo(); // Update profile information after registration
      } else {
        showAlert(data);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  function showAlert(message, redirectUrl) {
    alert(`${message}. Click OK to proceed.`);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }

  async function updateProfileInfo() {
    try {
      const response = await fetch('/get-user');
      const userData = await response.json();

      // Update profile information on the page
      document.querySelector('input[name="firstname"]').value = userData.firstname;
      document.querySelector('input[name="lastname"]').value = userData.lastname;
      document.querySelector('input[name="email"]').value = userData.email;
      document.querySelector('input[name="city"]').value = userData.city;
      document.querySelector('input[name="phoneNum"]').value = userData.phoneNum;
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }

  updateProfileInfo(); // Initial update of profile information
});