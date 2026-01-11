# Gomoku (Five in a Row) for Banter

This is a fully multiplayer and synchronized version of the classic game Gomoku (also known as Five in a Row) designed to be easily embedded into any Banter world.

The game state is synced across all players in the space using Banter's shared state properties, so everyone sees the same game board and can take turns playing.

## Features

- **Fully Multiplayer:** Play with anyone in your Banter space.
- **Synchronized State:** The game board is always in sync for all players.
- **Customizable:** Easily change the board's size, position, rotation, and scale.
- **Simple to Embed:** Just add one line of code to your `index.html`.
- **Reset Button:** A built-in reset button allows players to start a new game at any time.

## How to Use

To add the Gomoku game to your Banter space, simply add the following script tag to your `index.html` file.

```html
<!-- Add this to the <body> of your index.html -->
<script src="Gomoku.js"></script>
```

This will load the game with its default settings.

## Customization

You can customize the game by adding URL parameters to the script's `src` attribute. This allows you to change the appearance and placement of the game to fit your world perfectly.

```html
<!-- Example of a customized Gomoku game -->
<script src="https://banter-gomoku.firer.at/Gomoku.js?boardPosition=0+1.5+-3&boardScale=0.8&boardSize=19"></script>
```

### Available Parameters

| Parameter         | Type        | Default Value         | Description                                                                                                   |
|-------------------|-------------|-----------------------|---------------------------------------------------------------------------------------------------------------|
| `instance`        | `string`    | (current URL)         | A unique ID for the game instance. Use this if you have multiple Gomoku boards in the same world.               |
| `boardSize`       | `integer`   | `15`                  | The size of the board (e.g., `15` for 15x15, `19` for 19x19).                                                    |
| `hideUI`          | `boolean`   | `false`               | Set to `true` to hide the reset button.                                                                       |
| `boardPosition`   | `Vector3`   | `0 1.5 0`             | The position of the game board in your world (X Y Z, space-separated).                                          |
| `boardRotation`   | `Vector3`   | `0 0 0`               | The rotation of the game board in Euler angles (X Y Z, space-separated).                                        |
| `boardScale`      | `Vector3`   | `1 1 1`               | The scale of the game board (X Y Z, space-separated).                                                           |
| `resetPosition`   | `Vector3`   | `0 -1.2 0`            | The position of the reset button relative to the board.                                                       |
| `resetRotation`   | `Vector3`   | `0 0 0`               | The rotation of the reset button.                                                                             |
| `resetScale`      | `Vector3`   | `1 1 1`               | The scale of the reset button.                                                                                |

**Note on Vector3:** `Vector3` parameters must be formatted with spaces between the numbers (e.g., `1+1.5+2`).

## How It Works

The game logic is contained within `Gomoku.js`. It uses the Banter SDK (`BS`) to create and manage all the visual elements of the game, including the board, the grid lines, and the game pieces (stones).

Player moves are handled by simulating the game state locally and then sending the new state to all players using `BS.BanterScene.GetInstance().SetPublicSpaceProps()`. This function stores the game's state (the board layout, current player, and win condition) in a shared JSON object.

When any player's client receives an update to this shared state via the `space-state-changed` event, it re-renders the board to reflect the latest move, ensuring everyone stays in sync.
