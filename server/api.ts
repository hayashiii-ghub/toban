import { Hono } from "hono";
import { cors } from "hono/cors";
import scheduleRoutes from "./routes/schedules";

type Env = { Bindings: { DB: D1Database } };

const app = new Hono<Env>();

app.use("/api/*", cors());
app.route("/api/schedules", scheduleRoutes);

export default app;
