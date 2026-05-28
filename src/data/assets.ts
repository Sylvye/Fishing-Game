import type { AssetManifestEntry } from '../types';
import boatRowboatUrl from '../assets/images/items/boat-rowboat.svg?url';
import lureSpoonUrl from '../assets/images/items/lure-spoon.svg?url';
import rodBambooUrl from '../assets/images/items/rod-bamboo.svg?url';

const fishImageUrls = import.meta.glob<string>('../assets/images/fish/**/*.png', {
  eager: true,
  import: 'default',
  query: '?url',
});

const placeholderFish = (body: string, accent: string, fin: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 128"><g fill="none" fill-rule="evenodd"><path d="M17 64c23-24 53-36 88-36h28c33 0 65 13 96 39-29 22-61 33-96 33h-28c-35 0-64-12-88-36Z" fill="${body}"/><path d="M198 66 241 35v58z" fill="${fin}"/><path d="M76 34c33 16 70 17 111 4-24 30-60 46-108 47-20 0-39-4-57-13 14-17 32-29 54-38Z" fill="${accent}" opacity=".7"/><path d="M73 84c34 5 70 1 108-13-18 22-46 34-84 36-28 1-52-6-72-20 16-2 32-3 48-3Z" fill="#10232b" opacity=".22"/><circle cx="57" cy="55" r="6" fill="#0c1d23"/><path d="M76 62c18 8 40 8 66 1" stroke="#f4fff8" stroke-width="5" stroke-linecap="round" opacity=".42"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const fishImageUrl = (fileName: string) => {
  const src = fishImageUrls[`../assets/images/fish/${fileName}`];
  if (!src) {
    throw new Error(`Missing fish image asset: ${fileName}`);
  }
  return src;
};

const titleFromFileName = (fileName: string) =>
  fileName
    .replace(/\.png$/, '')
    .replace(/[-_]/g, ' ');

const textureSlugFromFileName = (fileName: string) =>
  fileName
    .replace(/\.png$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const folderFishAsset = (
  id: string,
  displayName: string,
  folderName: string,
  license: string,
  attribution: string,
  replacementNotes: string,
): AssetManifestEntry => {
  const folderPrefix = `../assets/images/fish/${folderName}/`;
  const files = Object.keys(fishImageUrls)
    .filter((path) => path.startsWith(folderPrefix))
    .map((path) => path.slice(folderPrefix.length))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`Missing fish image folder assets: ${folderName}`);
  }

  const [defaultFile, ...variantFiles] = files;
  return {
    id,
    kind: 'fish',
    src: fishImageUrl(`${folderName}/${defaultFile}`),
    variants: variantFiles.map((fileName) => ({
      id: `${id}-${textureSlugFromFileName(fileName)}`,
      src: fishImageUrl(`${folderName}/${fileName}`),
      displayName: titleFromFileName(fileName),
    })),
    displayName: `${displayName} image`,
    license,
    attribution,
    replacementNotes,
  };
};

const fishAsset = (
  id: string,
  displayName: string,
  fileName: string,
  license: string,
  attribution: string,
  replacementNotes: string,
  sourceUrl?: string,
): AssetManifestEntry => ({
  id,
  kind: 'fish',
  src: fishImageUrl(fileName),
  displayName: `${displayName} image`,
  license,
  attribution,
  sourceUrl,
  replacementNotes,
});

const localFishPlaceholder = (id: string, displayName: string, src: string): AssetManifestEntry => ({
  id,
  kind: 'fish',
  src,
  displayName: `${displayName} placeholder`,
  license: 'Local generated placeholder',
  attribution: 'Created for this project.',
  replacementNotes: 'Replace with licensed transparent side-profile fish art when available.',
});

