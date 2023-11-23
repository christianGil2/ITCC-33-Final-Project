document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    // Collect form data
    const formData = new FormData(e.target);

    // Validate form data
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email || !password) {
      alert("Both email and password are required");
      return;
    }

    try {
      // Send form data to the server
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(formData).toString(),
      });

      const data = await response.text();

      // Handle the server response
      if (data.includes('Login successful')) {
        // Display a pop-up for success with only an "OK" button
        const message = 'Login successful';
        const redirectUrl = '/';
        showAlert(message, redirectUrl);
      } else {
        // Display a pop-up for error with only an "OK" button
        const message = 'Invalid credentials';
        showAlert(message);
        // Optionally, you can handle different error messages here
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    // Collect form data
    const formData = new FormData(e.target);

    // Validate form data, including password confirmation
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (password !== confirmPassword) {
      alert("Password and Confirm Password do not match");
      return;
    }

    try {
      // Send form data to the server
      const response = await fetch('/register', {
        method: 'POST',
        body: formData,
      });

      const data = await response.text();

      // Handle the server response for registration
      if (data.includes('Registration successful')) {
        // Display a pop-up for success with only an "OK" button
        const message = 'Registration successful. Click OK to proceed to login.';
        const redirectUrl = '/';
        showAlert(message, redirectUrl);
      } else {
        // Display a pop-up for error with only an "OK" button
        showAlert(data);
        // Optionally, you can handle different error messages here
      }
    } catch (error) {
      console.error('Error:', error);
    }
  });

  // Function to show a pop-up with an optional redirect
  function showAlert(message, redirectUrl) {
    alert(`${message}. Click OK to proceed.`);
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }
});
