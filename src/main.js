const LAND_SIDE = 128;
const LAND_SIDEP1 = LAND_SIDE + 1;
const LAND_STEP_H = 80;

const randCache = [];

function getCertainH (lx, lz) {
  let value, x, z;
  if (randCache[lx] !== undefined) {
    if (randCache[lx][lz] !== undefined) { return randCache[lx][lz]; }
  } else { randCache[lx] = {}; }

  let cnt = 0;
  for (x = -1; x <= 1; x++) {
    if (randCache[lx + x] !== undefined) {
      for (z = -1; z <= 1; z++) {
        if (randCache[lx + x][lz + z] !== undefined) {
          if (value === undefined) { value = 0; }
          value += randCache[lx + x][lz + z]; // + (Math.random() * 2 - 1) * LAND_STEP_H;
          cnt++;
        }
      }
    }
  }

  if (value !== undefined) {
    value /= cnt;
    randCache[lx][lz] = value + (Math.random() * 2 - 1) * LAND_STEP_H;
  } else {
    randCache[lx][lz] = (Math.random() * 2 - 1) * LAND_STEP_H;
  }
  return randCache[lx][lz];
}

function createGetH (landX, landZ) {
  let k, a, c;
  const LU = getCertainH(landX - 1, landZ + 1);
  const RU = getCertainH(landX + 1, landZ + 1);
  const LB = getCertainH(landX - 1, landZ - 1);
  const RB = getCertainH(landX + 1, landZ - 1);
  const U = getCertainH(landX, landZ + 1);
  const R = getCertainH(landX + 1, landZ);
  const L = getCertainH(landX - 1, landZ);
  const BU = getCertainH(landX, landZ - 1);
  const CR = getCertainH(landX, landZ);

  const A = LU;
  const B = RU;
  const C = RB;
  const D = LB;
  const As = L;
  const Bs = U;
  const Cs = R;
  const Ds = BU;
  return function (x, z) {
    x /= LAND_SIDE / 2;
    z /= LAND_SIDE / 2;
    if (x <= 1 && z <= 1) {
      x /= 2; x += 0.5;
      z /= 2; z += 0.5;
      k = (3 - 2 * x) * x * x;
      a = As * (1 - k) + CR * k;
      c = D * (1 - k) + Ds * k;
      k = (3 - 2 * z) * z * z;
    } else if (x > 1 && z <= 1) {
      x--; x /= 2;
      z /= 2; z += 0.5;
      k = (3 - 2 * x) * x * x;
      a = CR * (1 - k) + Cs * k;
      c = Ds * (1 - k) + C * k;
      k = (3 - 2 * z) * z * z;
    } else if (x > 1 && z > 1) {
      x--; x /= 2;
      z--; z /= 2;
      k = (3 - 2 * x) * x * x;
      a = Bs * (1 - k) + B * k;
      c = CR * (1 - k) + Cs * k;
      k = (3 - 2 * z) * z * z;
    } else if (x <= 1 && z > 1) {
      x /= 2; x += 0.5;
      z--; z /= 2;
      k = (3 - 2 * x) * x * x;
      a = A * (1 - k) + Bs * k;
      c = As * (1 - k) + CR * k;
      k = (3 - 2 * z) * z * z;
    }
    return c * (1 - k) + a * k;
  };
}

function _genXZ (landX, landZ) {
  const getHeight = createGetH(landX, landZ);
  const geometry = {};
  geometry.ys = [];
  let y; let x; let z;
  for (z = 0; z < LAND_SIDEP1; z++) {
    for (x = 0; x < LAND_SIDEP1; x++) {
      y = getHeight(x, z);
      geometry.ys.push(y);
    }
  }
  return geometry;
}

const bufLandsAttributes = {};

class GetLandAttributes {
  getXZ (lx, lz) {
    if (bufLandsAttributes[lx] === undefined) {
      bufLandsAttributes[lx] = {};
      bufLandsAttributes[lx][lz] = _genXZ(lx, lz);
    } else if (bufLandsAttributes[lx][lz] === undefined) {
      bufLandsAttributes[lx][lz] = _genXZ(lx, lz);
    }
    return bufLandsAttributes[lx][lz];
  }
}

const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io');
const server = io(http);
const PORT = process.env.PORT || 3000;

console.log('start');

const SERVER_URL =
'localhost:3000';
// 'https://warm-woodland-80018.herokuapp.com/';

const Cars = new Set();

const LandAttributes = new GetLandAttributes();

randCache[0] = {};
randCache[0][0] = Math.random() * LAND_STEP_H;
server.on('connection', function (socket) {
  socket.on('newCar', (id) => {
    Cars.add(id);
    server.of('/' + id).on('connect', (newCarSocket) => {
      newCarSocket.on('carMoveTo', (x, z) => {
        newCarSocket.broadcast.emit('carMoveTo', x, z);
      });
    });
    // server.emit('newCar', SERVER_URL + '/' + id, 0, 0);
    Cars.forEach((i) => {
      server.to(socket.id).emit('newCar', SERVER_URL + '/' + i, 0, 0);
    });
  });
  socket.on('getLand', async function (lx, lz) {
    const tmp = LandAttributes.getXZ(lx, lz);
    server.emit('addLand', tmp.ys, lx, lz);
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Data-server</h1>');
});

http.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
