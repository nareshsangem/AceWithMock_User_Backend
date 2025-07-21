const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');   
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();

app.use(cors({
  origin: ["https://acewithmock.netlify.app"],
  credentials: true,
}));

app.use(bodyParser.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Backend is live ✅");
});

// Routes
app.use('/user', require('./routers/userAuthRouter'));
app.use('/category', require('./routers/testCategoryRouter'));
app.use('/protected', require('./routers/protectedRouter'));
app.use('/tests', require('./routers/testsRouter'));
app.use('/attempt', require('./routers/userTestsAttempt'));
app.use('/pdf', require('./routers/resultRouter'));
app.use('/analytics', require('./routers/userTracks'));
app.use('/public', require('./routers/landingPageRouters'));

// Use dynamic port for Render
const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`server running at ${PORT}`);
});