export const assetManifest: AssetManifestEntry[] = [
  fishAsset(
    'fish-bluegill',
    'Bluegill',
    'Bluegill.png',
    'CC0 1.0 / local simplified derivative placeholder',
    'Inspired by Wikimedia Commons file "Bluegill sunfish silhouette.svg" by Abyssal, CC0.',
    'Replace with a transparent PNG or SVG facing right, around 256x128.',
    'https://commons.wikimedia.org/wiki/File:Bluegill_sunfish_silhouette.svg',
  ),
  fishAsset(
    'fish-largemouth-bass',
    'Largemouth Bass',
    'Largemouth-bass.png',
    'Public domain inspired local placeholder',
    'Reference source: Wikimedia Commons file "Denton Largemouth Bass 1896.png", public domain.',
    'Replace with a side-profile bass sprite. Keep transparent background for best results.',
    'https://commons.wikimedia.org/wiki/File:Denton_Largemouth_Bass_1896.png',
  ),
  fishAsset(
    'fish-smallmouth-bass',
    'Smallmouth Bass',
    'Smallmouth-bass.png',
    'Public domain, U.S. Fish and Wildlife Service',
    'Duane Raver / U.S. Fish and Wildlife Service via Wikimedia Commons.',
    'Current file is a downloaded transparent Wikimedia PNG; replace with same aspect ratio if possible.',
    'https://commons.wikimedia.org/wiki/File:Smallmouth_bass.png',
  ),
  fishAsset(
    'fish-rainbow-trout',
    'Rainbow Trout',
    'Rainbow-trout.png',
    'Public domain inspired local placeholder',
    'Reference source: Wikimedia Commons file "Rainbow Trout.jpg", public domain, U.S. Fish and Wildlife Service.',
    'Use a side-profile trout sprite with transparent background.',
    'https://commons.wikimedia.org/wiki/File:Rainbow_Trout.jpg',
  ),
  fishAsset(
    'fish-channel-catfish',
    'Channel Catfish',
    'Channel-catfish.png',
    'Public domain inspired local placeholder',
    'Reference source: Wikimedia Commons file "Ictalurus punctatus.jpg", public domain, U.S. Fish and Wildlife Service.',
    'Long, low silhouette sprites read best for catfish.',
    'https://commons.wikimedia.org/wiki/File:Ictalurus_punctatus.jpg',
  ),
  fishAsset(
    'fish-northern-pike',
    'Northern Pike',
    'Northern-pike.png',
    'Public domain inspired local placeholder',
    'Reference source: Wikimedia Commons file "Esox lucius1.jpg", public domain.',
    'Use a long side-profile pike image facing right.',
    'https://commons.wikimedia.org/wiki/File:Esox_lucius1.jpg',
  ),
  fishAsset('fish-walleye', 'Walleye', 'Walleye.png', 'Local placeholder', 'Created for this project.', 'Use a transparent side-profile walleye sprite.'),
  fishAsset('fish-common-carp', 'Common Carp', 'Common-carp.png', 'Local placeholder', 'Created for this project.', 'Use a deeper-bodied carp sprite with transparent background.'),
  localFishPlaceholder('fish-minnow', 'Minnow', placeholderFish('#b8c6a0', '#e1e6c7', '#7f926c')),
  fishAsset('fish-sockeye-salmon', 'Sockeye Salmon', 'Sockeye-salmon.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile salmon sprite with transparent background.'),
  fishAsset('fish-atlantic-sturgeon', 'Atlantic Sturgeon', 'Atlantic-sturgeon.png', 'Local placeholder', 'Created for this project.', 'Use a long, armored sturgeon sprite with transparent background.'),
  fishAsset('fish-black-crappie', 'Black Crappie', 'Black-crappie.png', 'Local placeholder', 'Created for this project.', 'Use a compact panfish sprite with transparent background.'),
  fishAsset('fish-blue-catfish', 'Blue Catfish', 'Blue-catfish.png', 'Local placeholder', 'Created for this project.', 'Use a long, low catfish sprite with transparent background.'),
  fishAsset('fish-gray-mullet', 'Gray Mullet', 'Gray-mullet.png', 'Local placeholder', 'Created for this project.', 'Use a streamlined mullet sprite with transparent background.'),
  fishAsset('fish-striped-bass', 'Striped Bass', 'Striped-bass.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile striped bass sprite with transparent background.'),
  fishAsset('fish-yellowtail-flounder', 'Yellowtail Flounder', 'Yellowtail-flounder.png', 'Local placeholder', 'Created for this project.', 'Use a flatfish sprite with transparent background.'),
  fishAsset('fish-red-drum', 'Red Drum', 'Red-drum.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile red drum sprite with transparent background.'),
  fishAsset('fish-black-drum', 'Black Drum', 'Black-drum.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile black drum sprite with transparent background.'),
  fishAsset('fish-tarpon', 'Tarpon', 'Atlantic-tarpon.png', 'Local placeholder', 'Created for this project.', 'Use a large, silver side-profile tarpon sprite with transparent background.'),
  fishAsset('fish-bull-shark', 'Bull Shark', 'Bull-shark.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile bull shark sprite with transparent background.'),
  fishAsset('fish-sandbar-shark', 'Sandbar Shark', 'Sandbar-shark.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile sandbar shark sprite with transparent background.'),
  folderFishAsset('fish-damselfish', 'Damselfish', 'Damselfish', 'Local placeholder variants', 'Created for this project.', 'Uses one random Damselfish folder image when each fish spawns.'),
  folderFishAsset('fish-butterflyfish', 'Butterflyfish', 'Butterflyfish', 'Local placeholder variants', 'Created for this project.', 'Uses one random Butterflyfish folder image when each fish spawns.'),
  fishAsset('fish-rainbow-parrotfish', 'Rainbow Parrotfish', 'Rainbow-parrotfish.png', 'Local placeholder', 'Created for this project.', 'Use a colorful side-profile parrotfish sprite with transparent background.'),
  fishAsset('fish-clown-triggerfish', 'Clown Triggerfish', 'Clown-triggerfish.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile triggerfish sprite with transparent background.'),
  fishAsset('fish-red-lionfish', 'Red Lionfish', 'Red-lionfish.png', 'Local placeholder', 'Created for this project.', 'Use a spiny lionfish sprite with transparent background.'),
  fishAsset('fish-goliath-grouper', 'Goliath Grouper', 'Atlantic-goliath-grouper.png', 'Local placeholder', 'Created for this project.', 'Use a large-bodied grouper sprite with transparent background.'),
  fishAsset('fish-great-barracuda', 'Great Barracuda', 'Great-barracuda.png', 'Local placeholder', 'Created for this project.', 'Use a long side-profile barracuda sprite with transparent background.'),
  fishAsset('fish-mahi-mahi', 'Mahi-Mahi', 'Mahi-mahi.png', 'Local placeholder', 'Created for this project.', 'Use a bright side-profile mahi-mahi sprite with transparent background.'),
  fishAsset('fish-blacktip-reef-shark', 'Blacktip Reef Shark', 'Blacktip-reef-shark.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile reef shark sprite with transparent background.'),
  fishAsset('fish-hammerhead-shark', 'Hammerhead Shark', 'Great-hammerhead-shark.png', 'Local placeholder', 'Created for this project.', 'Use a side-profile hammerhead shark sprite with transparent background.'),
  {
    id: 'rod-bamboo',
    kind: 'rod',
    src: rodBambooUrl,
    displayName: 'Bamboo Rod placeholder',
    license: 'Local placeholder',
    attribution: 'Created for this project.',
    replacementNotes: 'Replace with a horizontal rod sprite or shop icon.',
  },
  {
    id: 'boat-rowboat',
    kind: 'boat',
    src: boatRowboatUrl,
    displayName: 'Rowboat placeholder',
    license: 'Local placeholder',
    attribution: 'Created for this project.',
    replacementNotes: 'Replace with a side-view boat sprite.',
  },
  {
    id: 'lure-spoon',
    kind: 'lure',
    src: lureSpoonUrl,
    displayName: 'Spoon Lure placeholder',
    license: 'Local placeholder',
    attribution: 'Created for this project.',
    replacementNotes: 'Replace with a compact lure icon.',
  },
];

export const getAsset = (id: string) => {
  const asset = assetManifest.find((entry) => entry.id === id);
  if (!asset) {
    throw new Error(`Missing asset manifest entry: ${id}`);
  }
  return asset;
};

export const getAssetTextureIds = (id: string) => {
  const asset = getAsset(id);
  return [asset.id, ...(asset.variants?.map((variant) => variant.id) ?? [])];
};

export const chooseAssetTextureId = (id: string, random: () => number = Math.random) => {
  const textureIds = getAssetTextureIds(id);
  return textureIds[Math.floor(random() * textureIds.length)] ?? id;
};
