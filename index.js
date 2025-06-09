const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require("cors")
const port = process.env.PORT || 3000
const app = express()
require("dotenv").config()

app.use(cors())
app.use(express.json())

app.get("/", async (req,res)=>{
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

    app.post("/users", async(req,res)=>{
        const newUser = req.body 
        const result = await userCollection.insertOne(newUser)
        res.send(result)
    })

    app.get("/users", async(req,res)=>{
        const result = await userCollection.find().toArray()
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


app.listen(port, ()=>{
    console.log(`App listeing from port: ${port}`)
})