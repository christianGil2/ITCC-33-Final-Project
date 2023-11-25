const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');

const app = express();
const PORT = 3000;
const MONGODB_URI = 'mongodb://127.0.0.1:27017';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Session middleware setup
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Loginform.html');
});

// Define a function to generate the script for the pop-up
function generatePopupScript(message, redirectUrl) {
  return `<script>alert("${message}. Click OK to proceed."); window.location.href="${redirectUrl}";</script>`;
}

async function checkCredentials(email, password) {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    // Check user credentials in the MongoDB collection
    const user = await collection.findOne({ email, password });

    return !!user; // Return true if the user is found, false otherwise
  } finally {
    await client.close();
  }
}

// New route to get user data
app.get('/get-user', async (req, res) => {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    const userEmail = req.session.userEmail;

    const user = await collection.findOne({ email: userEmail });

    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const isValidCredentials = await checkCredentials(email, password);

    if (isValidCredentials) {
      // Set the user's email in the session (assuming you are using sessions)
      req.session.userEmail = email;
      res.send(generatePopupScript('Login successful', '/'));
    } else {
      res.send(generatePopupScript('Invalid credentials'));
    }
  } catch (error) {
    console.error('Error checking credentials:', error);
    res.send(generatePopupScript('Error during login. Please try again.'));
  }
});

app.post('/register', async (req, res) => {
  const { firstname, lastname, email, password, confirmPassword, city, age, phoneNum, emergencyNum } = req.body;

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      res.send(generatePopupScript('Email already registered', '/'));
    } else {
      // Include the new fields in the document to be inserted
      await collection.insertOne({ firstname, lastname, email, password, city, age, phoneNum, emergencyNum });
      res.send(generatePopupScript('Registration successful', '/'));
    }
  } catch (error) {
    console.error('Error during registration:', error);
    res.send(generatePopupScript('Error during registration. Please try again.'));
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
