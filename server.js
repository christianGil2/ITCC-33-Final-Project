const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = 3000;
const MONGODB_URI = 'mongodb://localhost:27017';

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Loginform.html');
});

// Define a function to generate the script for the pop-up
function generatePopupScript(message, redirectUrl) {
  return `<script>alert("${message}. Click OK to proceed."); window.location.href="${redirectUrl}";</script>`;
}

app.post('/login', async (req, res) => {
    // Use bodyParser.urlencoded middleware to parse form data
    const { email, password } = req.body;
  
    // Add MongoDB logic to check user credentials
    const client = new MongoClient(MONGODB_URI);
  
    try {
      console.log('Login request received:', email, password);
  
      await client.connect();
      const database = client.db('register');
      const collection = database.collection('user');
  
      // Check user credentials
      const user = await collection.findOne({ email, password });
      console.log('User found in the database:', user);
  
      if (user) {
        res.send(generatePopupScript('Login successful', '/'));
      } else {
        res.send(generatePopupScript('Invalid credentials', '/'));
      }
    } finally {
      await client.close();
    }
  });
  

app.post('/register', async (req, res) => {
  const { firstname, lastname, email, password, confirmPassword } = req.body;

  // Declare client outside the try block
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    // Check if the email is already registered
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      // Display a pop-up for error with only an "OK" button
      res.send(generatePopupScript('Email already registered', '/'));
    } else {
      // Insert new user into the database
      await collection.insertOne({ firstname, lastname, email, password });
      // Display a pop-up for success with only an "OK" button
      res.send(generatePopupScript('Registration successful', '/'));
    }
  } finally {
    // Close the MongoDB connection in the finally block
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
