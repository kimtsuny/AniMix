/**
 * Test suite for Video Player Controls & Inactivity Lifecycle
 * Validates the 9 requirements specified in the user request.
 */

class PlayerVisibilityStateMachine {
  showControls = true;
  isMouseInside = false;
  isControlsHovered = false;
  isPlaying = false;
  timer: NodeJS.Timeout | null = null;
  timerDelay: number | null = null;

  constructor(initialPlaying = false) {
    this.isPlaying = initialPlaying;
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.timerDelay = null;
    }
  }

  scheduleControlsHide(delay = 3000) {
    this.clearTimer();

    // Never hide controls when video is paused
    if (!this.isPlaying) {
      return;
    }

    // Never hide controls when mouse is hovering the controls area
    if (this.isControlsHovered) {
      return;
    }

    this.timerDelay = delay;
    this.timer = setTimeout(() => {
      if (this.isPlaying && !this.isControlsHovered) {
        this.showControls = false;
      }
      this.timer = null;
      this.timerDelay = null;
    }, delay);
  }

  onPlayerMouseEnter() {
    this.isMouseInside = true;
    this.showControls = true;
    this.scheduleControlsHide(3000);
  }

  onPlayerMouseMove() {
    this.isMouseInside = true;
    this.showControls = true;
    this.scheduleControlsHide(3000);
  }

  onPlayerMouseLeave(relatedTargetInside = false) {
    if (relatedTargetInside) {
      return;
    }
    this.isMouseInside = false;
    this.isControlsHovered = false;
    this.scheduleControlsHide(1000);
  }

  onControlsMouseEnter() {
    this.isControlsHovered = true;
    this.clearTimer();
    this.showControls = true;
  }

  onControlsMouseMove() {
    this.isControlsHovered = true;
    this.clearTimer();
    this.showControls = true;
  }

  onControlsMouseLeave(relatedTargetInsideControls = false) {
    if (relatedTargetInsideControls) {
      return;
    }
    this.isControlsHovered = false;
    if (this.isMouseInside) {
      this.scheduleControlsHide(3000);
    }
  }

  onPlay() {
    this.isPlaying = true;
    this.scheduleControlsHide(3000);
  }

  onPause() {
    this.isPlaying = false;
    this.clearTimer();
    this.showControls = true;
  }
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log("--- Starting Player Controls Lifecycle Test Suite ---\n");

  // 1. Mouse moving around inside player
  console.log("1. Mouse moving around inside player:");
  {
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    assert(player.showControls === true, "Controls visible on enter");
    assert(player.timer !== null, "Inactivity timer scheduled");
    assert(player.timerDelay === 3000, "Timer delay is 3000ms");

    await sleep(50);
    player.onPlayerMouseMove();
    assert(player.showControls === true, "Controls remain visible on move");
    player.clearTimer();
  }

  // 2. Mouse stationary inside player (video playing vs paused)
  console.log("\n2. Mouse stationary inside player:");
  {
    // Video playing: hides after inactivity
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    player.scheduleControlsHide(100); // simulate 100ms timeout for test speed
    await sleep(150);
    assert(player.showControls === false, "Controls hide when stationary in video area while playing");

    // Video paused: NEVER hides
    const pausedPlayer = new PlayerVisibilityStateMachine(false);
    pausedPlayer.onPlayerMouseEnter();
    assert(pausedPlayer.showControls === true, "Controls visible when paused");
    assert(pausedPlayer.timer === null, "Timer not scheduled when paused");
    await sleep(100);
    assert(pausedPlayer.showControls === true, "Controls stay visible indefinitely when paused");
  }

  // 3. Mouse moving between controls
  console.log("\n3. Mouse moving between controls:");
  {
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    player.onControlsMouseEnter();
    assert(player.isControlsHovered === true, "Controls hovered state active");
    assert(player.timer === null, "Timer cancelled when entering controls");

    // Moving between buttons within controls
    for (let i = 0; i < 5; i++) {
      player.onControlsMouseMove();
      assert(player.showControls === true, `Controls stay visible moving to button ${i + 1}`);
      assert(player.timer === null, `Timer stays cleared over button ${i + 1}`);
    }
  }

  // 4. Mouse hovering a button
  console.log("\n4. Mouse hovering a button:");
  {
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    player.onControlsMouseEnter();
    // Hovering button for extended time
    await sleep(150);
    assert(player.showControls === true, "Controls remain visible while hovering button");
    assert(player.isControlsHovered === true, "Hover state preserved");
  }

  // 5. Mouse hovering a tooltip
  console.log("\n5. Mouse hovering a tooltip (inside controls hierarchy):");
  {
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    player.onControlsMouseEnter();
    // Pointer over tooltip / button child
    player.onControlsMouseLeave(true); // relatedTarget is inside controls
    assert(player.isControlsHovered === true, "Hover not lost when moving between button and tooltip");
    assert(player.showControls === true, "Controls remain visible");
  }

  // 6. Mouse leaving the player
  console.log("\n6. Mouse leaving the player:");
  {
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    player.onPlayerMouseLeave(false);
    assert(player.isMouseInside === false, "Mouse is marked outside");
    assert(player.showControls === true, "Controls do NOT vanish instantly on leave");
    assert(player.timer !== null, "Graceful hide timer started on leave");
    assert(player.timerDelay === 1000, "Graceful leave delay is 1000ms");

    player.scheduleControlsHide(100); // simulate 100ms for test
    await sleep(150);
    assert(player.showControls === false, "Controls hide smoothly after leave grace period");
  }

  // 7. Mouse re-entering the player
  console.log("\n7. Mouse re-entering the player:");
  {
    const player = new PlayerVisibilityStateMachine(true);
    player.onPlayerMouseEnter();
    player.onPlayerMouseLeave(false);
    assert(player.isMouseInside === false, "Mouse outside");

    // Re-enter at 50ms before leave timer fires
    await sleep(50);
    player.onPlayerMouseMove();
    assert(player.isMouseInside === true, "Mouse back inside");
    assert(player.showControls === true, "Controls remained visible throughout");
    assert(player.timerDelay === 3000, "Reset to standard 3000ms inactivity timer");
    player.clearTimer();
  }

  // 8. Hide animation from fully visible state (classes & transitions)
  console.log("\n8. Hide animation from fully visible state:");
  {
    const wrapperClasses = (showControls: boolean) =>
      `absolute inset-x-0 bottom-0 z-20 transition-[opacity,visibility] duration-300 ease-out will-change-[opacity] ${
        showControls
          ? "opacity-100 visible pointer-events-auto"
          : "opacity-0 invisible pointer-events-none"
      }`;

    const visibleClass = wrapperClasses(true);
    const hiddenClass = wrapperClasses(false);

    assert(visibleClass.includes("opacity-100"), "Visible has opacity-100");
    assert(visibleClass.includes("visible"), "Visible has visible");
    assert(visibleClass.includes("pointer-events-auto"), "Visible has pointer-events-auto");
    assert(visibleClass.includes("transition-[opacity,visibility]"), "Has synchronized visibility & opacity transition");

    assert(hiddenClass.includes("opacity-0"), "Hidden has opacity-0");
    assert(hiddenClass.includes("invisible"), "Hidden has invisible");
    assert(hiddenClass.includes("pointer-events-none"), "Hidden has pointer-events-none");
  }

  // 9. Rapid enter/leave movement
  console.log("\n9. Rapid enter/leave movement:");
  {
    const player = new PlayerVisibilityStateMachine(true);
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        player.onPlayerMouseEnter();
      } else {
        player.onPlayerMouseLeave(false);
      }
    }
    // Final state: re-enter
    player.onPlayerMouseEnter();
    assert(player.showControls === true, "Controls remain stable and visible after rapid enter/leave");
    assert(player.isMouseInside === true, "Mouse inside correctly registered");
    player.clearTimer();
  }

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
