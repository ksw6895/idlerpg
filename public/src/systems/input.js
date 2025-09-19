import Phaser from '../phaser.js';

export function setupInput(scene) {
  const cursors = scene.input.keyboard.createCursorKeys();
  const keys = scene.input.keyboard.addKeys({
    W: Phaser.Input.Keyboard.KeyCodes.W,
    A: Phaser.Input.Keyboard.KeyCodes.A,
    S: Phaser.Input.Keyboard.KeyCodes.S,
    D: Phaser.Input.Keyboard.KeyCodes.D,
    E: Phaser.Input.Keyboard.KeyCodes.E,
    SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    Q: Phaser.Input.Keyboard.KeyCodes.Q,
    L: Phaser.Input.Keyboard.KeyCodes.L,
    P: Phaser.Input.Keyboard.KeyCodes.P,
    SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
    TWO: Phaser.Input.Keyboard.KeyCodes.TWO
  });

  return { cursors, keys };
}

export function getMovementVector(cursors, keys) {
  const vector = new Phaser.Math.Vector2(0, 0);
  if (cursors.left.isDown || keys.A.isDown) vector.x -= 1;
  if (cursors.right.isDown || keys.D.isDown) vector.x += 1;
  if (cursors.up.isDown || keys.W.isDown) vector.y -= 1;
  if (cursors.down.isDown || keys.S.isDown) vector.y += 1;
  return vector.normalize();
}
