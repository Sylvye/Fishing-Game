import type { AssetManifestEntry } from '../types';

const placeholder = (path: string) => new URL(path, import.meta.url).href;

export const assetManifest: AssetManifestEntry[] = [
  {
    id: 'fish-bluegill',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/bluegill.svg'),
    displayName: 'Bluegill placeholder',
    license: 'CC0 1.0 / local simplified derivative placeholder',
    attribution: 'Inspired by Wikimedia Commons file "Bluegill sunfish silhouette.svg" by Abyssal, CC0.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bluegill_sunfish_silhouette.svg',
    replacementNotes: 'Replace with a transparent PNG or SVG facing right, around 256x128.',
  },
  {
    id: 'fish-largemouth-bass',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/largemouth-bass.svg'),
    displayName: 'Largemouth Bass placeholder',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Denton Largemouth Bass 1896.png", public domain.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Denton_Largemouth_Bass_1896.png',
    replacementNotes: 'Replace with a side-profile bass sprite. Keep transparent background for best results.',
  },
  {
    id: 'fish-smallmouth-bass',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/smallmouth-bass.png'),
    displayName: 'Smallmouth Bass placeholder',
    license: 'Public domain, U.S. Fish and Wildlife Service',
    attribution: 'Duane Raver / U.S. Fish and Wildlife Service via Wikimedia Commons.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Smallmouth_bass.png',
    replacementNotes: 'Current file is a downloaded transparent Wikimedia PNG; replace with same aspect ratio if possible.',
  },
  {
    id: 'fish-rainbow-trout',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/rainbow-trout.svg'),
    displayName: 'Rainbow Trout placeholder',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Rainbow Trout.jpg", public domain, U.S. Fish and Wildlife Service.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rainbow_Trout.jpg',
    replacementNotes: 'Use a side-profile trout sprite with transparent background.',
  },
  {
    id: 'fish-channel-catfish',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/channel-catfish.svg'),
    displayName: 'Channel Catfish placeholder',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Ictalurus punctatus.jpg", public domain, U.S. Fish and Wildlife Service.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Ictalurus_punctatus.jpg',
    replacementNotes: 'Long, low silhouette sprites read best for catfish.',
  },
  {
    id: 'fish-northern-pike',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/northern-pike.svg'),
    displayName: 'Northern Pike placeholder',
    license: 'Public domain inspired local placeholder',
    attribution: 'Reference source: Wikimedia Commons file "Esox lucius1.jpg", public domain.',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Esox_lucius1.jpg',
    replacementNotes: 'Use a long side-profile pike image facing right.',
  },
  {
    id: 'fish-walleye',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/walleye.svg'),
    displayName: 'Walleye placeholder',
    license: 'Local placeholder',
    attribution: 'Local simplified placeholder; replace with licensed real walleye art or photo.',
    replacementNotes: 'Use a transparent side-profile walleye sprite.',
  },
  {
    id: 'fish-common-carp',
    kind: 'fish',
    src: placeholder('../assets/placeholders/fish/common-carp.svg'),
    displayName: 'Common Carp placeholder',
    license: 'Local placeholder',
    attribution: 'Local simplified placeholder; replace with licensed real common carp art or photo.',
    replacementNotes: 'Use a deeper-bodied carp sprite with transparent background.',
  },
  {
    id: 'rod-bamboo',
    kind: 'rod',
    src: placeholder('../assets/placeholders/items/rod-bamboo.svg'),
    displayName: 'Bamboo Rod placeholder',
    license: 'Local placeholder',
    attribution: 'Created for this project.',
    replacementNotes: 'Replace with a horizontal rod sprite or shop icon.',
  },
  {
    id: 'boat-rowboat',
    kind: 'boat',
    src: placeholder('../assets/placeholders/items/boat-rowboat.svg'),
    displayName: 'Rowboat placeholder',
    license: 'Local placeholder',
    attribution: 'Created for this project.',
    replacementNotes: 'Replace with a side-view boat sprite.',
  },
  {
    id: 'lure-spoon',
    kind: 'lure',
    src: placeholder('../assets/placeholders/items/lure-spoon.svg'),
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
