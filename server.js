import express from "express";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// ✅ Database connection pool
const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// ✅ Add School API (POST /addSchool)
app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Validation
  if (!name || !address || isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ message: "Invalid input data" });
  }

  try {
    const [result] = await db.query(
      "INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)",
      [name, address, latitude, longitude]
    );
    res.status(201).json({
      message: "School added successfully",
      id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ List Schools API (GET /listSchools?latitude=xx&longitude=yy)
app.get("/listSchools", async (req, res) => {
  const { latitude, longitude } = req.query;

  if (isNaN(latitude) || isNaN(longitude)) {
    return res.status(400).json({ message: "Invalid coordinates" });
  }

  try {
    const [schools] = await db.query("SELECT * FROM schools");

    // Distance calculation (Haversine formula)
    const toRad = (value) => (value * Math.PI) / 180;
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    const sortedSchools = schools.map((school) => {
      const dLat = toRad(school.latitude - userLat);
      const dLon = toRad(school.longitude - userLon);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(userLat)) *
          Math.cos(toRad(school.latitude)) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = 6371 * c; // in km
      return { ...school, distance: distance.toFixed(2) };
    });

    sortedSchools.sort((a, b) => a.distance - b.distance);
    res.json(sortedSchools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Start Server
app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on port ${process.env.PORT}`);
});
