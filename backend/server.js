// Minimal server.js for testing
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: '*',
  credentials: false
}));

app.get("/", (req, res) => {
  res.json({ status: "Minimal server working!" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
