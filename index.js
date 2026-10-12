const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors');
const app = express()
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000", // ফ্রন্টএন্ডের লাইভ লিঙ্ক
    credentials: true
}));
app.use(express.json())

const dotenv = require('dotenv');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
dotenv.config()
const uri = process.env.MONGO_DB_URI;

const port = process.env.MONGO_DB_PORT

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// midleware func
/*, (req, res, next) => {
           
            // if (header === 'logged in') {
            // } else {
            //     res.status(401).send({ message: 'Unauthorized' })
            // }
        } */
 const JWKS = createRemoteJWKSet(
      new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
    );

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers?.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    // payload-এ user info রাখো যাতে পরের middleware ব্যবহার করতে পারে
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized" });
  }
};

const verifyAdmin = async (req, res, next) => {
  try {
    // Better Auth JWT payload-এ সাধারণত user id থাকে
    // role আলাদা করে users collection থেকে নিতে হবে (নিচে দেখো)
    const userId = req.user?.sub || req.user?.id;

    if (!userId) {
      return res.status(401).send({ message: "Unauthorized" });
    }

    const user = await usersCollection.findOne({
      _id: userId, // Better Auth Mongo-তে _id string হয়
    });

    if (!user || user.role !== "admin") {
      return res.status(403).send({ message: "Forbidden: Admin only" });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    console.error("verifyAdmin error:", error);
    return res.status(500).send({ message: "Internal Server Error" });
  }
};

const run = async () => {
    try {
    const db = client.db("wanderlastdb");
const destinationsCollection = db.collection("destinations");
const bookingsCollection = db.collection("bookings");
const usersCollection = db.collection("user"); // Better Auth default collection name

        app.get('/destination', async (req, res) => {
            const result = await destinationsCollection.find().toArray()
            // console.log(result)
            res.send(result)
        })

        app.get('/destination/:id',verifyToken , async (req, res) => {
            const id = req.params.id;
           
            const result = await destinationsCollection.findOne({ _id: new ObjectId(id) })
            res.send(result)
        })

        app.post('/destination', async (req, res) => {
            const destinationData = await req.body;
            const result = await destinationsCollection.insertOne(destinationData)
            // console.log('reslt', result)
            res.send(result)
        })
        //  country, category, price, duration, departureDate, description,destinationName,imageUrl ,_id
        app.patch('/destination/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const editedData = req.body
            const result = await destinationsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: editedData }
            )
            res.send(result)
            // old system
            //    const updateDocument = {
            //    $set: {
            //     destinationName: editedData.destinationName,
            //     country: editedData.country,
            //     category: editedData.category,
            //     price: editedData.price,
            //     duration: editedData.duration,
            //     departureDate: editedData.departureDate,
            //     description: editedData.description,
            //     imageUrl: editedData.imageUrl
            //    },
            // };
        })

        app.delete('/destination/:id', async (req, res) => {
            const id = req.params.id
            const filter = {
                _id: new ObjectId(id)
            }
            const result = await destinationsCollection.deleteOne(filter)
            res.send(result)
        })

        app.post('/bookings', verifyToken, async (req, res) => {
            const bookingData = await req.body;
            const result = await bookingsCollection.insertOne(bookingData)
            console.log('reslt', result)
            res.send(result)
        })
        app.get('/bookings/:userId',verifyToken, async (req, res) => {
            const { userId } = req.params;
            const bookings = await bookingsCollection.find({ userId: userId }).toArray();
            res.send(bookings);
        });
        app.delete('/bookings/:userId', async (req, res) => {
            const { userId } = req.params;
            const result = await bookingsCollection.deleteOne({ _id: new ObjectId(userId) });
            res.send(result);
        })

        // Create destination → Admin only
app.post("/destination", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const destinationData = req.body;
    const result = await destinationsCollection.insertOne(destinationData);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Update destination → Admin only
app.patch("/destination/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await destinationsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Delete destination → Admin only
app.delete("/destination/:id", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const result = await destinationsCollection.deleteOne({
      _id: new ObjectId(id),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// সব users দেখা
app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await usersCollection.find({}).toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Role আপডেট
app.patch("/users/:id/role", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!["tourist", "admin"].includes(role)) {
      return res.status(400).send({ message: "Invalid role" });
    }

    const result = await usersCollection.updateOne(
      { _id: req.params.id },
      { $set: { role } }
    );

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// সব bookings
app.get("/all-bookings", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await bookingsCollection
      .find({})
      .sort({ _id: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Admin stats
app.get("/admin/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await usersCollection.countDocuments();
    const totalDestinations = await destinationsCollection.countDocuments();
    const totalBookings = await bookingsCollection.countDocuments();

    res.send({
      totalUsers,
      totalDestinations,
      totalBookings,
    });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})