const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

const fs = require('fs');

// Ensure the 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Created "uploads" directory.');
}

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yzf7x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files statically

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Main function
async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('Connected to MongoDB successfully!');

    const userCollection = client.db('userDB').collection('user');

    // Endpoint for form submission
    app.post('/user', upload.single('sscCertificate'), async (req, res) => {
      try {
        const { fullName, email, phone, course, message } = req.body;
        const sscCertificatePath = req.file?.path;

        if (!sscCertificatePath) {
          return res.status(400).send({ error: 'SSC certificate upload is required.' });
        }

        const newUser = {
          fullName,
          email,
          phone,
          course,
          message,
          sscCertificate: sscCertificatePath, // Store the file path in MongoDB
        };

        const result = await userCollection.insertOne(newUser);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to submit the form.' });
      }
    });

    app.get('/user', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
    
      const user = await userCollection.findOne({ email });
      if (user) {
        res.send(user);
      } else {
        res.status(404).send({ error: "User not found" });
      }
    });
    
    
  } finally {
    // Optionally close the client when the server stops
    // await client.close();
  }
}
run().catch(console.dir);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
