# Fishing Game

A Phaser 3 + TypeScript fishing game prototype. The first playable scene is a 2D lake cross-section with casting, reeling, fish collisions, randomized real fish weights, fish sale values, a shop, and local save progression.

## Run

```sh
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Controls

- Hold mouse or Space to charge a cast.
- Release to throw the hook.
- Hold mouse or Space while the hook is in the water to reel in; release to let it sink.
- Use Left/Right arrow keys or A/D to move the boat.
- Fish are hooked when they collide with the hook, then sold only after they are reeled all the way in.
- Rod upgrades increase line range, reel speed, and maximum line weight before it snaps.
- Press `S` for the shop.
- Press `R` to reset the local save.

## Placeholder Assets

Fish and equipment placeholders live in `src/assets/placeholders`. Replace those files and update `src/data/assets.ts` if you need new attribution, license, or notes. One fish sprite is downloaded from Wikimedia Commons to exercise the replaceable web-sourced placeholder path; the rest are simple local placeholders with source/reference notes.

## Verification

```sh
npm run test
npm run build
```

## GitHub Pages

This project includes a GitHub Actions workflow that deploys `dist/` to GitHub Pages whenever `main` is pushed. In your GitHub repository, set Pages source to `GitHub Actions`.

Manual smoke test:

- Lake scene loads and fills the browser viewport.
- Player can charge, cast, and reel the hook.
- Fish swim through the lake and can be caught by hook collision.
- Catch result increases money and catch count.
- Shop opens with `S`; owned items can be equipped and purchased items persist after refresh.
