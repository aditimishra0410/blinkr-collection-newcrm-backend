import app from "./app.js";

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

// process.on("SIGINT", () => {
//   console.log("Server is shutting down")
//   server.close(() => {
//     process.exit(0)
//   })
// })

function shutdown(signal) {
  console.log(`Received signal ${signal}, shutting down`)
  server.close(() => {
    process.exit(0);
  })
}
process.on("SIGINT", () => shutdown("SIGINT"))
process.on("SIGTERM", () => shutdown("SIGTERM"))
