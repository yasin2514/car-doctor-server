const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

// middleware 
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send("car-server is running")
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zexvqii.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }

    const token = authorization.split(' ')[1];
    console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })

}


async function run() {
    try {
        await client.connect();
        const serviceCollection = client.db("carDoctor").collection('services');
        const bookedCollection = client.db("carDoctor").collection('bookings');

        // jwt 
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });
            res.send({ token })

        })

        // services

        app.get('/services', async (req, res) => {
            const cursor = serviceCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });
        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };

            const options = {
                projection: { title: 1, price: 1, service_id: 1, img: 1 }
            };
            const result = await serviceCollection.findOne(query, options);
            res.send(result);
        })


        // bookings

        app.get('/bookings', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log(decoded)
            console.log('came back after verify');
            if (decoded.email !== req.query.email) {
                return res.status(403).send({ error: 1, message: "forbidden access" })
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const cursor = bookedCollection.find(query);
            const result = await cursor.toArray();
            res.send(result)
        })


        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const result = await bookedCollection.insertOne(bookings);
            res.send(result)
            console.log(bookings)
        })

        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const bookings = req.body;
            const query = { _id: new ObjectId(id) };
            const updatedBookings = {
                $set: {
                    status: bookings.status
                }
            }
            const result = await bookedCollection.updateOne(query, updatedBookings);
            res.send(result);
        })

        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookedCollection.deleteOne(query);
            res.send(result)
        })


        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`car server is running on port ${port}`)
})