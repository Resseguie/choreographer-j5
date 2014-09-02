var app = require("express")()
  , http = require("http").Server(app)
  , io = require("socket.io")(http)
  , randomString = require("randomstring")
  , Q = require("q")

  // Our nodebot
  , five = require("johnny-five")
  //, Spark = require("spark-io")
  , board = new five.Board()

/*
  , board = new five.Board({
    io: new Spark({
      token: process.env.SPARK_TOKEN,
      deviceId: process.env.SPARK_DEVICE_ID
    })
  })
*/
  , servos = {}

  // Keep track of waiting commands to execute
  , queue = []
  , commands = {}
  , commandMap
;


/**
 * Executes next command (if available)
 * then recursively calls itself to check
 * for new commands that have come in
 */
function executeNext() {

  if(queue.length === 0) {
    // Nothing there, so let"s wait a bit to try again
    setTimeout(executeNext, 1000);
    return;
  }

  // Get next command from queue
  var id = queue.shift();
  var cmd = commands[id];
  delete commands[id];

  // Send command sequence to Nodebot
  io.emit("command-running", cmd);
  runCommand(cmd.command)
  .then(function() {
    io.emit("command-finished", cmd);
    executeNext();
  });
  
}

function runCommand(command) {

  // Convert command string to array of functions to call
  var command = command.toUpperCase()
    , sequence = command.split("")
    , funcs = []
    , result;

  for(var i=0; i<sequence.length; i++) {
    var cFunction = commandMap[sequence[i]];
    if(cFunction){
      funcs.push(cFunction);  
    }
    
  }

  // Asynchronously call funcs in a sequence
  result = Q();
  funcs.forEach(function (f) {
    result = result.then(
      function() {
        return executeForTime(f,1000);
      }
    );
  });

  // Stop the wheels at the end of the sequence
  result.then(function(){
    servos.both.stop();
  });

  return result;

}

// Makes a function call and waits ms to resolve
var executeForTime = function(func, ms) {
  var deferred = Q.defer();

  func.call();

  Q.delay(ms).then(function() {
    deferred.resolve();
  });

  return deferred.promise;
};

var driveForward = function() {
  servos.both.cw(1);
};

var driveBackward = function() {
  servos.both.ccw(1);
};

var turnLeft = function() {
  servos.left.cw(0.5);
  servos.right.ccw(0.5);
};

var turnRight = function() {
  servos.left.ccw(0.5);
  servos.right.cw(0.5);
};

var stopDriving = function() {
  servos.both.stop();
};


// Map command characters to implementation functions
commandMap = {
    "F": driveForward
  , "B": driveBackward
  , "L": turnLeft
  , "R": turnRight
  , "S": stopDriving
}


// Listen for new web connections that may send command sequences
io.on("connection", function(socket) {

  socket.on("command-new", function(cmd) {
    // TODO error check valid commands

    // Add to nodebot queue
    var id = randomString.generate();

    queue.push(id);
    commands[id] = {
      id: id
    , command: cmd
    };

    // Send command back to listening browsers
    io.emit("command-new", commands[id]);
      
  });

});

// Server for serving up the web app
app.get("/", function(req, res) {
  res.sendfile("index.html");
});

http.listen(3000, function() {
  console.log("listening on *:3000");
});


// Start checking for incoming commands
board.on("ready", function() {
  servos.right = new five.Servo({ pin:  9, type: 'continuous' });
  servos.left = new five.Servo({ pin: 10, type: 'continuous', isInverted: true });
  servos.both = five.Servos();
  servos.both.stop();

  this.repl.inject({
    both: servos.both
  , left: servos.left
  , right: servos.right
  });

  executeNext();
});
