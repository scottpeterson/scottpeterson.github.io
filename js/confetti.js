/**
 * Confetti Animation Module
 *
 * A lightweight confetti animation for celebratory moments.
 * Used as an easter egg when viewing certain team summaries.
 */

(function () {
  'use strict';

  // Configuration
  const CONFETTI_COUNT = 150;
  const COLORS = [
    '#3498db',
    '#e74c3c',
    '#2ecc71',
    '#f39c12',
    '#9b59b6',
    '#1abc9c',
    '#e91e63',
    '#00bcd4',
  ];
  const GRAVITY = 0.5;
  const DRAG = 0.02;
  const TERMINAL_VELOCITY = 5;
  const SPIN_SPEED = 0.1;

  let canvas = null;
  let ctx = null;
  let confetti = [];
  let animationId = null;

  /**
   * Creates the canvas element for confetti.
   */
  function createCanvas() {
    if (canvas) {
      return;
    }

    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99999;
    `;
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
  }

  /**
   * Resizes canvas to match window dimensions.
   */
  function resizeCanvas() {
    if (!canvas) {
      return;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /**
   * Creates a single confetti particle.
   */
  function createParticle() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height, // Start above viewport
      width: Math.random() * 10 + 5,
      height: Math.random() * 6 + 4,
      color: color,
      velocityX: (Math.random() - 0.5) * 8,
      velocityY: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * SPIN_SPEED * 20,
      oscillationSpeed: Math.random() * 0.02 + 0.01,
      oscillationDistance: Math.random() * 40 + 20,
      oscillationX: 0,
      opacity: 1,
      scale: Math.random() * 0.5 + 0.5,
    };
  }

  /**
   * Updates a single particle's position and properties.
   */
  function updateParticle(particle, deltaTime) {
    // Apply gravity
    particle.velocityY += GRAVITY * deltaTime;

    // Apply drag
    particle.velocityY *= 1 - DRAG;
    particle.velocityX *= 1 - DRAG;

    // Terminal velocity
    if (particle.velocityY > TERMINAL_VELOCITY) {
      particle.velocityY = TERMINAL_VELOCITY;
    }

    // Oscillation for flutter effect
    particle.oscillationX += particle.oscillationSpeed * deltaTime * 60;
    const oscillationOffset =
      Math.sin(particle.oscillationX) * particle.oscillationDistance * 0.1;

    // Update position
    particle.x += particle.velocityX + oscillationOffset;
    particle.y += particle.velocityY;

    // Update rotation
    particle.rotation += particle.rotationSpeed * deltaTime * 60;

    // Fade out near bottom
    if (particle.y > canvas.height - 100) {
      particle.opacity = Math.max(0, (canvas.height - particle.y) / 100);
    }

    // Check if particle is off screen
    return particle.y < canvas.height + 50 && particle.opacity > 0;
  }

  /**
   * Draws a single particle.
   */
  function drawParticle(particle) {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.scale(particle.scale, particle.scale);
    ctx.globalAlpha = particle.opacity;

    // Draw rectangle confetti
    ctx.fillStyle = particle.color;
    ctx.fillRect(
      -particle.width / 2,
      -particle.height / 2,
      particle.width,
      particle.height
    );

    ctx.restore();
  }

  /**
   * Main animation loop.
   */
  let lastTime = 0;
  function animate(currentTime) {
    if (!canvas) {
      return;
    }

    const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2); // Normalize to ~60fps
    lastTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    confetti = confetti.filter(particle => {
      const alive = updateParticle(particle, deltaTime);
      if (alive) {
        drawParticle(particle);
      }
      return alive;
    });

    // Continue animation if particles remain
    if (confetti.length > 0) {
      animationId = requestAnimationFrame(animate);
    } else {
      cleanup();
    }
  }

  /**
   * Cleans up after animation completes.
   */
  function cleanup() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
      canvas = null;
      ctx = null;
    }
  }

  /**
   * Launches confetti animation.
   */
  function launch() {
    // Clean up any existing animation
    cleanup();

    // Create fresh canvas and particles
    createCanvas();
    confetti = [];

    for (let i = 0; i < CONFETTI_COUNT; i++) {
      confetti.push(createParticle());
    }

    // Start animation
    lastTime = performance.now();
    animationId = requestAnimationFrame(animate);
  }

  // Expose API
  window.confetti = {
    launch: launch,
    stop: cleanup,
  };
})();
