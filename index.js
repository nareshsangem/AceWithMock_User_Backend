const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');   
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser'); // ✅ REQUIRED

dotenv.config();

const app = express();

// ✅ Middleware
app.use(cors({
  origin: "https://acewithmock.netlify.app",
  credentials: true,
}));

app.use(bodyParser.json());
app.use(cookieParser()); // ✅ This line enables req.cookies

// ✅ Import routes
const userAuthRoutes = require('./routers/userAuthRouter');
const categoryRoutes = require('./routers/testCategoryRouter');
const ProtectedRoutes = require('./routers/protectedRouter');
const testRoutes = require('./routers/testsRouter');
const userTestsAttempt = require('./routers/userTestsAttempt');
const ResultsRoutes  = require('./routers/resultRouter');
const userTracks = require('./routers/userTracks');
const landingPageRoutes = require('./routers/landingPageRouters');

// ✅ Use routes
app.use('/user', userAuthRoutes);
app.use('/category', categoryRoutes);
app.use('/protected', ProtectedRoutes);
app.use('/tests', testRoutes);
app.use('/attempt', userTestsAttempt);
app.use('/pdf', ResultsRoutes);
app.use('/analytics', userTracks);
app.use('/public', landingPageRoutes);
// ✅ Start server
const PORT = 5006;
app.listen(PORT, () => {
  console.log(`server running at ${PORT}`);
});
