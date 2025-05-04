require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const express = require("express");
const stripe = require("stripe")(
  "sk_test_51QhTWxADaA21k0SYb02aSGh4q3lzlDM9118NbKETkGFeFbMLaL86Nue0lOzlNDpEg8dKCSsR8LUGqYv2uDEMcbDi00Q5oaAicA"
);
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const moment = require("moment");

//middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pjwkg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const userCollection = client.db("ParcelDB").collection("users");
    const parcelCollection = client.db("ParcelDB").collection("parcels");
    const deliveryCollection = client.db("ParcelDB").collection("deliveries");
    const reviewCollection = client.db("ParcelDB").collection("reviews");
    const paymentCollection = client.db("ParcelDB").collection("payments");

    //jwt related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //jwt middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside Verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "access-unauthorized" });
      }
      const token = req.headers.authorization.split(" ")[1];
      // verify a token symmetric
      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: "access-unauthorized" });
        }
        req.decoded = decoded;
        next();
      });
    };
    //verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "Admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden-access" });
      }
      next();
    };
    //verify Delivery Man
    const verifyDelivery = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isDeliveryMan = user?.role === "DeliveryMan";
      if (!isDeliveryMan) {
        return res.status(403).send({ message: "forbidden-access" });
      }
      next();
    };

    //user
    //user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({ message: "User already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await userCollection.find(filter).toArray();
      res.send(result);
    });
    app.get("/all-users", verifyToken, verifyAdmin, async (req, res) => {
      // console.log(req.query);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;

      const totalUsers = await userCollection.countDocuments();
      const users = await userCollection
        .find()
        .skip(skip)
        .limit(limit)
        .toArray();

      res.send({ totalUsers, users });
    });

    app.patch("/user/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          name: user.name,
          age: user.age,
          phone: user.phone,
          address: user.address,
          photo: user.photo,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.patch(
      "/users/role/:id/:role",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const role = req.params.role;
        const filter = { _id: new ObjectId(id) };
        const updatedDoc = {
          $set: {
            role: role,
          },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      }
    );

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "access-forbidden" });
      }
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      let admin = false;
      if (user) {
        admin = user?.role === "Admin";
      }
      res.send({ admin });
    });
    app.get("/users/delivery/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "access-forbidden" });
      }
      const filter = { email: email };
      const user = await userCollection.findOne(filter);
      let deliveryMan = false;
      if (user) {
        deliveryMan = user?.role === "DeliveryMan";
      }
      res.send({ deliveryMan });
    });
    //delete user
    app.delete(
      "/users/delete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const result = await userCollection.deleteOne(filter);
        res.send(result);
      }
    );

    //parcel
    app.post("/parcels", verifyToken, async (req, res) => {
      const parcel = req.body;
      const result = await parcelCollection.insertOne(parcel);
      res.send(result);
    });
    app.get("/parcel/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await parcelCollection.findOne(query);
      res.send(result);
    });
    app.patch("/parcel/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const parcel = req.body;
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
          price: parcel.price,
        },
      };
      const result = await parcelCollection.updateOne(query, updatedDoc);
      res.send(result);
    });
    app.patch(
      "/manage-parcel/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const deliveryInfo = req.body;
        if (deliveryInfo.deliveryManId) {
          const query = { _id: new ObjectId(deliveryInfo.deliveryManId) };
          const deliveryMan = await userCollection.findOne(query);
          if (deliveryMan) {
            const updatedDoc = {
              $set: {
                deliveryName: deliveryMan.name,
                deliveryManId: deliveryInfo.deliveryManId,
                approxDeliveryDate: deliveryInfo.approxDelivery,
                deliveryEmail: deliveryMan.email,
                status: "InTransit",
              },
            };
            // console.log(result.name);
            const result = await parcelCollection.updateOne(filter, updatedDoc);
            res.send(result);
          }
        }
      }
    );

    //cancel parcel
    app.patch("/parcel/cancel/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "Cancelled",
        },
      };
      const result = await parcelCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/parcels", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await parcelCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/all-parcel", async (req, res) => {
      try {
        const { search, from, to } = req.query;
        const query = {};

        // Add search by name or number
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { number: { $regex: search, $options: "i" } },
          ];
        }

        // Add date range filter
        if (from && to) {
          const formattedFrom = moment(new Date(from), "YYYY-MM-DD").format(
            "DD/MM/YYYY"
          );
          const formattedTo = moment(new Date(to), "YYYY-MM-DD").format(
            "DD/MM/YYYY"
          );

          // Validate dates
          if (
            !moment(formattedFrom, "DD/MM/YYYY", true).isValid() ||
            !moment(formattedTo, "DD/MM/YYYY", true).isValid()
          ) {
            return res.status(400).json({ message: "Invalid date format" });
          }

          query.bookingDate = {
            $gte: formattedFrom,
            $lte: formattedTo,
          };
        } else if (from || to) {
          return res
            .status(400)
            .json({ message: "Both 'from' and 'to' dates are required" });
        }

        const result = await parcelCollection
          .find(query)
          .sort({ _id: -1 })
          .toArray();

        res.json(result);
      } catch (error) {
        console.error("Error fetching parcels:", error);
        res
          .status(500)
          .json({ message: error.message || "Failed to fetch parcels" });
      }
    });

    // find delivery man
    app.get("/delivery-men", verifyToken, verifyAdmin, async (req, res) => {
      const filter = { role: "DeliveryMan" };
      const result = await userCollection.find(filter).toArray();
      res.send(result);
    });

    //my delivery
    app.get("/my-delivery", verifyToken, verifyDelivery, async (req, res) => {
      const email = req.query.email;
      // console.log(email);
      const query = { deliveryEmail: email };
      const result = await parcelCollection.find(query).toArray();
      res.send(result);
    });

    app.post(
      "/deliveries/:id",
      verifyToken,
      verifyDelivery,
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const delivery = req.body;

        // console.log(delivery.deliveredManId);

        if (delivery.deliveredManId) {
          const filter = { _id: new ObjectId(delivery.deliveredManId) };
          const updateDeliveryMan = {
            $inc: { totalDelivered: 1 },
          };
          await userCollection.updateOne(filter, updateDeliveryMan);
        }

        if (query) {
          const updatedDoc = {
            $set: {
              status: "Delivered",
            },
          };
          await parcelCollection.updateOne(query, updatedDoc);
        }

        const finalResult = await deliveryCollection.insertOne(delivery);
        res.send(finalResult);
      }
    );

    app.get("/top-delivery-men", async (req, res) => {
      const filter = { role: "DeliveryMan" };
      const result = await userCollection
        .find(filter)
        .sort({ totalDelivered: -1 })
        .toArray();
      res.send(result);
    });

    //review
    app.post("/reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const reviewInfo = req.body;
      if (reviewInfo.deliveryManUID) {
        const userFilter = { _id: new ObjectId(reviewInfo.deliveryManUID) };
        const newReview = parseFloat(reviewInfo.rating);
        const updatedUserDoc = {
          $inc: {
            reviewCount: 1,
            totalRating: newReview,
          },
        };
        const userResult = await userCollection.updateOne(
          userFilter,
          updatedUserDoc
        );
      }
      if (reviewInfo.parcelStatus) {
        const updatedParcelDoc = {
          $set: {
            reviewStatus: reviewInfo.parcelStatus,
          },
        };
        const parcelResult = await parcelCollection.updateOne(
          filter,
          updatedParcelDoc
        );
      }
      const finalResult = await reviewCollection.insertOne(reviewInfo);
      res.send(finalResult);
    });
    // app.get('/reviews', async (req, res) => {
    //     const result = await reviewCollection.find().toArray()
    //     res.send(result)
    // })
    app.get("/reviews", verifyToken, verifyDelivery, async (req, res) => {
      const email = req.query.email;
      const filter = { deliveryManEmail: email };
      const result = await reviewCollection.find(filter).toArray();
      res.send(result);
    });

    //payment -stripe
    //stripe
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      // console.log(price);
      const amount = parseInt(price * 100);
      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      // console.log(payment);
      if (payment.parcelId) {
        const filter = { _id: new ObjectId(payment.parcelId) };
        const updatedStatus = {
          $set: {
            paymentStatus: payment.paymentStatus,
          },
        };
        const statusResult = await parcelCollection.updateOne(
          filter,
          updatedStatus
        );
      }
      const result = await paymentCollection.insertOne(payment);
      res.send(result);
    });
    app.get("/payment/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    //all stats
    app.get("/stats", async (req, res) => {
      const users = await userCollection.estimatedDocumentCount();
      const deliveries = await deliveryCollection.estimatedDocumentCount();
      const totalBooking = await parcelCollection.estimatedDocumentCount();

      const result = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: { $toDouble: "$price" } },
            },
          },
        ])
        .toArray();

      // console.log(result);
      const revenue = result.length > 0 ? result[0].totalRevenue : 0;
      res.send({ users, deliveries, totalBooking, revenue });
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("parcel ease server running");
});
app.listen(port, () => {
  console.log("server running on:", port);
});
