(function initBadSantaIcons(globalScope) {
  const GIFT_ICONS = [
    { id: 'gift', label: 'Present' },
    { id: 'coffee', label: 'Coffee & Mug' },
    { id: 'headphones', label: 'Tech & Audio' },
    { id: 'voucher', label: 'Gift Card' },
    { id: 'wine', label: 'Drinks' },
    { id: 'candle', label: 'Home & Candle' },
    { id: 'chocolate', label: 'Food & Treats' },
    { id: 'game', label: 'Games & Fun' },
    { id: 'controller', label: 'Gadget' },
    { id: 'cozy', label: 'Cozy & Apparel' },
    { id: 'plant', label: 'Plant & Decor' },
    { id: 'book', label: 'Book' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'music', label: 'Music' },
    { id: 'gem', label: 'Luxury' },
    { id: 'gag', label: 'Gag Gift' }
  ];

  const THEMES = [
    {
      id: 'evergreen',
      name: 'Velvet Lodge',
      subtitle: 'Classic Pine & Crimson',
      swatches: ['#0c221b', '#d62839', '#f4c542']
    },
    {
      id: 'winter-noir',
      name: 'Midnight Frost',
      subtitle: 'Arctic Navy & Ice',
      swatches: ['#091526', '#38bdf8', '#f43f5e']
    },
    {
      id: 'retro-arcade',
      name: 'Naughty Neon',
      subtitle: 'Game Show Electric',
      swatches: ['#190b28', '#ff2e88', '#ffd166']
    },
    {
      id: 'nordic-paper',
      name: 'Scandi Craft',
      subtitle: 'Bright Meeting Room',
      swatches: ['#f7f1e3', '#1b4d3e', '#c82333']
    }
  ];

  // Hand-crafted vector graphics (all crisp at any TV resolution, theme-reactive via CSS vars)
  const SVGS = {
    // Brand: Cheeky Bad Santa Hat + Shades Emblem
    badSantaLogo: `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 25C11.5 13 21 7 32 9.5C37 10.7 40 14.5 41 19" fill="var(--brand-hat, #d62839)"/>
      <path d="M10 25C11.5 13 21 7 32 9.5C37 10.7 40 14.5 41 19L34 22C32 18 28 16.5 23 17.5C18 18.5 14 21 10 25Z" fill="var(--brand-hat-shade, #a91d2b)"/>
      <circle cx="40.5" cy="19.5" r="4.5" fill="var(--brand-trim, #fff8eb)"/>
      <rect x="6" y="22" width="32" height="7" rx="3.5" fill="var(--brand-trim, #fff8eb)"/>
      <path d="M10 31.5H34C34 38 28.8 42.5 22 42.5C15.2 42.5 10 38 10 31.5Z" fill="var(--brand-trim, #fff8eb)" fill-opacity="0.92"/>
      <rect x="10.5" y="29" width="10" height="6" rx="2.5" fill="#13191d" stroke="var(--gold, #f4c542)" stroke-width="1.5"/>
      <rect x="23.5" y="29" width="10" height="6" rx="2.5" fill="#13191d" stroke="var(--gold, #f4c542)" stroke-width="1.5"/>
      <path d="M20.5 31.5H23.5" stroke="var(--gold, #f4c542)" stroke-width="1.8"/>
      <path d="M12.5 31L15 33.2M25.5 31L28 33.2" stroke="#ffffff" stroke-opacity="0.55" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M19 38.5C20.5 39.8 24 39.8 26 38" stroke="var(--brand-hat, #d62839)" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

    // Empty stage decorative gift pile vector
    heroGifts: `<svg viewBox="0 0 180 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="90" cy="98" rx="68" ry="8" fill="currentColor" fill-opacity="0.14"/>
      <!-- Left small gift -->
      <rect x="24" y="54" width="40" height="40" rx="6" fill="var(--accent-alt, #2a9d8f)"/>
      <rect x="21" y="48" width="46" height="11" rx="4" fill="var(--accent-alt-hi, #38b2a3)"/>
      <rect x="41" y="48" width="6" height="46" fill="var(--gold, #f4c542)"/>
      <path d="M44 48C38 40 31 41 33 46C34.5 48.5 40 48 44 48ZM44 48C50 40 57 41 55 46C53.5 48.5 48 48 44 48Z" fill="var(--gold, #f4c542)"/>
      <!-- Right medium gift -->
      <rect x="114" y="46" width="44" height="48" rx="6" fill="var(--frost, #38bdf8)" fill-opacity="0.85"/>
      <rect x="111" y="40" width="50" height="11" rx="4" fill="var(--frost, #38bdf8)"/>
      <rect x="133" y="40" width="6" height="54" fill="var(--crimson, #d62839)"/>
      <path d="M136 40C130 32 123 33 125 38C126.5 40.5 132 40 136 40ZM136 40C142 32 149 33 147 38C145.5 40.5 140 40 136 40Z" fill="var(--crimson, #d62839)"/>
      <!-- Center hero gift -->
      <rect x="58" y="38" width="64" height="58" rx="8" fill="var(--crimson, #d62839)"/>
      <rect x="54" y="30" width="72" height="14" rx="5" fill="var(--crimson-hi, #e63946)"/>
      <rect x="85" y="30" width="10" height="66" fill="var(--gold, #f4c542)"/>
      <rect x="58" y="61" width="64" height="8" fill="var(--gold, #f4c542)" fill-opacity="0.85"/>
      <path d="M90 30C81 17 70 19 73 27C75 31 84 30 90 30ZM90 30C99 17 110 19 107 27C105 31 96 30 90 30Z" fill="var(--gold, #f4c542)"/>
      <!-- Sparkles -->
      <path d="M36 22L38 27L43 29L38 31L36 36L34 31L29 29L34 27L36 22Z" fill="var(--gold, #f4c542)"/>
      <path d="M148 16L149.8 20.2L154 22L149.8 23.8L148 28L146.2 23.8L142 22L146.2 20.2L148 16Z" fill="var(--gold, #f4c542)"/>
      <circle cx="118" cy="18" r="2.5" fill="var(--gold-soft, #ffe28a)"/>
    </svg>`,

    // Finale crest vector
    finaleCrest: `<svg viewBox="0 0 120 84" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="42" r="32" stroke="var(--gold, #f4c542)" stroke-width="2.5" stroke-dasharray="5 5" opacity="0.65"/>
      <path d="M40 24H80V38C80 49 71 58 60 58C49 58 40 49 40 38V24Z" fill="var(--gold, #f4c542)"/>
      <path d="M40 28H30C30 38 34 44 42 44" stroke="var(--gold, #f4c542)" stroke-width="4" stroke-linecap="round"/>
      <path d="M80 28H90C90 38 86 44 78 44" stroke="var(--gold, #f4c542)" stroke-width="4" stroke-linecap="round"/>
      <rect x="55" y="56" width="10" height="12" fill="var(--gold, #f4c542)"/>
      <rect x="44" y="66" width="32" height="7" rx="3.5" fill="var(--crimson, #d62839)"/>
      <path d="M60 31L62.6 36.4L68.5 37.2L64.2 41.4L65.2 47.2L60 44.4L54.8 47.2L55.8 41.4L51.5 37.2L57.4 36.4L60 31Z" fill="#1c1402"/>
      <path d="M22 18L24 23L29 25L24 27L22 32L20 27L15 25L20 23L22 18Z" fill="var(--gold-soft, #ffe28a)"/>
      <path d="M98 14L100 19L105 21L100 23L98 28L96 23L91 21L96 19L98 14Z" fill="var(--gold-soft, #ffe28a)"/>
    </svg>`,

    // ==================== GIFT CATEGORY VECTORS ====================
    gift: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="6" y="15" width="24" height="16" rx="3" fill="var(--crimson, #d62839)"/>
      <rect x="4" y="11" width="28" height="6" rx="2.5" fill="var(--crimson-hi, #e63946)"/>
      <rect x="16" y="11" width="4" height="20" fill="var(--gold, #f4c542)"/>
      <path d="M18 11C14.5 5.5 10 6.5 11.2 9.8C12 11.4 15.5 11 18 11ZM18 11C21.5 5.5 26 6.5 24.8 9.8C24 11.4 20.5 11 18 11Z" fill="var(--gold, #f4c542)"/>
    </svg>`,

    coffee: `<svg viewBox="0 0 36 36" fill="none">
      <path d="M8 14H24V24C24 27.3 21.3 30 18 30H14C10.7 30 8 27.3 8 24V14Z" fill="var(--gold, #f4c542)"/>
      <path d="M24 16H27C28.9 16 30.5 17.6 30.5 19.5C30.5 21.4 28.9 23 27 23H24" stroke="var(--gold, #f4c542)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M12 10C12 8.2 13.4 7.5 13.4 5.8M16.5 10C16.5 8.2 17.9 7.5 17.9 5.8M21 10C21 8.2 22.4 7.5 22.4 5.8" stroke="var(--frost, #7cd4fd)" stroke-width="2" stroke-linecap="round"/>
      <rect x="10" y="17" width="12" height="3" rx="1.5" fill="var(--crimson, #d62839)" fill-opacity="0.75"/>
    </svg>`,

    headphones: `<svg viewBox="0 0 36 36" fill="none">
      <path d="M7 21V18C7 11.9 11.9 7 18 7C24.1 7 29 11.9 29 18V21" stroke="var(--frost, #7cd4fd)" stroke-width="3" stroke-linecap="round"/>
      <rect x="5" y="19" width="6.5" height="11" rx="3.2" fill="var(--crimson, #d62839)"/>
      <rect x="24.5" y="19" width="6.5" height="11" rx="3.2" fill="var(--crimson, #d62839)"/>
      <rect x="10" y="21" width="2" height="7" rx="1" fill="var(--gold, #f4c542)"/>
      <rect x="24" y="21" width="2" height="7" rx="1" fill="var(--gold, #f4c542)"/>
    </svg>`,

    voucher: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="4" y="9" width="28" height="18" rx="4" fill="var(--gold, #f4c542)"/>
      <rect x="4" y="14" width="28" height="4.5" fill="var(--crimson, #d62839)"/>
      <circle cx="11" cy="22.5" r="2" fill="#1c1402" fill-opacity="0.45"/>
      <rect x="16" y="21" width="12" height="2.8" rx="1.4" fill="#1c1402" fill-opacity="0.45"/>
    </svg>`,

    wine: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="10" y="5" width="4.5" height="6" rx="1" fill="var(--gold, #f4c542)"/>
      <path d="M9.5 11H15L16.5 16V30C16.5 31.1 15.6 32 14.5 32H10C8.9 32 8 31.1 8 30V16L9.5 11Z" fill="var(--accent-alt, #2a9d8f)"/>
      <rect x="9.5" y="19" width="5.5" height="7" rx="1" fill="var(--gold, #f4c542)"/>
      <path d="M21 14H29L28 20.5C27.7 22.5 26.2 23.8 25 23.8C23.8 23.8 22.3 22.5 22 20.5L21 14Z" fill="var(--crimson, #d62839)"/>
      <path d="M25 23.8V31M22 31H28" stroke="var(--gold-soft, #ffe28a)" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    candle: `<svg viewBox="0 0 36 36" fill="none">
      <path d="M18 4C18 4 22.5 8.5 22.5 11.8C22.5 14.3 20.5 16 18 16C15.5 16 13.5 14.3 13.5 11.8C13.5 8.5 18 4 18 4Z" fill="var(--gold, #f4c542)"/>
      <path d="M18 9C18 9 20 11 20 12.6C20 13.8 19.1 14.6 18 14.6C16.9 14.6 16 13.8 16 12.6C16 11 18 9 18 9Z" fill="var(--crimson, #d62839)"/>
      <rect x="10" y="17" width="16" height="15" rx="3" fill="var(--frost, #7cd4fd)" fill-opacity="0.85"/>
      <path d="M10 21C13 23 15 19 18 21C21 23 23 19 26 21" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    chocolate: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="7" y="6" width="22" height="24" rx="4" fill="#7c4728"/>
      <rect x="10" y="9" width="6.5" height="5" rx="1.2" fill="#9c5c36"/>
      <rect x="19.5" y="9" width="6.5" height="5" rx="1.2" fill="#9c5c36"/>
      <rect x="10" y="16" width="6.5" height="5" rx="1.2" fill="#9c5c36"/>
      <rect x="19.5" y="16" width="6.5" height="5" rx="1.2" fill="#9c5c36"/>
      <path d="M7 22H29V26C29 28.2 27.2 30 25 30H11C8.8 30 7 28.2 7 26V22Z" fill="var(--crimson, #d62839)"/>
      <rect x="7" y="21" width="22" height="2.8" fill="var(--gold, #f4c542)"/>
    </svg>`,

    game: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="6" y="6" width="24" height="24" rx="5.5" fill="var(--gold, #f4c542)"/>
      <circle cx="12.5" cy="12.5" r="2.2" fill="#1c1402"/>
      <circle cx="23.5" cy="12.5" r="2.2" fill="#1c1402"/>
      <circle cx="18" cy="18" r="2.2" fill="var(--crimson, #d62839)"/>
      <circle cx="12.5" cy="23.5" r="2.2" fill="#1c1402"/>
      <circle cx="23.5" cy="23.5" r="2.2" fill="#1c1402"/>
    </svg>`,

    controller: `<svg viewBox="0 0 36 36" fill="none">
      <path d="M10 12H26C29.5 12 31.8 15 31.3 18.6L30.2 25.4C29.8 27.6 27.2 28.6 25.6 27L22.5 24H13.5L10.4 27C8.8 28.6 6.2 27.6 5.8 25.4L4.7 18.6C4.2 15 6.5 12 10 12Z" fill="var(--frost, #38bdf8)"/>
      <path d="M12 15.5V20.5M9.5 18H14.5" stroke="#0c1c2c" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23.5" cy="16.8" r="1.6" fill="var(--crimson, #d62839)"/>
      <circle cx="26.2" cy="19.5" r="1.6" fill="var(--gold, #f4c542)"/>
    </svg>`,

    cozy: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="7" y="9" width="22" height="10" rx="5" fill="var(--crimson, #d62839)"/>
      <rect x="19" y="15" width="8" height="15" rx="3" fill="var(--crimson-hi, #e63946)"/>
      <path d="M12 9V19M19 22H27M19 26H27" stroke="var(--gold, #f4c542)" stroke-width="2.4"/>
      <path d="M21 30V32.5M25 30V32.5" stroke="var(--gold, #f4c542)" stroke-width="2" stroke-linecap="round"/>
    </svg>`,

    plant: `<svg viewBox="0 0 36 36" fill="none">
      <path d="M11 21H25L23 31H13L11 21Z" fill="var(--crimson, #d62839)"/>
      <rect x="9.5" y="18.5" width="17" height="3.5" rx="1.5" fill="var(--crimson-hi, #e63946)"/>
      <path d="M18 18.5C18 11 24 8 27 9C27 14 23 18.5 18 18.5Z" fill="var(--accent-alt, #2a9d8f)"/>
      <path d="M18 18.5C18 11 12 7 9 9C9 14 13 18.5 18 18.5Z" fill="#4ade80"/>
      <path d="M18 18.5V7" stroke="var(--gold-soft, #ffe28a)" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`,

    book: `<svg viewBox="0 0 36 36" fill="none">
      <path d="M8 7H25C26.7 7 28 8.3 28 10V29H11C9.3 29 8 27.7 8 26V7Z" fill="var(--accent-alt, #2a9d8f)"/>
      <path d="M8 25.5C8 23.8 9.3 22.5 11 22.5H28V29H11C9.3 29 8 27.7 8 26V25.5Z" fill="#f7f4ea"/>
      <rect x="13" y="11.5" width="10" height="2.6" rx="1.3" fill="var(--gold, #f4c542)"/>
      <rect x="13" y="16" width="7" height="2" rx="1" fill="var(--gold-soft, #ffe28a)" fill-opacity="0.7"/>
    </svg>`,

    kitchen: `<svg viewBox="0 0 36 36" fill="none">
      <rect x="6" y="16" width="24" height="13" rx="4" fill="var(--frost, #7cd4fd)"/>
      <path d="M12 16V13C12 10.8 14.7 9 18 9C21.3 9 24 10.8 24 13V16" stroke="var(--gold, #f4c542)" stroke-width="2.5"/>
      <rect x="10" y="20" width="16" height="5" rx="2" fill="var(--crimson, #d62839)"/>
      <circle cx="14" cy="22.5" r="1.2" fill="var(--gold, #f4c542)"/>
      <circle cx="22" cy="22.5" r="1.2" fill="var(--gold, #f4c542)"/>
    </svg>`,

    music: `<svg viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="12" fill="#182026" stroke="var(--gold, #f4c542)" stroke-width="2"/>
      <circle cx="18" cy="18" r="7.5" stroke="#ffffff" stroke-opacity="0.2" stroke-width="1.4"/>
      <circle cx="18" cy="18" r="4.5" fill="var(--crimson, #d62839)"/>
      <circle cx="18" cy="18" r="1.5" fill="var(--gold, #f4c542)"/>
    </svg>`,

    gem: `<svg viewBox="0 0 36 36" fill="none">
      <polygon points="11,8 25,8 31,15 18,30 5,15" fill="var(--frost, #38bdf8)"/>
      <polygon points="11,8 25,8 22,15 14,15" fill="#ffffff" fill-opacity="0.45"/>
      <polygon points="14,15 22,15 18,30" fill="#ffffff" fill-opacity="0.2"/>
    </svg>`,

    gag: `<svg viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="12.5" fill="var(--gold, #f4c542)"/>
      <path d="M14.5 14C14.5 11.8 16 10.5 18.2 10.5C20.4 10.5 22 11.9 22 13.8C22 15.6 20.5 16.5 19.2 17.3C18.3 17.9 18 18.5 18 19.8" stroke="#1c1402" stroke-width="2.8" stroke-linecap="round"/>
      <circle cx="18" cy="24.2" r="1.8" fill="var(--crimson, #d62839)"/>
    </svg>`,

    // ==================== UI & STATUS VECTORS ====================
    steal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12C2 8.8 5 7 9 7C10.8 7 11.5 8 12 9C12.5 8 13.2 7 15 7C19 7 22 8.8 22 12C22 15.2 19 17 15 17C13 17 12.5 15.5 12 14.5C11.5 15.5 11 17 9 17C5 17 2 15.2 2 12Z" fill="currentColor" fill-opacity="0.22"/>
      <circle cx="8.2" cy="12" r="1.6" fill="currentColor" stroke="none"/>
      <circle cx="15.8" cy="12" r="1.6" fill="currentColor" stroke="none"/>
    </svg>`,

    freeze: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2V22M2 12H22M4.9 4.9L19.1 19.1M19.1 4.9L4.9 19.1"/>
      <path d="M9.5 4.5L12 7L14.5 4.5M9.5 19.5L12 17L14.5 19.5M4.5 9.5L7 12L4.5 14.5M19.5 9.5L17 12L19.5 14.5"/>
    </svg>`,

    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3L4.5 6.2V11.8C4.5 16.7 7.7 20.6 12 22C16.3 20.6 19.5 16.7 19.5 11.8V6.2L12 3Z" fill="currentColor" fill-opacity="0.18"/>
      <path d="M9 12.2L11.2 14.4L15.5 9.8"/>
    </svg>`,

    crown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 18L4.8 8.5L9.5 12.5L12 6L14.5 12.5L19.2 8.5L21 18H3Z" fill="currentColor" fill-opacity="0.28"/>
      <path d="M4 21H20"/>
    </svg>`,

    flame: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2.5C15.5 6.5 19 9.8 19 14C19 17.9 15.9 21 12 21C8.1 21 5 17.9 5 14C5 11.4 6.5 9.2 8 7.5C8 9.2 9.2 10.2 10.2 10.2C9.5 7.5 10.5 4.8 12 2.5Z" fill="currentColor" fill-opacity="0.25"/>
    </svg>`,

    bolt: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="13 2 4 14 11 14 10 22 20 10 13 10 13 2" fill="currentColor" fill-opacity="0.25"/>
    </svg>`,

    trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 4H17V10C17 12.8 14.8 15 12 15C9.2 15 7 12.8 7 10V4Z" fill="currentColor" fill-opacity="0.2"/>
      <path d="M7 6H4V8.5C4 10.4 5.3 11.5 7 11.5M17 6H20V8.5C20 10.4 18.7 11.5 17 11.5M12 15V19M8.5 21H15.5"/>
    </svg>`,

    peace: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9" fill="currentColor" fill-opacity="0.16"/>
      <path d="M12 3V21M12 12L6.2 17.8M12 12L17.8 17.8"/>
    </svg>`,

    robbed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3L21 19H3L12 3Z" fill="currentColor" fill-opacity="0.2"/>
      <path d="M12 9V13.5"/>
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor"/>
    </svg>`,

    undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 14L4 9L9 4"/>
      <path d="M4 9H14.5C17.8 9 20.5 11.7 20.5 15C20.5 18.3 17.8 21 14.5 21H11"/>
    </svg>`,

    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15.5 4.5L19.5 8.5L8 20H4V16L15.5 4.5Z"/>
    </svg>`,

    history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7V12L15.5 14"/>
    </svg>`,

    log: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 6H19M5 12H19M5 18H13"/>
    </svg>`,

    fullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9V4H9M20 9V4H15M4 15V20H9M20 15V20H15"/>
    </svg>`,

    exitFullscreen: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 4V9H4M15 4V9H20M9 20V15H4M15 20V15H20"/>
    </svg>`,

    soundOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5L6 9H3V15H6L11 19V5Z" fill="currentColor" fill-opacity="0.2"/>
      <path d="M15.5 8.5C16.8 9.8 16.8 14.2 15.5 15.5M18.8 5.8C21.5 8.5 21.5 15.5 18.8 18.2"/>
    </svg>`,

    soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5L6 9H3V15H6L11 19V5Z"/>
      <path d="M22 9L16 15M16 9L22 15"/>
    </svg>`,

    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 11A8 8 0 1 0 18.3 16"/>
      <path d="M20 4V11H13"/>
    </svg>`,

    palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3C7 3 3 7 3 12C3 17 7 21 12 21C13.6 21 14.5 20 14.5 18.8C14.5 18.2 14.3 17.7 14 17.2C13.7 16.8 13.5 16.3 13.5 15.8C13.5 14.7 14.4 13.8 15.5 13.8H17.5C19.9 13.8 21.5 12 21.5 9.8C21.5 5.9 17.2 3 12 3Z"/>
      <circle cx="8" cy="10.5" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="11.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
    </svg>`,

    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12.5L10 17.5L19.5 7"/>
    </svg>`,

    target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="8"/>
      <circle cx="12" cy="12" r="3.5" fill="currentColor" fill-opacity="0.35"/>
      <path d="M12 2V5M12 19V22M2 12H5M19 12H22"/>
    </svg>`,

    sparkle: `<svg viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="currentColor"/>
    </svg>`,

    tree: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3L6.5 11H9.5L5.5 17.5H18.5L14.5 11H17.5L12 3Z" fill="currentColor" fill-opacity="0.22"/>
      <path d="M12 17.5V21"/>
    </svg>`,

    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
      <path d="M6 6L18 18M18 6L6 18"/>
    </svg>`,

    printer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9V3H18V9"/>
      <path d="M6 18H4C2.9 18 2 17.1 2 16V11C2 9.9 2.9 9 4 9H20C21.1 9 22 9.9 22 11V16C22 17.1 21.1 18 20 18H18"/>
      <rect x="6" y="14" width="12" height="7" rx="1" fill="currentColor" fill-opacity="0.16"/>
      <circle cx="17.5" cy="12" r="0.9" fill="currentColor" stroke="none"/>
    </svg>`,

    scissors: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="6" cy="6" r="3"/>
      <circle cx="6" cy="18" r="3"/>
      <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12"/>
    </svg>`,

    // ==================== FESTIVE CORNER & BORDER ORNAMENTS ====================
    mistletoeCorner: `<svg viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Sweeping evergreen bough -->
      <path d="M12 14C34 10 62 12 88 22" stroke="var(--accent-alt, #2a9d8f)" stroke-width="3" stroke-linecap="round"/>
      <path d="M14 12C10 34 12 62 22 88" stroke="var(--accent-alt, #2a9d8f)" stroke-width="3" stroke-linecap="round"/>
      <!-- Holly & mistletoe leaves along top edge -->
      <path d="M28 14C36 4 50 5 58 14C48 20 36 20 28 14Z" fill="#1e7b59"/>
      <path d="M54 17C64 9 78 12 86 21C75 26 62 25 54 17Z" fill="#2a9d8f"/>
      <path d="M74 20C84 16 95 20 100 28C90 31 80 28 74 20Z" fill="#1e7b59"/>
      <!-- Holly & mistletoe leaves along left edge -->
      <path d="M14 28C4 36 5 50 14 58C20 48 20 36 14 28Z" fill="#1e7b59"/>
      <path d="M17 54C9 64 12 78 21 86C26 75 25 62 17 54Z" fill="#2a9d8f"/>
      <path d="M20 74C16 84 20 95 28 100C31 90 28 80 20 74Z" fill="#1e7b59"/>
      <!-- Diagonal inner mistletoe pair -->
      <path d="M22 22C36 22 48 30 52 44C38 42 26 34 22 22Z" fill="#238a66"/>
      <path d="M22 22C22 36 30 48 44 52C42 38 34 26 22 22Z" fill="#1b6b4d"/>
      <!-- Leaf center veins -->
      <path d="M31 14H52M14 31V52M25 25L45 38M25 25L38 45" stroke="#ffffff" stroke-opacity="0.26" stroke-width="1.2" stroke-linecap="round"/>
      <!-- Hanging white mistletoe pearls -->
      <circle cx="44" cy="48" r="3.4" fill="#fffaf0"/>
      <circle cx="51" cy="43" r="2.8" fill="#fffaf0" fill-opacity="0.92"/>
      <circle cx="48" cy="54" r="2.6" fill="#fffaf0" fill-opacity="0.88"/>
      <!-- Festive crimson bow & berries at corner knot -->
      <path d="M18 18C10 8 3 13 8 21C11 24 16 21 18 18Z" fill="var(--crimson, #d62839)"/>
      <path d="M18 18C8 10 13 3 21 8C24 11 21 16 18 18Z" fill="var(--crimson-hi, #e63946)"/>
      <circle cx="19" cy="19" r="5" fill="var(--crimson, #d62839)"/>
      <circle cx="27" cy="23" r="4.2" fill="var(--crimson-hi, #e63946)"/>
      <circle cx="23" cy="28" r="4.2" fill="var(--crimson, #d62839)"/>
      <circle cx="18" cy="17.5" r="1.4" fill="#ffffff" fill-opacity="0.55"/>
      <circle cx="26" cy="21.5" r="1.2" fill="#ffffff" fill-opacity="0.55"/>
      <circle cx="22" cy="26.5" r="1.2" fill="#ffffff" fill-opacity="0.55"/>
      <!-- Tiny gold sparkle -->
      <path d="M64 34L65.6 38.4L70 40L65.6 41.6L64 46L62.4 41.6L58 40L62.4 38.4L64 34Z" fill="var(--gold, #f4c542)"/>
    </svg>`,

    candyCane: `<svg viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base white peppermint cane (ID-free for safe reuse anywhere) -->
      <path d="M27 56V21C27 14 22.2 9.5 16.5 9.5C10.8 9.5 7 13.8 7 19" stroke="#fffaf2" stroke-width="9.5" stroke-linecap="round"/>
      <!-- Crimson peppermint stripes -->
      <path d="M27 56V21C27 14 22.2 9.5 16.5 9.5C10.8 9.5 7 13.8 7 19" stroke="var(--crimson, #d62839)" stroke-width="9.5" stroke-linecap="butt" stroke-dasharray="6.5 7.5"/>
      <!-- Soft inner gloss highlight -->
      <path d="M25.5 54V21C25.5 15.2 21.5 11.2 16.5 11.2C12 11.2 8.8 14.5 8.8 18.5" stroke="#ffffff" stroke-opacity="0.38" stroke-width="2" stroke-linecap="round"/>
      <!-- Holly ribbon bow on stem -->
      <path d="M27 33C20.5 29 16.5 32 18.5 36C20.5 38 24.5 36 27 33Z" fill="#1e7b59"/>
      <path d="M27 33C33.5 29 37.5 32 35.5 36C33.5 38 29.5 36 27 33Z" fill="#2a9d8f"/>
      <circle cx="27" cy="33.5" r="2.8" fill="var(--gold, #f4c542)"/>
    </svg>`,

    candyCaneMini: `<svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 43V16C22 10.8 18 7 13.2 7C8.4 7 5 10.6 5 15.2" stroke="#fffaf2" stroke-width="6.5" stroke-linecap="round"/>
      <path d="M22 43V16C22 10.8 18 7 13.2 7C8.4 7 5 10.6 5 15.2" stroke="var(--crimson, #d62839)" stroke-width="6.5" stroke-linecap="round" stroke-dasharray="4.5 5.5"/>
      <path d="M22 43V16C22 10.8 18 7 13.2 7C8.4 7 5 10.6 5 15.2" stroke="rgba(0,0,0,0.14)" stroke-width="1" stroke-linecap="round"/>
      <path d="M22 25C17.5 22 14.5 24 16 27C17.5 28.5 20.5 27 22 25Z" fill="#1e7b59"/>
      <path d="M22 25C26.5 22 29.5 24 28 27C26.5 28.5 23.5 27 22 25Z" fill="#2a9d8f"/>
      <circle cx="22" cy="25.2" r="2.1" fill="var(--gold, #f4c542)"/>
    </svg>`,

    crossedCandyCanes: `<svg viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Left cane tilted -->
      <g transform="rotate(-24 32 30)">
        <path d="M36 50V18C36 12.2 31.6 8 26.2 8C20.8 8 17 12 17 17" stroke="#fffaf2" stroke-width="7.2" stroke-linecap="round"/>
        <path d="M36 50V18C36 12.2 31.6 8 26.2 8C20.8 8 17 12 17 17" stroke="var(--crimson, #d62839)" stroke-width="7.2" stroke-linecap="round" stroke-dasharray="5 6"/>
      </g>
      <!-- Right cane tilted & mirrored -->
      <g transform="translate(64 0) scale(-1 1) rotate(-24 32 30)">
        <path d="M36 50V18C36 12.2 31.6 8 26.2 8C20.8 8 17 12 17 17" stroke="#fffaf2" stroke-width="7.2" stroke-linecap="round"/>
        <path d="M36 50V18C36 12.2 31.6 8 26.2 8C20.8 8 17 12 17 17" stroke="var(--crimson, #d62839)" stroke-width="7.2" stroke-linecap="round" stroke-dasharray="5 6"/>
      </g>
      <!-- Center holly leaves & crimson/gold bow -->
      <path d="M32 30C23 23 16 27 19 33C22 36 28 34 32 30Z" fill="#1e7b59"/>
      <path d="M32 30C41 23 48 27 45 33C42 36 36 34 32 30Z" fill="#2a9d8f"/>
      <path d="M32 31L25 41M32 31L39 41" stroke="var(--crimson, #d62839)" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="32" cy="30.5" r="4.2" fill="var(--gold, #f4c542)"/>
    </svg>`,

    mistletoeSprig: `<svg viewBox="0 0 68 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M34 10C22 10 12 16 6 24C16 25 26 21 34 14Z" fill="#1e7b59"/>
      <path d="M34 10C46 10 56 16 62 24C52 25 42 21 34 14Z" fill="#2a9d8f"/>
      <path d="M34 14C26 20 22 27 22 34C29 31 33 24 34 16Z" fill="#238a66"/>
      <path d="M34 14C42 20 46 27 46 34C39 31 35 24 34 16Z" fill="#1b6b4d"/>
      <!-- Bow -->
      <path d="M34 11C28 4 21 7 24 12C27 14 31 13 34 11Z" fill="var(--crimson, #d62839)"/>
      <path d="M34 11C40 4 47 7 44 12C41 14 37 13 34 11Z" fill="var(--crimson-hi, #e63946)"/>
      <circle cx="34" cy="11.5" r="3.4" fill="var(--gold, #f4c542)"/>
      <!-- Berries -->
      <circle cx="34" cy="24" r="2.8" fill="#fffaf0"/>
      <circle cx="29.5" cy="21" r="2.3" fill="#fffaf0"/>
      <circle cx="38.5" cy="21" r="2.3" fill="#fffaf0"/>
    </svg>`
  };

  function resolveIconKey(key) {
    if (typeof key === 'string' && SVGS[key]) return key;
    return 'gift';
  }

  function renderIcon(key, className = 'svg-icon') {
    const resolved = resolveIconKey(key);
    return `<span class="${className}" aria-hidden="true">${SVGS[resolved]}</span>`;
  }

  const BadSantaIcons = {
    GIFT_ICONS,
    THEMES,
    SVGS,
    resolveIconKey,
    renderIcon
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BadSantaIcons;
  } else {
    globalScope.BadSantaIcons = BadSantaIcons;
  }
})(typeof window !== 'undefined' ? window : globalThis);
