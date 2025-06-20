const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require("cors")
const cookieParser = require("cookie-parser")
const port = process.env.PORT || 3000
const app = express()
const jwt = require('jsonwebtoken')
const { verifyJWT } = require("./middlewares/verifyJWT")
// const { verifyTokenEmail } = require("./middlewares/VerifyTokenEmail")
require("dotenv").config()

app.use(cors({
  origin: 'https://marathon-management-8b5cc.web.app',
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("marathonDb").collection("users")
    const marathonscollection = client.db("marathonDb").collection('marathons')

    // =================generate JWT===========================
    app.post("/jwt", (req, res) => {
      //  user hosse payload data
      const user = { email: req.body.email }
      // token create
      const token = jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "7d" })

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // sameSite: "Lax",
        // maxAge: 7 * 24 * 60 * 60 * 1000,
      })
        .send({ message: "JWT Created Successfully" })
    })

    app.post('/logout', (req, res) => {
      res.clearCookie('token').send({ message: 'Logout success' });
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
      const limit = 6

      if (limit) {
        const result = await marathonscollection.find().limit(limit).toArray()
        return res.send(result)
      }

      const result = await marathonscollection.find().toArray()
      return res.send(result)
    })

    app.get('/myMarathons/:email', verifyJWT, async (req, res) => {
      const email = req.params.email
      const decodedEmail = req.tokenEmail
      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      const query = { organizerEmail: email }
      const result = await marathonscollection.find(query).toArray()
      return res.send(result)
    })


    app.get("/marathons/:id",verifyJWT, async(req,res)=>{
      const id = req.params.id
      const filter = { _id : new ObjectId(id) }
      const result = await marathonscollection.findOne(filter)
      res.send(result)
    })

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