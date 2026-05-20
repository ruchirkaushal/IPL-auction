const { io } = require("socket.io-client");
const socket = io("http://localhost:3005");
socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("create_room", { playerName: "TestUser" });
});
socket.on("room_created", (data) => {
  console.log("Room Created:", data);
});
socket.on("room_state_update", (data) => {
  console.log("Room State:", data.roomCode, data.players);
  setTimeout(() => process.exit(0), 1000);
});
