const express = require('express');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const { ObjectId } = require('mongodb');

const app = express();
const PORT = 3000;
const MONGODB_URI = 'mongodb://127.0.0.1:27017';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

// Session middleware setup
app.use(session({
  secret: 'your-strong-unique-secret',
  resave: false,
  saveUninitialized: true,
}));

// MongoDB client for connection pooling
const client = new MongoClient(MONGODB_URI);

// Define the ticketsCollection
const ticketsCollection = client.db('register').collection('ticket');

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});


app.use(async (req, res, next) => {
  try {
    await client.connect();
    res.on('finish', async () => {
      try {
        await client.close();
      } catch (error) {
        console.error('Error closing MongoDB client:', error);
      }
    });
    next();
  } catch (error) {
    next(error);
  }
});

// Define a function to generate the script for the pop-up
function generatePopupScript(message, redirectUrl) {
  return `<script>alert("${message}. Click OK to proceed."); window.location.href="${redirectUrl}";</script>`;
}

// New route to get user data
app.get('/get-user', async (req, res, next) => {
  try {
    if (!req.session.userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    const userEmail = req.session.userEmail;
    const user = await collection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
  
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const isValidCredentials = await checkCredentials(email, password);

    if (isValidCredentials) {
      req.session.userEmail = email;
      res.json({ success: true, message: 'Login successful' });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Error during login. Please try again.' });
  }
});

async function checkCredentials(email, password) {
  try {
    await client.connect();
    const database = client.db('register');
    const collection = database.collection('user');

    const user = await collection.findOne({ email, password });

    return !!user;
  } finally {
    await client.close();
  }
}

app.post('/register', async (req, res) => {
  let client;

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

// function to get user data
async function getUserData(email) {
  await client.connect();
  const database = client.db('register');
  const collection = database.collection('user');
  return await collection.findOne({ email });
}

app.post('/update-profile', async (req, res, next) => {
  try {
    if (!req.session.userEmail) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await client.connect();
    const database = client.db('register');
    const userCollection = database.collection('user');
    const userEmail = req.session.userEmail;

    const user = await userCollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { city, phoneNum } = req.body;

    console.log('Update Profile Data:', { city, phoneNum });

    // Update user profile information
    const updateResult = await userCollection.updateOne(
      { email: userEmail },
      { $set: { city, phoneNum } }
    );

    console.log('Update Result:', updateResult);

    if (updateResult.modifiedCount === 1) {
      // Retrieve the updated user information
      const updatedUser = await userCollection.findOne({ email: userEmail });

      console.log('Updated User Information:', updatedUser);

      // Send the updated user information as the response
      return res.json({ success: true, message: 'Profile updated successfully', updatedUser });
    } else {
      return res.status(500).json({ success: false, error: 'Error updating profile' });
    }
  } catch (error) {
    next(error);
  } finally {
    // Close the MongoDB client after the response is sent
    await client.close();
  }
});

// Place this function definition somewhere in your server-side code
function calculateDepartureDate(selectedSailingDate) {
  const sailingDate = new Date(selectedSailingDate);
  const departureDate = new Date(sailingDate);
  departureDate.setDate(sailingDate.getDate() + 3);
  return `${departureDate.getMonth() + 1}/${departureDate.getDate()}/${departureDate.getFullYear()}`;
}

function generateSeatNumber() {
  // Logic to generate a random number between 1 and 5000
  return Math.floor(1 + Math.random() * 3000);
}

async function storeTicket(ticket) {
  try {
    const result = await ticketsCollection.insertOne(ticket);

    if (result && result.acknowledged && result.insertedId) {
      console.log('Ticket stored successfully:', ticket);
      return true; // Ticket insertion successful
    } else {
      console.error('Error storing ticket details: Invalid result from MongoDB insertion');
      return false; // Ticket insertion failed
    }
  } catch (error) {
    console.error('Error storing ticket details:', error);
    return false; // Ticket insertion failed
  }
}

app.post('/reserve-now', async (req, res) => {
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      // Check if the user is authenticated
      if (!req.session.userEmail) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userEmail = req.session.userEmail;
      const user = await getUserData(userEmail);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { destination, sailingDate, cruise, port } = req.body;

      const departureDate = calculateDepartureDate(sailingDate);
      const seatNumber = generateSeatNumber();

      const ticket = {
        userId: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phoneNum: user.phoneNum,
        destination,
        sailingDate,
        cruise,
        port,
        departureDate,
        seatNumber,
        timestamp: new Date(),
      };

      // Use the storeTicket function to insert the ticket into the database
      const result = await storeTicket(ticket);

      res.json({ message: 'Reservation successful. Ticket details stored.', ticketDetails: ticket });
    });
  } catch (error) {
    console.error('Error during reservation:', error);
    res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  } finally {
    session.endSession();
  }
});

app.post('/revoke-ticket', async (req, res) => {
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
    const ticketCollection = database.collection('ticket');
    const revokedCollection = database.collection('revoked'); // New collection for revoked tickets
    const userEmail = req.session.userEmail;

    const user = await userCollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the latest ticket for the user that is not revoked
    const latestTicket = await ticketCollection.findOne(
      { userId: user._id, revoked: false },
      { sort: { timestamp: -1 } }
    );

    if (!latestTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update the ticket to mark it as revoked
    const result = await ticketCollection.findOneAndUpdate(
      { userId: user._id, revoked: false },
      { $set: { revoked: true, revokeReason: reason } },
      { sort: { timestamp: -1 } }
    );

    if (result.modifiedCount === 1) {
      // Store user information and reason for revoking in the "revoked" collection
      await revokedCollection.insertOne({
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phoneNum: user.phoneNum,
        city: user.city,
        reasonOfRevokedTicket: reason,
      });

      res.json({ message: 'Ticket revoked successfully' });
    } else {
      res.status(500).json({ error: 'Error revoking ticket' });
    }
  } catch (error) {
    console.error('Error revoking ticket:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
