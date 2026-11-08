/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Official STOA PICTURES Pricelist Catalog (2026)
 * Source of truth from https://stoapricelist.ai.studio/
 * Location: Pematangsiantar, Sumatera Utara
 */

export interface StoaPackageDeliverable {
  label: string;
  isHighlight?: boolean;
}

export interface StoaPackage {
  id: string;
  name: string;
  subtitle: string;
  category: 'Silver Collection' | 'Gold Collection' | 'Engagement & Prewedding' | 'Bundling & Custom';
  categoryLabel?: string;
  price: number;
  priceFormatted: string;
  crew: string;
  album: string;
  printFrame: string;
  videoDocumentation: string;
  drone: boolean;
  weddingCinema: boolean;
  reelsHighlight: boolean;
  storage: string;
  coverage?: string;
  idealFor?: string;
  isBestSeller?: boolean;
  tierBadge?: string;
  defaultPrintingCost: number;
  deliverables?: StoaPackageDeliverable[];
}

export const STOA_STUDIO_INFO = {
  studioName: 'STOA PICTURES FOTO STUDIO',
  tagline: 'PREMIUM WEDDING PHOTOGRAPHY & CINEMATOGRAPHY',
  coreValues: 'PROFESSIONAL · CREATIVE · MEMORABLE',
  npwp: '60.411.372.0-117.000',
  whatsappNumber: '6281372581671',
  whatsappDisplay: '0813 7258 1671',
  instagramHandle: '@stoapictures',
  instagramUrl: 'https://www.instagram.com/stoapictures',
  location: 'Pematangsiantar, Sumatera Utara',
  studioAddress: 'Jl. Raider No.15, Bukit Sofa, Kec. Siantar Sitalasari, Kota Pematang Siantar, Sumatera Utara 21113',
  mapsUrl: 'https://maps.app.goo.gl/kneJdsX2tCtQ5Cjr9',
  bankAccount: {
    bank: 'Bank BCA',
    accountNumber: '8375119583',
    accountHolder: 'BUDI ANTO'
  },
  promoBundling: {
    title: 'Bundling Engagement + Wedding',
    discountAmount: 500000,
    discountDisplay: 'Hemat Rp 500.000',
    description: 'Dapatkan potongan langsung Rp 500.000 khusus jika memesan Paket Pernikahan (Silver / Gold) bersamaan dengan Paket Engagement!'
  }
};

