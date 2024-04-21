/**
 *  The brick breaker application
 *
 *  @namespace BrickBreaker
 */
BrickBreaker = new (function () {
   //########################################
   //Private member variables
   //########################################

   //DOM Nodes
   var DOM = {
      platform: document.getElementById("platform"),
      ball: document.getElementById("ball"),
      bricks: document.getElementById("bricks"),
      message: document.getElementById("message"),
      container: {
         el: document.getElementById("container"),
         rect: document.getElementById("container").getBoundingClientRect(),
      },
      score: document.getElementById("score").querySelector("span"),
      lives: document.getElementById("lives").querySelector("span"),
   };

   let platformWidth = 160;
   let animId;

   //Messages
   var messages = {
      start: "Press the spacebar to start the game",
      round_win: "Round won! Press the spacebar to go to the next level",
      won: "You've won! Press the spacebar to play again",
      lost: "Uh Oh you lost! Press the spacebar to play again",
   };

   /**
    *  Each level contains 4 rows of at most 8 bricks
    *
    *  Brick Values:
    *    0: none
    *    1: default
    *    2: strong block (2 hits needed)
    *    3: invuln block
    */
   var levels = [
      //Starting level
      [
         [0, 3, 1, 1, 1, 1, 0, 0],
         [0, 1, 1, 2, 2, 1, 1, 0],
         [0, 1, 1, 1, 1, 1, 1, 0],
         [0, 0, 1, 1, 1, 1, 0, 0],
      ],

      //Mid Level
      [
         [0, 0, 2, 1, 1, 1, 0, 0],
         [0, 1, 2, 2, 2, 2, 1, 0],
         [1, 2, 2, 3, 3, 2, 2, 1],
         [2, 1, 2, 2, 2, 2, 1, 2],
         [0, 3, 1, 2, 2, 1, 3, 0],
      ],

      //Avd Level
      [
         [0, 0, 1, 3, 1, 1, 0, 0],
         [2, 0, 1, 1, 1, 0, 2, 0],
         [2, 2, 1, 2, 2, 1, 2, 2],
         [2, 2, 2, 3, 3, 2, 2, 2],
         [3, 1, 3, 3, 3, 3, 1, 3],
      ],
   ];

   //Current level index
   var current_level = 0;

   //Is the game in progress?
   var in_progress = false;

   /**
    *  When building the bricks based on the level, use this array to store brick info
    *
    *  Each item in the array should match the following format:
    *
    *  {
    *    elem: The HTMLElement
    *    rect: The rect provided by getBoundingClientRect(),
    *    type: The brick type:
    *      1: default
    *      2: strong
    *      3: invuln block
    *  }
    */
   var bricksActive = 0;

   /**
    *  Keep track of the ball and platform directions
    *
    *  Value:
    *    -1: Ball or platform moving left
    *    0: Ball or platform not moving
    *    1: Ball or platform moving right
    */
   var tracking = {
      ball_x: 1,
      ball_y: 1,
      plat_x: 0,
   };

   /**
    *  Modify the speed of the ball or platform
    *  A frame is rendered at roughly 60fps
    *
    *  1 second of movement = modifier * 60
    */
   var modifiers = {
      ball_x: 17,
      ball_y: 17,
      plat_x: 25,
   };

   //########################################
   //Private member functions
   //########################################

   /**
    *  Initialize our first level
    *
    *  @private
    *
    *  @return {undefined}
    */
   function initialize() {
      showMessage("start");
   }

   /**
    *  Start the brick breaker game
    *
    *  @return {undefined}
    */
   function start(arg_message) {
      console.log(current_level);
      showMessage(null);
      DOM.ball.style.display = "block";
      DOM.platform.style.left = 0;

      DOM.ball.style.top = DOM.platform.offsetTop - 40 + "px";
      DOM.ball.style.left = DOM.platform.offsetLeft + 12 + "px";

      //Build the bricks
      buildBricks(current_level);

      in_progress = true;
      animId = window.requestAnimationFrame(doAnimate);
   }

   /**
    *  Reset the game
    *
    *  @private
    *
    *  @return {undefined}
    */
   function reset(message) {
      in_progress = false;
      showMessage(message);
      current_level = 0;
      bricksActive = 0;
      modifiers = {
         ball_x: 17,
         ball_y: 17,
         plat_x: 25,
      };

      DOM.ball.style.display = "none";
      const bricks = document.querySelectorAll("#bricks > div");
      for (let brick of bricks) {
         brick.parentNode.removeChild(brick);
      }
   }

   function gameOver() {
      window.cancelAnimationFrame(animId);
      reset("lost");
   }

   function moveToNextLevel() {
      window.cancelAnimationFrame(animId);
      showMessage("round_win");
      in_progress = false;

      current_level += 1;
      if (current_level > 2) {
         reset("won");
      } else {
         modifiers.ball_x += 2;
         modifiers.ball_y += 2;
         modifiers.plat_x += 3;
         DOM.ball.style.display = "none";
         const bricks = document.querySelectorAll("#bricks > div");
         for (let brick of bricks) {
            brick.parentNode.removeChild(brick);
         }
      }
   }

   /**
    *  Show a message
    *
    *  @private
    *
    *  @param  {string} arg_message The message key to display, null hides the message
    *
    *  @return {undefined}
    */
   function showMessage(arg_message) {
      var message = messages[arg_message];
      if (!message) return DOM.message.classList.remove("active");

      DOM.message.innerHTML = message;
      DOM.message.classList.add("active");
   }

   /**
    *  Build the brick DOM nodes for the current level
    *
    *  @private
    *
    *  @return {undefined}
    */
   function buildBricks(currentLevel) {
      const level = levels[currentLevel];
      let row = {
         x: (DOM.container.rect.width % 160) / 2,
         y: 60,
      };

      let skip = false;

      for (let i = 0; i < level.length; i++) {
         const array = level[i];
         for (let j = 0; j < array.length; j++) {
            const type = array[j];
            if (row.x > DOM.container.rect.width - 160) {
               row.y += 60;
               if (row.y > DOM.container.rect.height / 2) {
                  skip = true;
               }
               row.x = (DOM.container.rect.width % 160) / 2;
            }

            if (!skip) {
               createBrick(row, type);
               row.x += 160;
            }
         }
      }

      /**
       *  TODO:
       *
       *  When adding elements to the <div id="bricks"> container follow this format:
       *    No Brick: <div class="empty"></div>
       *    Normal Brick: <div></div>
       *    Strong Brick: <div class="strong"></div>
       *    Strong HIT Brick: <div class="strong hit"></div>
       *    Invuln Brick: <div class="invuln"></div>
       *
       *  Be sure to:
       *    - Add brick elements to container
       *    - Set classes as needed
       *    - Store brick information in the bricks[] array
       */
   }

   function createBrick(pos, type) {
      const brick = document.createElement("div");
      brick.style.top = pos.y + "px";
      brick.style.left = pos.x + "px";
      switch (type) {
         case 0:
            brick.classList.add("empty");
            DOM.bricks.appendChild(brick);
            break;
         case 1:
            console.log("work");
            bricksActive += 1;
            DOM.bricks.appendChild(brick);
            break;
         case 2:
            console.log("work2");
            brick.classList.add("strong");
            bricksActive += 1;
            DOM.bricks.appendChild(brick);
            break;
         case 3:
            brick.classList.add("invuln");
            DOM.bricks.appendChild(brick);
            break;
      }
   }

   //########################################
   //Collision Detection
   //########################################

   /**
    *  Are two rects intersecting?
    *
    *  @private
    *
    *  @param  {object} arg_r1 The first rect
    *  @param  {object} arg_r2 The second rect
    *
    *  @return {boolean} True if they intersect, false otherwise
    */
   function isIntersecting(a, b) {
      let aRect = a.getBoundingClientRect();
      let bRect = b.getBoundingClientRect();

      let tempX = !(aRect.right < bRect.left || aRect.left > bRect.right);
      let tempY = !(aRect.bottom < bRect.top || aRect.top > bRect.bottom);

      return tempX && tempY;
   }

   /**
    *  Should the ball reverse the X direction when it hits/intersects with another object
    *
    *  @private
    *
    *  @param  {object} arg_brect The ball rect
    *  @param  {object} arg_orect The object rect
    *
    *  @return {boolean} True if the ball should reverse direction, false otherwise
    */
   function shouldReverseX(ballX) {
      var reverse = false;

      if (ballX > DOM.container.rect.width - 12 || ballX < 0) {
         reverse = true;
      }

      //Hit right or left side?
      //TODO

      //If we hit the object center mass DONT reverse the direction of the ball
      //TODO

      return reverse;
   }

   /**
    *  Should the ball reverse the Y direction when it hits/intersects with another object
    *
    *  @private
    *
    *  @param  {object} arg_brect The ball rect
    *  @param  {object} arg_orect The object rect
    *
    *  @return {boolean} True if the ball should reverse direction, false otherwise
    */
   function shouldReverseY(ballY) {
      var reverse = false;

      if (ballY > DOM.container.rect.height - 12 || ballY < 0) {
         reverse = true;
      }

      //Hit top or bottom side?
      //TODO

      //If we hit the object center mass DONT reverse the direction of the ball
      //TODO

      return reverse;
   }

   /**
    *  Checks the ball for any collisions between bricks, the platform, or the screen
    *
    *  The platform should not go past the screen boundaries
    *  If the ball hits an object it should change its direction
    *  If the ball goes past the platform and goes past the bottom edge, the game is over
    *  If the ball hits a brick:
    *    If its a normal brick, change the ball direction and hide the brick
    *    If its a strong brick, after one additional hit, change the ball direction and hide the brick
    *    If its an invuln brick, change the ball direction
    *
    *  @return {undefined}
    */
   function checkCollisions() {
      if (!in_progress) return;

      //Check screen collisions
      checkScreenCollisions();

      //Check platform collisions
      checkPlatformCollisions();

      //Check brick collisions
      checkBrickCollisions();
   }

   /**
    *  Check ball and platform collisions with the screen
    *
    *  @private
    *
    *  @return {undefined}
    */
   function checkScreenCollisions() {
      /**
       *  TODO
       *
       *  This function checks collisions between the ball/platform and the viewport
       *
       *  Since the platform only moves horizontally, you only need to check the X direction and use positionPlatform
       *  The ball moves in both the X and Y directions so be sure to set the X/Y tracking accordingly and use positionBall
       *
       *  If the ball goes PAST the platform and hits the bottom edge of the screen the game is over, reset the level to 0 and show a 'lost' message
       */
   }

   /**
    *  Check the ball for collisions with the platform
    *
    *  @private
    *
    *  @return {undefined}
    */
   function checkPlatformCollisions() {
      return isIntersecting(DOM.ball, DOM.platform);

      /**
       *  TODO
       *
       *  This function checks collisions between the ball and the platform
       *
       *  Be sure to use isIntersecting and shouldReverseX/shouldReverseY to change the ball tracking modifier
       *  Also be sure to account for the platform movement that can also change the ball direction
       */
   }

   /**
    *  Checks the ball for collisions with any visibile bricks and handle hit tracking
    *
    *  @private
    *
    *  @return {undefined}
    */
   function checkBrickCollisions() {
      if (bricksActive === 0 && in_progress) {
         moveToNextLevel();
      }

      const bricks = document.querySelectorAll("#bricks > div");
      for (let i = 0; i < bricks.length; i++) {
         const brick = bricks[i];

         isBrickEmpty = brick.classList.contains("empty");
         isStrong =
            brick.classList.contains("strong") &&
            !brick.classList.contains("hit");
         isStrongHiited =
            brick.classList.contains("strong") &&
            brick.classList.contains("hit");

         isUN =
            brick.classList.contains("strong") &&
            brick.classList.contains("hit");

         isInvuln = brick.classList.contains("invuln");

         if (isIntersecting(DOM.ball, brick) && isBrickEmpty) {
            break;
         } else if (isIntersecting(DOM.ball, brick) && isStrong) {
            modifiers.ball_y *= -1;
            brick.classList.add("hit");
            break;
         } else if (isIntersecting(DOM.ball, brick) && isStrongHiited) {
            modifiers.ball_y *= -1;
            brick.parentNode.removeChild(brick);
            bricksActive -= 1;
            break;
         } else if (isIntersecting(DOM.ball, brick) && isInvuln) {
            modifiers.ball_y *= -1;
            break;
         } else if (isIntersecting(DOM.ball, brick)) {
            modifiers.ball_y *= -1;
            brick.parentNode.removeChild(brick);
            bricksActive -= 1;
            break;
         }
      }
      /**
       *  TODO
       *
       *  This function checks collisions between the ball and the bricks[] array
       *
       *  Be sure to use isIntersecting and shouldReverseX/shouldReverseY to change the ball tracking modifier
       *  When a brick is hit be sure to set/remove/add the correct classes
       *  Follow this format:
       *    Normal -> Empty
       *    Strong HIT -> Normal
       *    Strong -> Strong HIT
       *    Invuln -> Invuln
       */
   }

   //########################################
   //Event Handlers
   //########################################

   /**
    *  A keydown event was caught, handle it
    *
    *  @private
    *
    *  @param  {Event} arg_event The event object
    *
    *  @return {undefined}
    */
   function onKeydown(key) {
      if (key.keyCode === 32 && !in_progress) {
         start();
      }

      // if (key.keyCode === 32 && isGaveOver) {
      //    reset();
      // }
      if (key.keyCode === 37) {
         DOM.platform.left = true;
      }
      if (key.keyCode === 39) {
         DOM.platform.right = true;
      }

      /**
       *  TODO
       *
       *  Handle a keydown event, follow this format:
       *
       *  Space: Start the game and clear any visible messages
       *  Escape: Reset the game
       *  Left/Right: Move the platform by changing the tracking modifier
       */
   }

   /**
    *  A keyup event was caught, handle it
    *
    *  @private
    *
    *  @param  {Event} arg_event The event object
    *
    *  @return {undefined}
    */
   function onKeyup(key) {
      if (key.keyCode === 37) {
         DOM.platform.left = false;
      }
      if (key.keyCode === 39) {
         DOM.platform.right = false;
      }
      /**
       *  TODO
       *
       *  Handle a keyup event, follow this format:
       *
       *  Left/Right: Stop moving the platform
       */
   }

   /**
    *  This function is called each time a frame should be rendered
    *
    *  @private
    *
    *  @return {undefined}
    */
   function doAnimate() {
      if (in_progress) {
         positionPlatform();
         positionBall();
         animId = window.requestAnimationFrame(doAnimate);
      }

      /**
       *  TODO
       *
       *  This function handles all animation
       *
       *  Be sure to:
       *    - If the platform is moving, position it
       *    - Position the ball based on the tracking and modifiers
       *    - Check for collisions using checkCollisions()
       *    - Check to see if there are no more bricks and either go to the next round or show a win message and start over
       */
   }

   //########################################
   //Element Positioning
   //########################################

   /**
    *  Position the platform
    *
    *  @private
    *
    *  @param  {number} arg_position The positive or negative number to position the platform
    *                                If the value is positive, it moves the platform that many pixels to the right
    *                                If the value is negative, it moves the platform that many pixels to the left
    *                                If the value is not a number, it centers the platform
    *  @param  {boolean} arg_increment Defaults to true, increment the positions rather than setting
    *
    *  @return {undefined}
    */
   function positionPlatform(arg_position, arg_increment) {
      let platformCurrent = DOM.platform.offsetLeft;

      if (DOM.platform.left && platformCurrent > DOM.container.rect.left) {
         platformCurrent -= modifiers.plat_x;
      }

      if (
         DOM.platform.right &&
         platformCurrent < DOM.container.rect.right - platformWidth
      ) {
         platformCurrent += modifiers.plat_x;
      }

      DOM.platform.style.left = platformCurrent + "px";
   }

   /**
    *  Position the ball
    *
    *  @private
    *
    *  @param  {number} arg_left The positive or negative number to position the ball horizontally
    *                            If the value is positive, it moves the ball that many pixels to the right horizontally
    *                            If the value is negative, it moves the ball that many pixels to the left horizontally
    *                            If the value is not a number, it centers the ball above the platform
    *  @param  {number} arg_top The positive or negative number to position the ball vertically
    *                           If the value is positive, it moves the ball that many pixels to the right vertically
    *                           If the value is negative, it moves the ball that many pixels to the left vertically
    *                           If the value is not a number, it centers the ball 20px above the platform
    *  @param  {boolean} arg_increment Defaults to true, increment the positions rather than setting
    *
    *  @return {undefined}
    */
   function positionBall() {
      let ballPos = {
         x: DOM.ball.offsetLeft,
         y: DOM.ball.offsetTop,
      };

      if (shouldReverseY(ballPos.y)) {
         if (ballPos.y > DOM.container.rect.height - 12) {
            gameOver();
         } else {
            modifiers.ball_y *= -1;
         }
      }

      if (shouldReverseX(ballPos.x)) {
         modifiers.ball_x *= -1;
      }

      if (checkPlatformCollisions()) {
         let temp =
            (ballPos.x -
               DOM.platform.offsetLeft -
               DOM.platform.offsetWidth / 2) /
            10;
         modifiers.ball_x = temp;
         modifiers.ball_y *= -1;
      }

      checkBrickCollisions();

      ballPos.x += modifiers.ball_x;
      ballPos.y += modifiers.ball_y;

      DOM.ball.style.left = ballPos.x + "px";
      DOM.ball.style.top = ballPos.y + "px";
   }

   //########################################
   //Initialization
   //########################################

   //Listeners
   window.addEventListener("DOMContentLoaded", initialize, false);
   window.addEventListener("keydown", onKeydown, false);
   window.addEventListener("keyup", onKeyup, false);
})();
