require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const express = require('express');
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000


//middleware
app.use(express.json())
app.use(cors())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pjwkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Send a ping to confirm a successful connection

        const userCollection = client.db('ParcelDB').collection('users')
        const parcelCollection = client.db('ParcelDB').collection('parcels')
        const deliveryCollection = client.db('ParcelDB').collection('deliveries')
        const reviewCollection = client.db('ParcelDB').collection('reviews')






        //user
        //user
        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const isExist = await userCollection.findOne(query)
            if (isExist) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })
        app.get('/users', async (req, res) => {
            const email = req.query.email
            const filter = { email: email }
            const result = await userCollection.find(filter).toArray()
            res.send(result)
        })
        app.get('/all-users', async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })
        app.patch('/user/:id', async (req, res) => {
            const id = req.params.id
            const user = req.body
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: user.name,
                    age: user.age,
                    phone: user.phone,
                    address: user.address,
                    photo: user.photo,
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })
        app.patch('/user/role/:id', async (req, res) => {
            const id = req.params.id
            const user = req.body
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: user.role,
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })



        //parcel
        app.post('/parcels', async (req, res) => {
            const parcel = req.body
            const result = await parcelCollection.insertOne(parcel)
            res.send(result)

        })
        app.get('/parcel/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await parcelCollection.findOne(query);
            res.send(result);
        });
        app.patch('/parcel/:id', async (req, res) => {
            const id = req.params.id;
            const parcel = req.body
            const query = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    name: parcel.name,
                    email: parcel.email,
                    number: parcel.number,
                    parcelType: parcel.parcelType,
                    parcelWeight: parcel.parcelWeight,
                    receiverName: parcel.receiverName,
                    receiverPhoneNumber: parcel.receiverPhoneNumber,
                    deliveryAddress: parcel.deliveryAddress,
                    deliveryDate: parcel.deliveryDate,
                    latitude: parcel.latitude,
                    longitude: parcel.longitude,
                    price: parcel.price
                }
            }
            const result = await parcelCollection.updateOne(query, updatedDoc);
            res.send(result);
        });
        app.patch('/manage-parcel/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const deliveryInfo = req.body
            if (deliveryInfo.deliveryManId) {
                const query = { _id: new ObjectId(deliveryInfo.deliveryManId) }
                const deliveryMan = await userCollection.findOne(query)
                if (deliveryMan) {
                    const updatedDoc = {
                        $set: {
                            deliveryName: deliveryMan.name,
                            deliveryManId: deliveryInfo.deliveryManId,
                            approxDeliveryDate: deliveryInfo.approxDelivery,
                            deliveryEmail: deliveryMan.email,
                            status: "InTransit",
                        }
                    }
                    // console.log(result.name);
                    const result = await parcelCollection.updateOne(filter, updatedDoc)
                    res.send(result)

                }

            }
            // console.log(deliveryInfo.deliveryManId, filter);

        })


        //cancel parcel
        app.patch('/parcel/cancel/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    status: 'Cancelled'
                }
            }
            const result = await parcelCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.get('/parcels', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await parcelCollection.find(query).toArray()
            res.send(result)
        })
        app.get('/all-parcel', async (req, res) => {
            const result = await parcelCollection.find().toArray()
            res.send(result)
        })



        // find delivery man
        app.get('/delivery-men', async (req, res) => {
            const filter = { role: "DeliveryMan" }
            const result = await userCollection.find(filter).toArray()
            res.send(result)
        })

        //my delivery
        app.get('/my-delivery', async (req, res) => {
            const email = req.query.email
            // console.log(email);
            const query = { deliveryEmail: email }
            const result = await parcelCollection.find(query).toArray()
            res.send(result)
        })


        app.post('/deliveries/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const delivery = req.body;

            // console.log(delivery.deliveredManId);

            if (delivery.deliveredManId) {
                const filter = { _id: new ObjectId(delivery.deliveredManId) };
                const updateDeliveryMan = {
                    $inc: { totalDelivered: 1 }
                };
                await userCollection.updateOne(filter, updateDeliveryMan);
            }

            if (query) {
                const updatedDoc = {
                    $set: {
                        status: 'Delivered'
                    }
                };
                await parcelCollection.updateOne(query, updatedDoc);
            }

            const finalResult = await deliveryCollection.insertOne(delivery);
            res.send(finalResult);
        });



        //review 
        app.post('/reviews/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const reviewInfo = req.body
            if (reviewInfo.deliveryManUID) {
                const userFilter = { _id: new ObjectId(reviewInfo.deliveryManUID) }
                const newReview = parseFloat(reviewInfo.rating);
                const updatedUserDoc = {
                    $inc: {
                        reviewCount: 1,
                        totalRating: newReview,
                    }

                }
                const userResult = await userCollection.updateOne(userFilter, updatedUserDoc)
            }
            if (reviewInfo.parcelStatus) {
                const updatedParcelDoc = {
                    $set: {
                        reviewStatus: reviewInfo.parcelStatus
                    }
                }
                const parcelResult = await parcelCollection.updateOne(filter, updatedParcelDoc)

            }
            const finalResult = await reviewCollection.insertOne(reviewInfo)
            res.send(finalResult)

        })
        // app.get('/reviews', async (req, res) => {
        //     const result = await reviewCollection.find().toArray()
        //     res.send(result)
        // })
        app.get('/reviews', async (req, res) => {
            const email = req.query.email
            const filter = { deliveryManEmail: email }
            const result = await reviewCollection.find(filter).toArray()
            res.send(result)
        })







        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);







app.get('/', (req, res) => {
    res.send('parcel ease server running')
})
app.listen(port, () => {
    console.log('server running on:', port);
})