export const STOA_PRICELIST_PACKAGES: StoaPackage[] = [
  {
    id: 'silver-standart',
    name: 'Silver Standart',
    subtitle: 'Dokumentasi Esensial Pernikahan Lengkap & Khidmat',
    category: 'Silver Collection',
    categoryLabel: 'Silver Collection',
    price: 5000000,
    priceFormatted: 'Rp 5.000.000',
    crew: 'Tim Dokumentasi STOA Pictures',
    album: 'Cetak Album Magnetic 10 Sheet',
    printFrame: '1 Cetak 18 Inch + Frame',
    videoDocumentation: 'Video Dokumentasi 3 - 4 Jam',
    drone: false,
    weddingCinema: false,
    reelsHighlight: false,
    storage: 'All files in Flashdisc',
    coverage: 'Morning Preparation hingga Reception Selesai',
    idealFor: 'Pernikahan intim dan keluarga yang menginginkan dokumentasi foto & video lengkap tanpa jeda dengan album magnetik klasik.',
    defaultPrintingCost: 800000,
    deliverables: [
      { label: 'Unlimited Photo (Semua file foto diambil)' },
      { label: 'Cetak ALBUM MAGNETIC 10 Sheet' },
      { label: 'Video Dokumentasi 3 - 4 Jam' },
      { label: 'Liputan Morning Preparation hingga Reception' },
      { label: '1 Cetak 18 Inch + Frame' },
      { label: 'All Edited Files' },
      { label: 'Semua file diserahkan dalam Flashdisc' }
    ]
  },
  {
    id: 'silver-signature',
    name: 'Silver Signature',
    subtitle: 'Sentuhan Sinematik dengan Album Magazine Eksklusif',
    category: 'Silver Collection',
    categoryLabel: 'Silver Collection',
    price: 7500000,
    priceFormatted: 'Rp 7.500.000',
    tierBadge: 'Popular',
    crew: 'Tim Dokumentasi STOA Pictures',
    album: 'Cetak Album Megazine 10 Sheet',
    printFrame: '1 Cetak 18 Inch + Frame',
    videoDocumentation: 'Wedding Cinema + Video Dokumentasi 3 - 4 Jam',
    drone: false,
    weddingCinema: true,
    reelsHighlight: false,
    storage: 'All files in Flashdisc',
    coverage: 'Morning Preparation hingga Reception Selesai',
    idealFor: 'Pasangan yang menginginkan video cinematic pernikahan berkelas dan album magazine cetak berkualitas tinggi.',
    defaultPrintingCost: 1200000,
    deliverables: [
      { label: 'Unlimited Photo' },
      { label: 'Cetak ALBUM MEGAZINE 10 Sheet', isHighlight: true },
      { label: 'Wedding Cinema (Video Cinematic Pernikahan)', isHighlight: true },
      { label: 'Video Dokumentasi 3 - 4 Jam' },
      { label: 'Morning Preparation hingga Reception' },
      { label: '1 Cetak 18 Inch + Frame' },
      { label: 'All Edited Files' },
      { label: 'All files in Flashdisc', isHighlight: true }
    ]
  },
  {
    id: 'gold-premium',
    name: 'Gold Premium',
    subtitle: 'Dokumentasi Komprehensif dengan Drone Aerial & Frame Besar',
    category: 'Gold Collection',
    categoryLabel: 'Gold Collection',
    price: 8500000,
    priceFormatted: 'Rp 8.500.000',
    isBestSeller: true,
    tierBadge: 'BEST SELLER',
    crew: 'Tim Dokumentasi STOA Pictures',
    album: 'Cetak Album Megazine 10 Sheet',
    printFrame: '1 Cetak 24 Inch + Frame',
    videoDocumentation: 'Wedding Cinema + DRONE Aerial Footage + Video Dokumentasi 3 - 4 Jam',
    drone: true,
    weddingCinema: true,
    reelsHighlight: false,
    storage: 'All files in Flashdisc',
    coverage: 'Morning Preparation hingga Reception Selesai',
    idealFor: 'Pilihan paling favorit bagi calon pengantin! Sudah mencakup Wedding Cinema + Drone Aerial untuk merekam kemegahan gereja dan gedung acara.',
    defaultPrintingCost: 1500000,
    deliverables: [
      { label: 'Unlimited Photo' },
      { label: 'Cetak ALBUM MEGAZINE 10 Sheet', isHighlight: true },
      { label: 'Wedding Cinema + DRONE Aerial Footage', isHighlight: true },
      { label: 'Video Dokumentasi 3 - 4 Jam' },
      { label: 'Morning Preparation hingga Reception' },
      { label: '1 Cetak 24 Inch + Frame (Upgrade Ukuran)', isHighlight: true },
      { label: 'All Edited Files' },
      { label: 'All files in Flashdisc', isHighlight: true }
    ]
  },
  {
    id: 'gold-prestige',
    name: 'GOLD Prestige',
    subtitle: 'Masterpiece Dokumentasi Tertinggi: Drone & Reels Highlight',
    category: 'Gold Collection',
    categoryLabel: 'Gold Collection',
    price: 9500000,
    priceFormatted: 'Rp 9.500.000',
    tierBadge: 'Ultimate Flagship',
    crew: 'Tim Dokumentasi STOA Pictures',
    album: 'Cetak Album Megazine 10 Sheet',
    printFrame: '1 Cetak 24 Inch + Frame',
    videoDocumentation: 'Wedding Cinema + DRONE + Video Highlight (1 Menit Reels Instagram/TikTok)',
    drone: true,
    weddingCinema: true,
    reelsHighlight: true,
    storage: 'All files in Flashdisc',
    coverage: 'Morning Preparation hingga Reception Selesai',
    idealFor: 'Pengalaman pernikahan terlengkap tanpa kompromi: multi-angle maksimal, drone udara, dan reels highlight vertikal siap share.',
    defaultPrintingCost: 1800000,
    deliverables: [
      { label: 'Unlimited Photo' },
      { label: 'Cetak ALBUM MEGAZINE 10 Sheet', isHighlight: true },
      { label: 'Wedding Cinema + DRONE Aerial Footage', isHighlight: true },
      { label: 'Video Highlight (1 Menit Reels Format siap IG/TikTok)', isHighlight: true },
      { label: 'Video Dokumentasi 3 - 4 Jam' },
      { label: 'Morning Preparation hingga Reception' },
      { label: '1 Cetak 24 Inch + Frame' },
      { label: 'All Edited Files' },
      { label: 'All files in Flashdisc', isHighlight: true }
    ]
  },
  {
    id: 'engagement',
    name: 'Engagement',
    subtitle: 'Dokumentasi Momen Lamaran & Pertunangan Hangat',
    category: 'Engagement & Prewedding',
    categoryLabel: 'Engagement & Prewedding',
    price: 1600000,
    priceFormatted: 'Rp 1.600.000',
    crew: 'Tim Dokumentasi STOA Pictures',
    album: 'Cetak Album Mini Eksklusif',
    printFrame: '-',
    videoDocumentation: 'Dokumentasi Foto Khusus',
    drone: false,
    weddingCinema: false,
    reelsHighlight: false,
    storage: 'All files in Flashdisc',
    coverage: 'Rangkaian Acara Lamaran / Pertunangan',
    idealFor: 'Momen pertunangan/lamaran sebelum hari H pernikahan. Simpan memori manis tukar cincin dan kehangatan keluarga kedua belah pihak.',
    defaultPrintingCost: 400000,
    deliverables: [
      { label: 'Unlimited Photo' },
      { label: 'Cetak Album Mini Eksklusif', isHighlight: true },
      { label: 'All Edited Files' },
      { label: 'All files in Flashdisc' },
      { label: 'Bisa dibundling dengan Wedding (Hemat Rp 500.000)' }
    ]
  },
  {
    id: 'prewedding-studio',
    name: 'Prewedding Studio',
    subtitle: 'Sesi Foto Studio Berkonsep dengan Make Up & Hairdo',
    category: 'Engagement & Prewedding',
    categoryLabel: 'Engagement & Prewedding',
    price: 1800000,
    priceFormatted: 'Rp 1.800.000',
    crew: 'Tim Studio STOA Pictures',
    album: 'Softcopy Google Drive High-Res',
    printFrame: '1 Cetak 24 Inch + Frame Display',
    videoDocumentation: '-',
    drone: false,
    weddingCinema: false,
    reelsHighlight: false,
    storage: 'All File Edit by Google Drive',
    coverage: 'Sesi Pemotretan Studio (Max 2 Look)',
    idealFor: 'Pasangan yang ingin foto prewedding rapi di dalam studio dengan riasan profesional dan hasil cetak frame besar 24 inch untuk dipajang di resepsi.',
    defaultPrintingCost: 500000,
    deliverables: [
      { label: 'Maksimal 2 Look / Konsep Foto' },
      { label: '1 Cetak 24 Inch + Frame (Siap Display di Resepsi)', isHighlight: true },
      { label: 'Sudah Termasuk Make Up & Hairdo Profesional', isHighlight: true },
      { label: 'All File Edit diserahkan via Google Drive' },
      { label: 'Opsi Tambahan: Include Baju Adat (+ Rp 300.000)' }
    ]
  },
  {
    id: 'bundling-engagement-wedding',
    name: 'Bundling Engagement + Wedding',
    subtitle: 'Paket Hemat Lamaran + Pernikahan (Potongan Rp 500.000)',
    category: 'Bundling & Custom',
    categoryLabel: 'Bundling & Custom',
    price: 8500000 + 1600000 - 500000, // Gold Premium + Engagement - 500k = 9.600.000
    priceFormatted: 'Rp 9.600.000 (Hemat 500rb)',
    tierBadge: 'Promo Hemat',
    crew: 'Tim Dokumentasi STOA Pictures',
    album: 'Album Megazine + Album Mini Lamaran',
    printFrame: '1 Cetak 24 Inch + Frame',
    videoDocumentation: 'Wedding Cinema + Video Dokumentasi + Drone Aerial',
    drone: true,
    weddingCinema: true,
    reelsHighlight: false,
    storage: 'All files in Flashdisc',
    defaultPrintingCost: 1900000,
    deliverables: [
      { label: 'Paket Wedding Pilihan (Silver / Gold)' },
      { label: 'Paket Dokumentasi Lamaran / Engagement Lengkap' },
      { label: 'Potongan Diskon Langsung Rp 500.000', isHighlight: true },
      { label: 'Cetak Album Megazine + Album Mini' },
      { label: 'Semua File Master & Edit dalam Flashdisc' }
    ]
  },
  {
    id: 'custom-package',
    name: 'Custom Package / Layanan Khusus',
    subtitle: 'Paket Khusus Disesuaikan dengan Kesepakatan Klien',
    category: 'Bundling & Custom',
    categoryLabel: 'Bundling & Custom',
    price: 0,
    priceFormatted: 'Custom / Sesuai Kesepakatan',
    crew: 'Sesuai Request',
    album: 'Sesuai Request',
    printFrame: 'Sesuai Request',
    videoDocumentation: 'Sesuai Request',
    drone: false,
    weddingCinema: false,
    reelsHighlight: false,
    storage: 'Sesuai Request',
    defaultPrintingCost: 1000000
  }
];

