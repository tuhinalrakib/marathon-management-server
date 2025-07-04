const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require("cors")
const cookieParser = require("cookie-parser")
const port = process.env.PORT || 3000
const app = express()
const jwt = require('jsonwebtoken')
const { verifyJWT } = require("./middlewares/verifyJWT")
require("dotenv").config()

app.use(cors({
  origin: ['http://localhost:5173', 'https://marathon-management-8b5cc.web.app'],
  credentials: true
}))

app.use(express.json())
app.use(cookieParser())

app.get("/", async (req, res) => {
  res.send("Marathon Management Server")
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster.gnlwsvv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("marathonDb").collection("users")
    const marathonscollection = client.db("marathonDb").collection('marathons')
    const applyCollection = client.db("marathonDb").collection('apply')

    // =================generate JWT===========================
    app.post("/jwt", (req, res) => {
      //  user hosse payload data
      const user = { email: req.body.email }
      // token create
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "7d" })

      res.cookie('token', token, cookieOptions)
        .send({ message: "JWT Created Successfully" })
    })

    app.post('/logout', (req, res) => {
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });


    // ===================users related api=====================
    app.post("/users", async (req, res) => {
      const newUser = req.body
      const result = await userCollection.insertOne(newUser)
      res.send(result)
    })

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })


    // =================Marathons Related APIs========================
    app.post("/marathons", async (req, res) => {
      const newMarathon = req.body
      const result = await marathonscollection.insertOne(newMarathon)
      res.send(result)
    })

    app.get("/marathons", async (req, res) => {
      const { id, limit, sortOrder } = req.query;

      try {
        if (id) {
          const result = await marathonscollection.findOne({ _id: new ObjectId(id) });
          if (result) {
            return res.send(result);
          } else {
            return res.status(404).send({ message: "Marathon not found" });
          }
        }

        // sorting option
        let sortOption = {};
        if (sortOrder === "asc") {
          sortOption = { createdAt: 1 };
        } else if (sortOrder === "desc") {
          sortOption = { createdAt: -1 };
        }

        // With limit and sorting
        if (limit) {
          const limitedResult = await marathonscollection
            .find()
            .sort(sortOption)
            .limit(parseInt(limit))
            .toArray();
          return res.send(limitedResult);
        }

        // All results with sorting
        const allResult = await marathonscollection.find().sort(sortOption).toArray();
        return res.send(allResult);

      } catch (error) {
        console.error("Error fetching marathons:", error);
        return res.status(500).send({ message: "Server error", error: error.message });
      }
    });


    app.get('/myMarathons', verifyJWT, async (req, res) => {
      const email = req.tokenEmail;
      const query = { organizerEmail: email };
      const result = await marathonscollection.find(query).toArray();
      return res.send(result);
    });



    app.delete("/marathons/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await marathonscollection.deleteOne(filter)
      res.send(result)
    })

    app.put("/marathons/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true }
      const updateMarathon = req.body
      const updateDoc = {
        $set: updateMarathon
      }
      const result = await marathonscollection.updateOne(filter, updateDoc, option)
      res.send(result)
    })

    app.patch('/marathons/increment/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $inc: {
          registrationCount: 1
        }
      }
      const result = await marathonscollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    app.patch('/marathons/decrement/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }

      const marathon = await marathonscollection.findOne(filter);
      if (marathon.registrationCount <= 0) {
        return res.status(400).send({ error: "registrationCount is already 0" });
      }

      const updateDoc = {
        $inc: {
          registrationCount: -1
        }
      }
      const result = await marathonscollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    // =================Apply Marathon Related APIs========================
    app.post("/apply", async (req, res) => {
      const newApply = req.body
      const result = await applyCollection.insertOne(newApply)
      res.send(result)
    })

    app.get("/myApply", verifyJWT, async (req, res) => {
      const email = req.tokenEmail;
      const title = req.query.title
      const query = { email: email };

      if (title) {
        query.title = { $regex: title, $options: "i" }
      }
      const result = await applyCollection.find(query).toArray()
      res.send(result)
    })

    app.put('/myApply/:id', async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const option = { upsert: true }
      const updateMarathon = req.body
      const updateDoc = {
        $set: updateMarathon
      }
      const result = await applyCollection.updateOne(filter,updateDoc,option)
      res.send(result)
    })

    app.delete("/myApply/:id", async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const result = await applyCollection.deleteOne(filter)
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
  console.log(`App listeing from port: ${port}`)
});