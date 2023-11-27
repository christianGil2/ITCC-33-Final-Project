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

// MongoDB client for connection pooling
const client = new MongoClient(MONGODB_URI);

// Middleware to close the MongoDB client after the response is sent
app.use((req, res, next) => {
  // Close the MongoDB client after the response is sent
  res.on('finish', () => {
    client.close();
  });
  next();
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

    // Since passwords are stored in plain text, compare directly
    const user = await collection.findOne({ email, password });

    return !!user;
  } finally {
    await client.close();
  }
}

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

// New function to get user data
async function getUserData(email) {
  await client.connect();
  const database = client.db('register');
  const collection = database.collection('user');
  return await collection.findOne({ email });
}

// New function to deduct amount from user balance
async function deductAmountFromBalance(amount, userId) {
  const userCollection = client.db('register').collection('user');
  const result = await userCollection.updateOne(
    { _id: new ObjectID(userId), balance: { $gte: amount } },
    { $inc: { balance: -amount } }
  );
  return result.modifiedCount === 1;
}

app.post('/reserve-ticket', async (req, res) => {
  try {
    const reservationData = req.body;
    const reservationAmount = 800;

    // Retrieve user data using the stored email in the session
    const userEmail = req.session.userEmail;
    const user = await getUserData(userEmail);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Deduct the amount from the user's balance
    const isDeducted = await deductAmountFromBalance(reservationAmount, user._id);

    if (!isDeducted) {
      return res.status(500).json({ success: false, message: 'Error updating user balance' });
    }

    const database = client.db('register');
    const collection = database.collection('ticket');
    const result = await collection.insertOne({ ...reservationData, amount: reservationAmount });

    if (result.insertedCount === 1) {
      res.json({ success: true, message: 'Reservation successful' });
    } else {
      // Rollback the deducted amount if reservation insertion fails
      await deductAmountFromBalance(-reservationAmount, user._id);
      res.status(500).json({ success: false, message: 'Error during reservation. Please try again.' });
    }
  } catch (error) {
    console.error('Error during reservation:', error);
    res.status(500).json({ success: false, message: 'Error during reservation. Please try again.' });
  }
});

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

app.post('/pay-now', async (req, res) => {
  try {
    // Get user data from the "register" collection
    const client = new MongoClient(MONGODB_URI);
    await client.connect();

    const database = client.db('register');
    const userCollection = database.collection('user');
    const ticketCollection = database.collection('ticket');
    const userEmail = req.session.userEmail;

    const user = await userCollection.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prompt for password
    const providedPassword = req.body.password; // Assuming the client sends the password in the request

    // Log the provided and stored passwords for debugging
    console.log('Provided Password:', providedPassword);
    console.log('Stored Hashed Password:', user.password);

    // Verify the provided password
    const isPasswordValid = await bcrypt.compare(providedPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Extract data from the request body
    const { destination, sailingDate, cruise, port, amount } = req.body;

    // Create a new ticket document with user information
    const ticket = {
      userId: user._id, // Reference to the user
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

    // Store the ticket in the "ticket" collection
    const result = await ticketCollection.insertOne(ticket);

    if (result.insertedCount === 1) {
      // Optionally, you can update the user document with payment-related information
      const updateResult = await userCollection.updateOne(
        { email: userEmail },
        { $set: { lastPayment: new Date(), totalPayments: (user.totalPayments || 0) + 1 } }
      );

      if (updateResult.modifiedCount !== 1) {
        console.error('Error updating user with payment information');
      }

      // Send a success response
      res.json({ message: 'Payment successful. Ticket details stored.' });
    } else {
      res.status(500).json({ error: 'Error storing ticket details' });
    }
  } catch (error) {
    console.error('Error during payment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    // Close the MongoDB client after the response is sent
    if (client) {
      await client.close();
    }
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
    const { reason } = req.body;
    const result = await ticketCollection.updateOne(
      { _id: latestTicket._id },
      { $set: { revoked: true, revokeReason: reason } }
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

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
