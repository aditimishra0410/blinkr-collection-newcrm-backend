import  dotenv  from "dotenv";

dotenv.config()
const required = ["PORT", "NODE_ENV"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.log("missing env variables: " + missing.join(", "));
  process.exit(1);
}
const env = {
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,
};
console.log("Env loaded successfully");
export default env;
