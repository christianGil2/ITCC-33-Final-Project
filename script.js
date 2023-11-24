function authenticateUser(username, password) {
  const predefinedUsername = "admin";
  const predefinedPassword = "password";

  if (username === predefinedUsername && password === predefinedPassword) {
    console.log("User authenticated successfully");
    // Redirect to the user page
    window.location.href = "userprofile.html";
    return true;
  } else {
    console.log("Authentication failed");
    return false;
  }
}