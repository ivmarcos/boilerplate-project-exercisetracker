require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
});

const exerciseSchema = new mongoose.Schema({
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      required: false
    },
})

const User = mongoose.model('User', userSchema)
const Exercise = mongoose.model('Exercise', exerciseSchema);


app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: "false" }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const user = await User.create({username: req.body.username})
  res.send(user);
});

app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.send(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const [exercise, user] = await Promise.all([
    Exercise.create({
      user: req.params._id,
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date ? new Date(`${req.body.date}:00:00:00:000`) : new Date()
    }), 
    User.findById(req.params._id)
  ]);
  const result =   {
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date?.toDateString(),
    _id: user._id,
  }
  res.send(result);
});

const buildQueryParams = (req) => {
  let queryParams = {
    user: req.params._id,
  };
  if (req.query.to){
    queryParams = {
      ...queryParams,
      date: {
        $lte: req.query.to
      }
    }
  }
  if (req.query.from){
    queryParams = {
      ...queryParams,
      date: {
        ...queryParams.date,
        $gte: req.query.from
      }
    }
  }
  return queryParams
}

app.get('/api/users/:_id/logs', async (req, res) => {
  const queryParams = buildQueryParams(req);
  const [exercises, user] = await Promise.all([
    Exercise.find(queryParams).limit(req.query.limit ? Number(req.query.limit) : undefined).exec(),
    User.findById(req.params._id),
  ]);
  const result = {
    username: user.username,
    _id: user._id,
    count: exercises.length,
    log: exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date?.toDateString()
    }))
  }
  res.send(result); 
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
  User.deleteMany();
  Exercise.deleteMany();
})
