const LAND_SIDE = 128;
const LAND_SIDEP1 = LAND_SIDE + 1;
const LAND_MAX_H = 150;

const randCache = [];

function getCertainH (lx, lz) {
  let value;
  if (randCache[lx] !== undefined) {
    if (randCache[lx][lz] !== undefined) {
      return randCache[lx][lz];
    }
    value = Math.random() * LAND_MAX_H;
    randCache[lx][lz] = value;
    return value;
  }
  value = Math.random() * LAND_MAX_H;
  randCache[lx] = {};
  randCache[lx][lz] = value;
  return value;
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

var app = require('express')();
var http = require('http').createServer(app);
const io = require('socket.io');
const server = io.listen(3000);
const PORT = process.env.PORT || 3000;

console.log('start');

const LandAttributes = new GetLandAttributes();
server.on('connection', function (socket) {
  socket.on('carMove', function (msg) { console.log(socket.id, msg); });
  socket.on('getLand', function (lx, lz) {
    const tmp = LandAttributes.getXZ(lx, lz);
    server.emit('addLand', tmp.ys, lx, lz);
  });
});

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>');
});

http.listen(PORT, () => {
  console.log('listening on *:3000');
});
