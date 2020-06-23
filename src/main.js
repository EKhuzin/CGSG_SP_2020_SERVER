const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io');
const server = io(http);
const PORT = process.env.PORT || 3000;

const Cars = new Map();

server.on('connection', function (socket) {
  let CarId;
  socket.on('newCar', async (id, x, z) => {
    Cars.forEach((c) => {
      server.to(socket.id).emit('newCar', c.id, c.x, c.z);
    });
    CarId = id;
    server.emit('newCar', id, x, z);
    Cars.set(id, { id: id, x: x, z: z });
  });

  socket.on('carMoveTo', async (id, x, z) => {
    socket.broadcast.emit('carMoveTo', id, x, z);
    const tmp = Cars.get(id);
    if (tmp !== undefined) { tmp.x = x; tmp.z = z; }
  });

  socket.on('disconnecting', () => {
    if (CarId !== undefined) { Cars.delete(CarId); }
    socket.broadcast.emit('leaveCar', CarId);
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Game-server</h1>');
});

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
