# ChoreographerJ5

Sets up a Nodebot that listens for commands via socket.io coming from a simple web application.

## Usage

``` bash
$ node index
```

Then open a web browser to localhost:3000 to access the command input window.

The web application accepts strings of commands via the input box.

Valid commands are "F" (forward), "B" (backward), "L" (left), "R" (right), and "S" (stop)

Each command runs for 1 second. So, to drive forward two seconds, pause 1 second, and drive backwards two seconds, you would enter: FFSBB

The web application shows the current commands in the queue (highlighting the one that's active).

Expects a Nodebot with servos (wheels) on pins 9 and 10. (Note, depending on how they are mounted, you may have to adjust the isInverted option.)
