const express = require("express");
const app = express();
require("dotenv").config();
const db = require("./config/db");
const cors = require("cors");

// Connect to the database
db();

// Middleware setup
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(`${__dirname}`));

// Route setup
app.get("/", (req, res) => res.send("Home"));
app.use("/entry", require("./routes/entryRoutes"));
app.use("/nft", require("./routes/nftRoutes"));
app.use("/user", require("./routes/userRoutes"));
app.use("/merch", require("./routes/merchRoutes"));
app.use("/trade", require("./routes/tradeRoutes"));
app.use("/cart", require("./routes/cartRoutes"));
app.use("/currency", require("./routes/currencyRoutes"));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`APP RUNNING on port ${PORT}`));
