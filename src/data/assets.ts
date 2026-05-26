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