export const STOA_PACKAGE_NAMES = STOA_PRICELIST_PACKAGES.map(p => p.name);

export function getPackageByName(name: string): StoaPackage | undefined {
  if (!name) return undefined;
  const cleanName = name.trim().toLowerCase();
  return STOA_PRICELIST_PACKAGES.find(
    p => p.name.toLowerCase() === cleanName || p.id.toLowerCase() === cleanName
  );
}

// Standard Expense Categories required by STOA PICTURES (FG 1, FG 2, Shooting, Editor, Cetak, Cinema, Transport, Other)
export const STOA_EXPENSE_CATEGORIES = [
  {
    id: 'FG 1',
    label: 'FG 1 (First Photographer / Lead FG)',
    icon: 'Camera',
    defaultRecipient: 'First FG STOA',
    placeholder: 'Contoh: 1.500.000'
  },
  {
    id: 'FG 2',
    label: 'FG 2 (Second Photographer)',
    icon: 'UserCheck',
    defaultRecipient: 'Second FG STOA',
    placeholder: 'Contoh: 800.000'
  },
  {
    id: 'Shooting',
    label: 'Shooting (Liputan Acara Hari H)',
    icon: 'Camera',
    defaultRecipient: 'Crew Shooting STOA',
    placeholder: 'Contoh: 500.000'
  },
  {
    id: 'Editor',
    label: 'Editor (Editing Foto & Video)',
    icon: 'Film',
    defaultRecipient: 'Team Editor STOA',
    placeholder: 'Contoh: 600.000'
  },
  {
    id: 'Cetak',
    label: 'Cetak (Album & Frame Cetak)',
    icon: 'Printer',
    defaultRecipient: 'Lab Percetakan Album',
    placeholder: 'Contoh: 1.200.000'
  },
  {
    id: 'Cinema',
    label: 'Cinema (Videographer / Drone)',
    icon: 'Video',
    defaultRecipient: 'Cinema & Drone Crew',
    placeholder: 'Contoh: 1.200.000'
  },
  {
    id: 'Transport / Akomodasi',
    label: 'Transport / Akomodasi (BBM, Tol, Hotel)',
    icon: 'Car',
    defaultRecipient: 'Operasional Transport',
    placeholder: 'Contoh: 400.000'
  },
  {
    id: 'Other Expenses',
    label: 'Other Expenses (Biaya Tak Terduga / Konsumsi)',
    icon: 'Receipt',
    defaultRecipient: 'Pengeluaran Lainnya',
    placeholder: 'Contoh: 250.000'
  }
] as const;
