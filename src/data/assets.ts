import type { AssetManifestEntry } from '../types';
import bluegillUrl from '../assets/images/fish/Bluegill.png?url';
import channelCatfishUrl from '../assets/images/fish/Channel_catfish.png?url';
import commonCarpUrl from '../assets/images/fish/Common_carp.png?url';
import largemouthBassUrl from '../assets/images/fish/Largemouth_bass.png?url';
import northernPikeUrl from '../assets/images/fish/Northern_pike.png?url';
import rainbowTroutUrl from '../assets/images/fish/Rainbow_trout.png?url';
import smallmouthBassUrl from '../assets/images/fish/Smallmouth_bass.png?url';
import walleyeUrl from '../assets/images/fish/Walleye.png?url';
import boatRowboatUrl from '../assets/images/items/boat-rowboat.svg?url';
import lureSpoonUrl from '../assets/images/items/lure-spoon.svg?url';
import rodBambooUrl from '../assets/images/items/rod-bamboo.svg?url';

const placeholderFish = (body: string, accent: string, fin: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 128"><g fill="none" fill-rule="evenodd"><path d="M17 64c23-24 53-36 88-36h28c33 0 65 13 96 39-29 22-61 33-96 33h-28c-35 0-64-12-88-36Z" fill="${body}"/><path d="M198 66 241 35v58z" fill="${fin}"/><path d="M76 34c33 16 70 17 111 4-24 30-60 46-108 47-20 0-39-4-57-13 14-17 32-29 54-38Z" fill="${accent}" opacity=".7"/><path d="M73 84c34 5 70 1 108-13-18 22-46 34-84 36-28 1-52-6-72-20 16-2 32-3 48-3Z" fill="#10232b" opacity=".22"/><circle cx="57" cy="55" r="6" fill="#0c1d23"/><path d="M76 62c18 8 40 8 66 1" stroke="#f4fff8" stroke-width="5" stroke-linecap="round" opacity=".42"/></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

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
  {
    id: 'fish-bluegill',
    kind: 'fish',
    src: bluegillUrl,
    displayName: 'Bluegill image',
    license: 'CC0 1.0 / local simplified derivative placeholder',
    attribution: 'Inspired by Wikimedia Commons file "Bluegill sunfish silhouette.svg" by Abyssal, CC0.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bluegill_sunfish_silhouette.svg',
    replacementNotes: 'Replace with a transparent PNG or SVG facing right, around 256x128.',
  },
  {
    id: 'fish-largemouth-bass',
    kind: 'fish',
    src: largemouthBassUrl,
    displayName: 'Largemouth Bass image',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Denton Largemouth Bass 1896.png", public domain.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Denton_Largemouth_Bass_1896.png',
    replacementNotes: 'Replace with a side-profile bass sprite. Keep transparent background for best results.',
  },
  {
    id: 'fish-smallmouth-bass',
    kind: 'fish',
    src: smallmouthBassUrl,
    displayName: 'Smallmouth Bass image',
    license: 'Public domain, U.S. Fish and Wildlife Service',
    attribution: 'Duane Raver / U.S. Fish and Wildlife Service via Wikimedia Commons.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Smallmouth_bass.png',
    replacementNotes: 'Current file is a downloaded transparent Wikimedia PNG; replace with same aspect ratio if possible.',
  },
  {
    id: 'fish-rainbow-trout',
    kind: 'fish',
    src: rainbowTroutUrl,
    displayName: 'Rainbow Trout image',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Rainbow Trout.jpg", public domain, U.S. Fish and Wildlife Service.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rainbow_Trout.jpg',
    replacementNotes: 'Use a side-profile trout sprite with transparent background.',
  },
  {
    id: 'fish-channel-catfish',
    kind: 'fish',
    src: channelCatfishUrl,
    displayName: 'Channel Catfish image',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Ictalurus punctatus.jpg", public domain, U.S. Fish and Wildlife Service.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ictalurus_punctatus.jpg',
    replacementNotes: 'Long, low silhouette sprites read best for catfish.',
  },
  {
    id: 'fish-northern-pike',
    kind: 'fish',
    src: northernPikeUrl,
    displayName: 'Northern Pike image',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Esox lucius1.jpg", public domain.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Esox_lucius1.jpg',
    replacementNotes: 'Use a long side-profile pike image facing right.',
  },
  {
    id: 'fish-walleye',
    kind: 'fish',
    src: walleyeUrl,
    displayName: 'Walleye image',
    license: 'Local placeholder',
    attribution: 'Local simplified placeholder; replace with licensed real walleye art or photo.',
    replacementNotes: 'Use a transparent side-profile walleye sprite.',
  },
  {
    id: 'fish-common-carp',
    kind: 'fish',
    src: commonCarpUrl,
    displayName: 'Common Carp image',
    license: 'Local placeholder',
    attribution: 'Local simplified placeholder; replace with licensed real common carp art or photo.',
    replacementNotes: 'Use a deeper-bodied carp sprite with transparent background.',
  },
  localFishPlaceholder('fish-minnow', 'Minnow', placeholderFish('#b8c6a0', '#e1e6c7', '#7f926c')),
  localFishPlaceholder('fish-salmon', 'Salmon', placeholderFish('#b76f70', '#f0b58c', '#7a505f')),
  localFishPlaceholder('fish-sturgeon', 'Sturgeon', placeholderFish('#6d7880', '#a3adb2', '#44505a')),
  localFishPlaceholder('fish-crappie', 'Crappie', placeholderFish('#899d7a', '#d8d0aa', '#566947')),
  localFishPlaceholder('fish-blue-catfish', 'Blue Catfish', placeholderFish('#526f82', '#98b6c5', '#344a5a')),
  localFishPlaceholder('fish-mullet', 'Mullet', placeholderFish('#9fb2a8', '#e2ded0', '#6b8178')),
  localFishPlaceholder('fish-striped-bass', 'Striped Bass', placeholderFish('#8fa09b', '#eef0df', '#394b50')),
  localFishPlaceholder('fish-flounder', 'Flounder', placeholderFish('#9c825f', '#d2b184', '#6f5438')),
  localFishPlaceholder('fish-red-drum', 'Red Drum', placeholderFish('#b46a54', '#e9aa77', '#7d4138')),
  localFishPlaceholder('fish-black-drum', 'Black Drum', placeholderFish('#4d5659', '#889194', '#2d3336')),
  localFishPlaceholder('fish-tarpon', 'Tarpon', placeholderFish('#9eb5ba', '#e5eef0', '#657b82')),
  localFishPlaceholder('fish-bull-shark', 'Bull Shark', placeholderFish('#6f7f86', '#aebbc0', '#46555c')),
  localFishPlaceholder('fish-sandbar-shark', 'Sandbar Shark', placeholderFish('#8d8f82', '#cfc8a9', '#62685f')),
  localFishPlaceholder('fish-damselfish', 'Damselfish', placeholderFish('#2868ba', '#f2d34f', '#173b78')),
  localFishPlaceholder('fish-butterflyfish', 'Butterflyfish', placeholderFish('#f0c74c', '#f7f0d2', '#2d3748')),
  localFishPlaceholder('fish-parrotfish', 'Parrotfish', placeholderFish('#2ca678', '#ef6f8a', '#19735c')),
  localFishPlaceholder('fish-triggerfish', 'Triggerfish', placeholderFish('#68728c', '#f5c15a', '#343c55')),
  localFishPlaceholder('fish-lionfish', 'Lionfish', placeholderFish('#b96b3d', '#f4d7a0', '#6c2d28')),
  localFishPlaceholder('fish-grouper', 'Grouper', placeholderFish('#7d6b55', '#b8a27e', '#4d4033')),
  localFishPlaceholder('fish-barracuda', 'Barracuda', placeholderFish('#6f8f8d', '#c8d6cb', '#344f51')),
  localFishPlaceholder('fish-mahi-mahi', 'Mahi-Mahi', placeholderFish('#20a6a5', '#f2c94c', '#147785')),
  localFishPlaceholder('fish-blacktip-reef-shark', 'Blacktip Reef Shark', placeholderFish('#778990', '#d9e1df', '#111b22')),
  localFishPlaceholder('fish-hammerhead-shark', 'Hammerhead Shark', placeholderFish('#687a82', '#aebac0', '#3d4a50')),
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
