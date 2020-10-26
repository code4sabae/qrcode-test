import QRCode from "qrcode";

const createText = async (text) => {
  return new Promise((resolve, reject) => {
    const option = {
      errorCorrectionLevel: "L", // L, M, Q, H
      type: "utf8",
      //type: "terminal",
    };
    QRCode.toString(text, option, (error, string) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(string);
    })
  });
};

const C0 = 32;
const C1 = 9600;
const C2 = 9604;
const C3 = 9608;
const CLIST = [
  C0, C0,
  C1, C0,
  C0, C1,
  C1, C1,
  C2, C0,
  C3, C0,
  C2, C1,
  C3, C1,
  C0, C2,
  C1, C2,
  C0, C3,
  C1, C3,
  C2, C2,
  C3, C2,
  C2, C3,
  C3, C3,
];

const utf8toij = (s) => {
  const invert = true;
  const rem = true;
  const res = [];
  if (rem) {
    res.push("'".charCodeAt(0));
  }
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 10) {
      res.push(10);
      res.push("'".charCodeAt(0));
      continue;
    }
    const c2 = s.charCodeAt(++i);
    if (c2 === 10 || isNaN(c2)) {
      // res.push(invert ? 0x8f : 0x80);
      res.push(10);
      res.push("'".charCodeAt(0));
      continue;
    }
    let flg = false;
    for (let i = 0; i < CLIST.length; i += 2) {
      if (c === CLIST[i] && c2 === CLIST[i + 1]) {
        const n = i / 2;
        res.push(0x80 + (invert ? 15 - n : n));
        flg = true;
        break;
      }
    }
    if (!flg) {
      console.log(c, c2);
      console.log(CLIST.length);
      throw new Error();
    }
  }
  const ba = new Uint8Array(res.length - 1);
  for (let i = 0; i < ba.length; i++) {
    ba[i] = res[i];
  }
  return ba;
};

const bin2poke = (bin) => {
  let ad = 0x900;
  let line = 1;
  let s = line + "0 POKE#900";
  let res = "";
  for (let i = 0; i < bin.length; i++) {
    let n = bin[i];
    if (n == 10) {
      res += s + "\n";
      s = (line + 1) + "0 POKE#" + (ad + line * 32).toString(16);
      line++;
      continue;
    }
    s += "," + n;
  }
  return res;
};

const createTextIJ = async (s) => {
  const qr = await createText(s);
  const bin = utf8toij(qr);
  return bin;
};

const test = async () => {
  const qr = await createText("IchigoJam");
  console.log(qr);
  for (let i = 0; i < qr.length; i++) {
    console.log(i, qr.charCodeAt(i), qr.charAt(i));
  }
  const bin = utf8toij(qr);
  const poke = bin2poke(bin);
  console.log(poke);
};
// test();

import http from "http";
const server = http.createServer();

server.on("request", async (req, res) => {
  const url = req.url;
  const err = (s) => {
    res.writeHead(200, {
      "Content-Type" : "text/plain",
      "Access-Control-Allow-Origin": "*",
    });
    res.write("'" + s);
    res.end();
  };
  const n = url.indexOf("/?");
  if (n < 0) {
    err("err");
    return;
  }
  const param = decodeURIComponent(url.substring(n + 2));
  console.log(param);
  if (param.length > 255) {
    err("len < 256");
    return;
  }
  res.writeHead(200, {
    "Content-Type" : "text/plain",
    "Access-Control-Allow-Origin": "*",
  });
  const bin = await createTextIJ(param);
  res.write(Buffer.from(bin));
  res.end();
});

server.listen(3000);
