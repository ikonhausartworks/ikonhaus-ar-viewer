// src/data/artworks.ts

export type ArtworkSize = {
  id: string;          // e.g. "madness-16x20"
  label: string;       // e.g. "16 x 20 in"
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;  // image used as the artwork texture
  pdpUrl: string;
  cartUrl: string;
};

export type Artwork = {
  id: string;             // e.g. "madness-is-genius"
  title: string;
  defaultSizeId: string;
  sizes: ArtworkSize[];
};

const MADNESS_IMAGE_URL =
  "https://static.wixstatic.com/media/f656fb_ac93c8c638b94cdd88ad3c70cbffebae~mv2.png/v1/fit/w_1080,h_700,q_90,enc_avif,quality_auto/f656fb_ac93c8c638b94cdd88ad3c70cbffebae~mv2.png";

export const artworks: Artwork[] = [
  {
    id: "madness-is-genius",
    title: "Madness is Genius",
    defaultSizeId: "madness-16x20",
    sizes: [
      {
        id: "madness-16x20",
        label: "16 x 20 in",
        widthMeters: 0.4064,
        heightMeters: 0.508,
        textureUrl: MADNESS_IMAGE_URL,
        pdpUrl: "https://ikonhaus.art/products/madness-is-genius-16x20",
        cartUrl: "https://ikonhaus.art/cart?add=madness-16x20",
      },
      {
        id: "madness-24x36",
        label: "24 x 36 in",
        widthMeters: 0.6096,
        heightMeters: 0.9144,
        textureUrl: MADNESS_IMAGE_URL,
        pdpUrl: "https://ikonhaus.art/products/madness-is-genius-24x36",
        cartUrl: "https://ikonhaus.art/cart?add=madness-24x36",
      },
    ],
  },
];
