const express=require('express');
const app=express();
const mongoose=require('mongoose');
const PORT=process.env.PORT || 3000;

const {MONGO_USER,MONGO_PASS,MONGO_IP,MONGO_PORT,REDIS_URL,REDIS_PORT,SESSION_SECRET} = require('./config/config');

// redis config
const session = require('express-session');
const redis = require('redis');
const cors = require('cors');
let RedisStore = require('connect-redis')(session);
let redisClient = redis.createClient({
  host : REDIS_URL,
  port : REDIS_PORT
})


const mongoURL = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_IP}:${MONGO_PORT}/?authSource=admin`;

// routes
const postRouter = require("./routes/postRoutes");
const userRouter = require("./routes/userRoutes");


// mongoose has inbuilt 30 second rule where it tries to connect to mongo
// though if you have an application dependent on each other like mongo and node this a rough way to actually make sure that our mongo connects first so as to avoid errors.
const connectWithRetry = () =>{
  // can get the IP address of mongo container via 'docker inspect container_name' under networks section
  mongoose.connect(
    mongoURL,{useNewUrlParser: true,useUnifiedTopology: true,useFindAndModify:false,useCreateIndex:true}
  )// IP address:Port(on which mongo runs default is 27017)
  .then(()=>{console.log('Connected to MongoDB 🎉via Docker Container')})
  .catch((err)=>{
    console.log(err);
    // however this is not a best practice
    setTimeout(connectWithRetry,5000);
  });

}

connectWithRetry();

// This lines bascially tells the server to trust the nginx to add certain things to header
// It can be used to access the IP address of the client making the request can be used for rate limiting
app.enable('trust proxy');

app.use(cors({}));

//session middleware
app.use(session({
  store: new RedisStore({client:redisClient}),
  secret: SESSION_SECRET,
  cookie: {
    secure: false,// if set to true then it can only work with https for that you need to understand how wo set up ssl.In production this must be set to true in dev to false.
    resave: false,
    saveUninitialized: false,
    httpOnly: true,// means this cookie should be only accessed by server so that document.cookie wont work at client side.
    maxAge: 60000 //lasts for 60 seconds
  }
}));

app.use(express.json());

app.get('/api/v1',(req,res)=>{
  res.send("<h1>Inside Docker Development✨✨</h1>");
  console.log('Yes, Scaled Up 🎈🎈 by adding a new node container!!');
});

app.use("/api/v1/posts",postRouter);
app.use("/api/v1/users",userRouter);


app.listen(PORT,process.env.IP,()=>{console.log(`Server Started at ${PORT}`)});
