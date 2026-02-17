const process = require("./module_server");

const ip = require("ip");
const server_host = ip.address();
const server_port = 1884;
const server = require("aedes")();
const host = require("net").createServer(server.handle);

host.listen(server_port, function () {
  console.log(`Server is running on [${server_host}:${server_port}]`);
});

server.on("client", function (client) {
  console.log(`Gateway [${client.conn.remoteAddress}] connected`);
});
server.on("clientDisconnect", function (client) {
  console.log(`Gateway [${client.conn.remoteAddress}] disconnected`);
});
server.on("subscribe", function (subscriptions, client) {
  console.log(
    `Gateway [${client.conn.remoteAddress}] subscribed topic [${JSON.stringify(
      subscriptions
    )}]`
  );
});

server.on("publish", function (packet, client) {
  // Process message function
  process.process_message(packet, client, server);
});
