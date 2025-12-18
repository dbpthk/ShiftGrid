import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const neonSql = neon(process.env.DATABASE_URL);

const client = async (query, params, options) => {
  return neonSql.query(query, params, options);
};

client.transaction = (...args) => neonSql.transaction(...args);

const db = drizzle(client, { schema });

export default db;
