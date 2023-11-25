const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const { ObjectID } = require('mongodb');

const app = express();
const PORT = 3000;
const MONGODB_URI = 'mongodb://127.0.0.1:27017';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Session middleware setup
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

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
  if (!req.session.userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    const userEmail = req.session.userEmail;

    // Corrected query field from 'email' to 'email'
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const isValidCredentials = await checkCredentials(email, password);

    if (isValidCredentials) {
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
  let client; // Define the client variable

  try {
    const { firstname, lastname, email, password, confirmPassword, city, age, phoneNum, emergencyNum } = req.body;
    client = new MongoClient(MONGODB_URI);

    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');
    const existingUser = await collection.findOne({ email });

    if (existingUser) {
      res.send(generatePopupScript('Email already registered', '/'));
    } else {
      await collection.insertOne({ firstname, lastname, email, password, city, age, phoneNum, emergencyNum });
      res.send(generatePopupScript('Registration successful', '/'));
    }
  } catch (error) {
    console.error('Error during registration:', error);
    res.send(generatePopupScript('Error during registration. Please try again.'));
  } finally {
    if (client) {
      await client.close();
    }
  }
});

app.post('/reserve-ticket', async (req, res) => {
  try {
    const reservationData = req.body;

    const client = new MongoClient(MONGODB_URI);
    await client.connect();

    const database = client.db('register');
    const collection = database.collection('ticket');

    // Insert the reservation data into the "ticket" collection
    await collection.insertOne(reservationData);

    res.json({ success: true, message: 'Reservation successful' });
  } catch (error) {
    console.error('Error during reservation:', error);
    res.status(500).json({ success: false, message: 'Error during reservation. Please try again.' });
  } finally {
    await client.close();
  }
});

app.post('/pay-now', async (req, res) => {
  try {
    // Ensure the user is logged in
    if (!req.session.userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user data from the "register" collection
    const client = new MongoClient(MONGODB_URI);
    await client.connect();

    const database = client.db('register');
    const userCollection = database.collection('user');
    const userEmail = req.session.userEmail;

    const user = await userCollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract data from the request body
    const { destination, sailingDate, cruise, port, amount } = req.body;

    // Create a new ticket document
    const ticket = {
      userId: user._id, // Reference to the user
      destination,
      sailingDate,
      cruise,
      port,
      amount,
      timestamp: new Date(),
    };

    // Store the ticket in the "ticket" collection
    const ticketCollection = database.collection('ticket');
    const result = await ticketCollection.insertOne(ticket);

    if (result.insertedCount === 1) {
      res.json({ message: 'Payment successful. Ticket details stored.' });
    } else {
      res.status(500).json({ error: 'Error storing ticket details' });
    }
  } catch (error) {
    console.error('Error during payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
