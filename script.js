function authenticateUser(username, password) {
  const mongoose = require('mongoose');
  const User = require('./models/user'); // Assuming you have a User model

  async function authenticateUser(username, password) {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost/test', { useNewUrlParser: true, useUnifiedTopology: true });

    // Find user in the database
    const user = await User.findOne({ username: username });

    if (user && user.password === password) { // In real-world applications, never store passwords in plain text
      console.log("User authenticated successfully");
      // Redirect to the user page
      window.location.href = "userprofile.html";
      return true;
    } else {
      console.log("Authentication failed");
      return false;
    }
  }
}