import fs from "node:fs";
import path from "node:path";
import pool from "./pool";

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");

  try {
    await pool.query(schema);
    console.log("Database schema initialized");
  } catch (err) {
    console.error("Failed to initialized schema: ", err);
  } finally {
    await pool.end();
  }
}

init();
