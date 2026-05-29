# Fishing Game

A Phaser 3 + TypeScript fishing game prototype. The core scene is a 2D fishing cross-section with casting, reeling, fish collisions, randomized real fish weights, fish sale values, level-specific shops, and local save progression across River, Lake, Estuary, and Coral Reef locations.

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
- Use Left/Right arrow keys or A/D to move the boat; the boat casts in the direction it last moved.
- Boat movement is locked while the line is cast out.
- Fish are hooked when they collide with the hook, then sold only after they are reeled all the way in.
- Lures are permanent tackle; bait is bought in cheap consumable uses and can be toggled in the shop.
- Chum can be bought in the shop to temporarily increase and bias fish spawns.
- Rod upgrades increase line range, reel speed, and maximum line weight before it snaps.
- Each location has its own save, money, tackle, shop, and catch log.
- Buy the final boat in a location to reveal a Ferry Ticket. Ferry Tickets unlock the next location, but money and tackle stay behind.
- Press `M` to open the map and revisit unlocked locations.
- Press `` ` `` to open the developer console. Use `money add X`, `unlock all`, `debug`, `fish info [UID=X]`, `fish clear`, `fish spawn TYPE [weight=x] [count=x]`, or `fish hook TYPE [weight=x] [count=x]`.
- Press `S` to open or close the shop.
- Press `I` to open or close the fish index.
- Hold `R` for 3 seconds to reset the local save.

## Placeholder Assets

Fish and equipment images live in `src/assets/images`. Replace those files and update `src/data/assets.ts` if you need new attribution, license, or notes. The asset manifest keeps the image ids stable so game data can keep referencing fish, rods, boats, and lures by id.

Some fish can use multiple spawn images. Add those images under a species folder in `src/assets/images/fish`, then create that manifest entry with `folderFishAsset(...)`. The first sorted image becomes the stable index/default texture, and each spawned fish randomly chooses from the default plus its variant textures through `chooseAssetTextureId(...)`.

## Verification

```sh
npm run test
npm run build
```

## GitHub Pages

This project includes a GitHub Actions workflow that deploys `dist/` to GitHub Pages whenever `main` is pushed. In your GitHub repository, set Pages source to `GitHub Actions`.

Manual smoke test:

- Lake scene fills the browser viewport at native resolution while preserving consistent gameplay balance across screen sizes.
- Player can charge, cast, and reel the hook.
- Fish swim through the lake and can be caught by hook collision.
- Opening and closing the shop, map, or fish index preserves active fish and cast state.
- Catch result increases money and catch count.
- Shop opens with `S`; owned items can be equipped, bait can be stocked/equipped, chum can be activated, level-specific purchases persist after refresh, and Ferry Tickets unlock the next location.
- Map opens with `M`; locked locations are blacked out and unlocked locations can be revisited with their own saved gear.
- Fish index opens with `I` and shows species stats plus current-location catch history.
