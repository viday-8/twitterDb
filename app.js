const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();

app.use(express.json());

const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`Db Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//API 1

app.post("/register", async (request, response) => {
  const bookDetails = request.body;
  const { username, password, name, gender } = bookDetails;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (password.length < 6) {
    response.send("Password is too short");
  } else {
    if (dbUser === undefined) {
      const registerUser = `
  INSERT INTO
  user (username,password,name,gender)
  VALUES
  (
      '${username}',
      '${hashedPassword}',
      '${name}',
      '${gender}'
  )
  `;
      const dbResponse = await db.run(registerUser);
      const newUserId = dbResponse.lastID;
      response.send("User created successfully");
    } else {
      response.status = 400;
      response.send("User already exists");
    }
  }
});

// API 2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

// JWT MiddleWare

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

// API 3

app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  const getTweetFeedQuery = `
   SELECT
    username,tweet,date_time AS date
   FROM
    user NATURAL JOIN tweet
   ORDER BY
    date_time
    LIMIT 4`;
  const TweetFeedArray = await db.all(getTweetFeedQuery);
  response.send(TweetFeedArray);
});

// API 4

app.get("/user/following", authenticateToken, async (request, response) => {
  const getTweetFeedQuery = `
   SELECT
    DISTINCT name
   FROM
    user INNER JOIN follower ON user.user_id = follower.following_user_id 
   `;
  const TweetFeedArray = await db.all(getTweetFeedQuery);
  response.send(TweetFeedArray);
});

// API 5

app.get("/user/followers", authenticateToken, async (request, response) => {
  const getTweetFeedQuery = `
   SELECT
    DISTINCT name
   FROM
   `;
  const TweetFeedArray = await db.all(getTweetFeedQuery);
  response.send(TweetFeedArray);
});

// API 6

app.get("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const tweetId = request.params;
  const id = tweetId.tweetId;
  const getTweetFeedQuery = `
   SELECT
    DISTINCT(tweet), COUNT(reply_id) AS replies, COUNT(like_id) AS likes,date_time AS dateTime
   FROM
    (((user INNER JOIN follower ON user.user_id = follower.following_user_id) AS UF NATURAL JOIN tweet) AS UFT NATURAL JOIN reply ) AS UFTR NATURAL JOIN like
    WHERE tweet_id = ${id}
    GROUP BY tweet_id
    `;
  const TweetFeedArray = await db.all(getTweetFeedQuery);
  if (TweetFeedArray.length !== 0) {
    response.send(TweetFeedArray);
  } else {
    response.status(401);
    response.send("Invalid Request");
  }
});

// API 7

app.get(
  "/tweets/:tweetId/likes",
  authenticateToken,
  async (request, response) => {
    const tweetId = request.params;
    const id = tweetId.tweetId;
    const getTweetFeedQuery = `
   SELECT
    *
   FROM
    follower
    
    `;
    const TweetFeedArray = await db.all(getTweetFeedQuery);
    console.log(TweetFeedArray);
    if (TweetFeedArray.length !== 0) {
      response.send(TweetFeedArray);
    } else {
      response.status(401);
      response.send("Invalid Request");
    }
  }
);

module.exports = app;
