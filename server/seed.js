const DAY = 86400000;

const ago = (days, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600000).toISOString();
const inDays = (days, hours = 0) => new Date(Date.now() + days * DAY + hours * 3600000).toISOString();

function baseSettings() {
  return {
    artistName: 'Young Silence',
    tagline: 'Accra raised. Silence made loud.',
    intro:
      'Afro-fusion from the heart of Accra. Melodies for the ones who speak loudest when they say nothing at all.',
    bio: `Young Silence was born in Nima and raised on the sound of Accra — highlife drifting from his grandmother's radio, drill rattling through the trotro windows, church harmonies on Sunday.

He started writing at fifteen, recording on a cracked phone in a friend's kitchen in Kanda. The name came from the quiet: the kid in the corner of the studio who never spoke until the beat dropped, then said everything.

Today his sound sits somewhere between Afrobeats and alté — Twi and Pidgin laced over warm guitars, talking drums and 808s. Every release is independent, funded directly by the people who listen. No label, no gatekeepers. Just the music and the fans who keep it alive.`,
    city: 'Accra, Ghana',
    currency: 'GHS',
    heroImage: '/media/hero.jpg',
    portraitImage: '/media/portrait.jpg',
    heroFocus: 'center',
    monogramImage: '/media/logo.png',
    momo: {
      mtn: '024 000 0000',
      telecel: '',
      at: '',
      name: 'Young Silence Music',
    },
    cardEnabled: true,
    supportNote:
      'Every cedi goes straight into studio time, mixing, videos and getting the music to more ears. Your support keeps the lights on.',
    minSupport: 100,
    socials: {
      instagram: 'https://instagram.com',
      tiktok: 'https://tiktok.com',
      youtube: 'https://youtube.com',
      x: 'https://x.com',
      audiomack: '',
    },
    announcement: 'New single — “Accra Nights” out now',
    goalAmount: 6000000,
    showRaised: true,
    contactEmail: 'hello@youngsilence.gh',
  };
}

export function seedState() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    settings: baseSettings(),
    tracks: [
      {
        id: 'trk_accra_nights',
        slug: 'accra-nights',
        title: 'Accra Nights',
        genre: 'Afro-fusion',
        year: 2025,
        description:
          'A love letter to the city after dark — Circle at 2am, kelewele smoke, headlights on the Ring Road. Recorded live with a six-piece band at a studio in Osu.',
        credits: 'Written by Young Silence · Produced by Kwesi Nuumo · Mixed by Ama Serwaa',
        cover: '/media/covers/accra-nights.jpg',
        audio: '/media/audio/accra-nights.mp3',
        lyrics: `[Intro]
Yeah… Accra after dark
Silence on the beat

[Verse 1]
Ring Road shining under yellow light
Circle still awake at two in the night
Kelewele smoke and a trotro horn
The city hums a song I was always born
To sing — every corner knows my name
Every gutter echo taught me how to frame
A melody around the quiet in my chest
Nima to Osu, I put the whole city to rest

[Chorus]
These Accra nights, they talk to me
Neon on the water, the sea is free
If silence is a language, then I’m fluent now
Every light across the harbour is a crowd somehow
These Accra nights, oh, these Accra nights

[Verse 2]
She texted “where you at?” I said “I’m in the sound”
Studio in the bedroom, doors on lockdown
Watchman doing rounds, he knows the routine
Dreaming out loud past the generator screen

[Chorus]
These Accra nights, they talk to me
Neon on the water, the sea is free
If silence is a language, then I’m fluent now
Every light across the harbour is a crowd somehow

[Outro]
Accra nights… I’ll be back when the morning comes`,
        duration: 42,
        minAmount: 500,
        plays: 18420,
        downloads: 1310,
        featured: true,
        published: true,
        allowStream: true,
        createdAt: ago(2),
      },
      {
        id: 'trk_silence_speaks',
        slug: 'silence-speaks',
        title: 'Silence Speaks',
        genre: 'Afro-drill',
        year: 2025,
        description:
          'The one that started it all. Drill drums under a church choir sample, three verses about everything he never said out loud.',
        credits: 'Written by Young Silence · Produced by RiddimKilla · Mixed by Kofi Awuah',
        cover: '/media/covers/silence-speaks.jpg',
        audio: '/media/audio/silence-speaks.mp3',
        lyrics: `[Intro]
They said the quiet ones are dangerous
Okay

[Verse 1]
Back row of the class, pen in my hand
Writing what my mouth could never land
Mama said speak up, I spoke in drums
808s doing the talking when the morning comes
Kitchen in Kanda, phone on the fridge
One mic, one crack, one hell of a bridge

[Chorus]
Silence speaks, silence speaks
Every word I held back turned into beats
Silence speaks, let the record spin
The quiet in the room is where the truth comes in
Silence speaks

[Verse 2]
They slept on the boy, now the bed is made
Every dream I deferred is a bill now paid
No label, no handout, no co-sign chain
Just the people in the front row calling my name

[Chorus]
Silence speaks, silence speaks
Every word I held back turned into beats
Silence speaks, let the record spin
The quiet in the room is where the truth comes in

[Outro]
Listen…
Yeah, silence speaks`,
        duration: 38,
        minAmount: 1000,
        plays: 31275,
        downloads: 2440,
        featured: false,
        published: true,
        allowStream: true,
        createdAt: ago(24),
      },
      {
        id: 'trk_mamas_prayer',
        slug: 'mamas-prayer',
        title: "Mama's Prayer",
        genre: 'Highlife soul',
        year: 2024,
        description:
          'Acoustic highlife for the woman who prayed him through every rejection letter. Features his mother on the final chorus.',
        credits: 'Written by Young Silence · Guitars by Kojo Baah · Produced by Nana Yaa',
        cover: '/media/covers/mamas-prayer.jpg',
        audio: '/media/audio/mamas-prayer.mp3',
        duration: 46,
        minAmount: 300,
        plays: 12089,
        downloads: 2190,
        featured: false,
        published: true,
        allowStream: true,
        createdAt: ago(58),
      },
      {
        id: 'trk_kpanlogo',
        slug: 'kpanlogo-riddim',
        title: 'Kpanlogo Riddim',
        genre: 'Afrobeats',
        year: 2024,
        description:
          'A free one for the dancers. Kpanlogo drums chopped over a rolling Afrobeat groove — no verse, just movement.',
        credits: 'Produced by Young Silence · Percussion by Nii Ayi',
        cover: '/media/covers/kpanlogo.jpg',
        audio: '/media/audio/kpanlogo.mp3',
        duration: 34,
        minAmount: 200,
        plays: 8344,
        downloads: 640,
        featured: false,
        published: true,
        allowStream: true,
        createdAt: ago(91),
      },
    ],
    videos: [
      {
        id: 'vid_accra_nights',
        title: 'Accra Nights — Official Visual',
        description: 'Shot across Osu, Jamestown and the Ring Road over three nights.',
        thumb: '/media/thumbs/accra-nights.jpg',
        source: 'file',
        src: '/media/videos/accra-nights.mp4',
        duration: 20,
        views: 26410,
        featured: true,
        published: true,
        createdAt: ago(1),
      },
      {
        id: 'vid_live',
        title: 'Silence Speaks — Live at +233',
        description: 'One take, one mic, a full band at the +233 Jazz Bar, Accra.',
        thumb: '/media/thumbs/silence-speaks-live.jpg',
        source: 'file',
        src: '/media/videos/silence-speaks-live.mp4',
        duration: 20,
        views: 9821,
        featured: false,
        published: true,
        createdAt: ago(30),
      },
      {
        id: 'vid_diary',
        title: 'Behind the Silence — Studio Diary',
        description: 'Three weeks in the studio, the making of the next project. No script.',
        thumb: '/media/thumbs/studio-diary.jpg',
        source: 'file',
        src: '/media/videos/studio-diary.mp4',
        duration: 20,
        views: 6120,
        featured: false,
        published: true,
        createdAt: ago(70),
      },
    ],
    orders: [
      { id: 'ord_seed_1', reference: 'YS-A7K2MD', trackId: 'trk_accra_nights', trackTitle: 'Accra Nights', amount: 2000, currency: 'GHS', method: 'momo', provider: 'mtn', supporterName: 'Ama Boateng', email: 'ama@example.com', message: 'This one carried me through exams. More fire!', anonymous: false, status: 'paid', demo: false, createdAt: ago(0, 5), confirmedAt: ago(0, 4) },
      { id: 'ord_seed_2', reference: 'YS-QP4T9X', trackId: 'trk_silence_speaks', trackTitle: 'Silence Speaks', amount: 5000, currency: 'GHS', method: 'momo', provider: 'telecel', supporterName: 'Kwame Mensah', email: 'kwame@example.com', message: 'Bro you are next up. Keep going.', anonymous: false, status: 'paid', demo: false, createdAt: ago(1, 3), confirmedAt: ago(1, 2) },
      { id: 'ord_seed_3', reference: 'YS-H8N3VW', trackId: 'trk_mamas_prayer', trackTitle: "Mama's Prayer", amount: 10000, currency: 'GHS', method: 'card', provider: 'card', supporterName: 'Anonymous', email: '', message: 'For my own mother. Thank you.', anonymous: true, status: 'paid', demo: true, createdAt: ago(3), confirmedAt: ago(3) },
      { id: 'ord_seed_4', reference: 'YS-C5J7RB', trackId: 'trk_accra_nights', trackTitle: 'Accra Nights', amount: 1000, currency: 'GHS', method: 'momo', provider: 'mtn', supporterName: 'Naa Adjeley', email: 'naa@example.com', message: 'Accra nights hits different 🇬🇭', anonymous: false, status: 'paid', demo: false, createdAt: ago(5), confirmedAt: ago(5) },
      { id: 'ord_seed_5', reference: 'YS-Y2F6LK', trackId: null, trackTitle: 'General support', amount: 15000, currency: 'GHS', method: 'momo', provider: 'at', supporterName: 'Kofi Owusu', email: 'kofi@example.com', message: 'For the studio rent. Make the album.', anonymous: false, status: 'paid', demo: false, createdAt: ago(8), confirmedAt: ago(8) },
      { id: 'ord_seed_6', reference: 'YS-M9D4TS', trackId: 'trk_kpanlogo', trackTitle: 'Kpanlogo Riddim', amount: 500, currency: 'GHS', method: 'momo', provider: 'mtn', supporterName: 'Efua Asante', email: 'efua@example.com', message: 'Played this at my birthday, the whole place moved.', anonymous: false, status: 'paid', demo: false, createdAt: ago(12), confirmedAt: ago(12) },
      { id: 'ord_seed_7', reference: 'YS-4RT8QN', trackId: 'trk_silence_speaks', trackTitle: 'Silence Speaks', amount: 3000, currency: 'GHS', method: 'momo', provider: 'mtn', supporterName: 'Yaw Darko', email: 'yaw@example.com', message: '', anonymous: false, status: 'paid', demo: false, createdAt: ago(18), confirmedAt: ago(17) },
      { id: 'ord_seed_8', reference: 'YS-6KX2HP', trackId: 'trk_accra_nights', trackTitle: 'Accra Nights', amount: 2500, currency: 'GHS', method: 'momo', provider: 'mtn', supporterName: 'Selorm Agbeko', email: 'selorm@example.com', message: 'From Tema with love.', anonymous: false, status: 'pending', demo: false, createdAt: ago(0, 2), confirmedAt: null },
    ],
    messages: [],
    events: [
      {
        id: 'evt_accra_live',
        title: 'Silence Made Loud — Accra Live',
        venue: '+233 Jazz Bar & Grill',
        city: 'Accra',
        date: inDays(9, 4),
        priceNote: 'GH₵ 80 advance · GH₵ 120 at the gate',
        ticketUrl: 'https://tickets.example.com/silence-accra',
        description: 'Full band, full catalogue and a first listen of the new EP. Limited capacity.',
        published: true,
        createdAt: ago(6),
      },
      {
        id: 'evt_afrofuture',
        title: 'Afro Future Saturday — guest set',
        venue: 'Independence Square',
        city: 'Accra',
        date: inDays(21, 8),
        priceNote: 'Festival wristband required',
        ticketUrl: 'https://tickets.example.com/afro-future',
        description: 'A 45-minute guest set on the waterfront stage. Come early.',
        published: true,
        createdAt: ago(4),
      },
      {
        id: 'evt_kumasi',
        title: 'Kumasi Invasion',
        venue: 'Vienna City',
        city: 'Kumasi',
        date: inDays(38, 5),
        priceNote: 'GH₵ 60 advance',
        ticketUrl: '',
        description: 'The first Kumasi headline show. Tickets at the venue and via MoMo.',
        published: true,
        createdAt: ago(2),
      },
      {
        id: 'evt_hardyard',
        title: 'Hardyard Café Sessions',
        venue: 'Hardyard Café',
        city: 'Accra',
        date: ago(40),
        priceNote: 'Free entry',
        ticketUrl: '',
        description: 'An acoustic Sunday set recorded for the live diaries.',
        published: true,
        createdAt: ago(75),
      },
    ],
    products: [
      {
        id: 'prd_tee',
        title: 'YS Signature Tee',
        description: 'Heavyweight 240gsm cotton, embroidered silence mark on the chest. Unisex cut.',
        price: 12000,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        image: '/media/covers/placeholder.jpg',
        published: true,
        sold: 64,
        createdAt: ago(30),
      },
      {
        id: 'prd_cap',
        title: 'Silence Cap',
        description: 'Low-profile six-panel cap with stitched monogram. One size, adjustable strap.',
        price: 9000,
        sizes: [],
        image: '/media/covers/placeholder.jpg',
        published: true,
        sold: 41,
        createdAt: ago(28),
      },
      {
        id: 'prd_hoodie',
        title: 'Accra Nights Hoodie',
        description: 'Fleece-lined black hoodie, skyline print across the back. Limited run of 100.',
        price: 22000,
        sizes: ['M', 'L', 'XL', 'XXL'],
        image: '/media/covers/placeholder.jpg',
        published: true,
        sold: 27,
        createdAt: ago(12),
      },
    ],
    merchOrders: [
      {
        id: 'mord_seed_1',
        reference: 'YS-7KQ2NP',
        kind: 'merch',
        items: [{ productId: 'prd_tee', title: 'YS Signature Tee', size: 'L', qty: 1, unitPrice: 12000 }],
        amount: 12000,
        currency: 'GHS',
        method: 'momo',
        provider: 'mtn',
        supporterName: 'Adwoa Mensah',
        email: 'adwoa@example.com',
        phone: '024 111 2222',
        location: 'East Legon, Accra',
        status: 'paid',
        demo: false,
        createdAt: ago(3, 2),
        confirmedAt: ago(3, 1),
      },
      {
        id: 'mord_seed_2',
        reference: 'YS-2VX8HW',
        kind: 'merch',
        items: [{ productId: 'prd_cap', title: 'Silence Cap', size: '', qty: 2, unitPrice: 9000 }],
        amount: 18000,
        currency: 'GHS',
        method: 'momo',
        provider: 'telecel',
        supporterName: 'Kojo Bentil',
        email: 'kojo@example.com',
        phone: '050 333 4444',
        location: 'Tema Community 25',
        status: 'pending',
        demo: false,
        createdAt: ago(0, 6),
        confirmedAt: null,
      },
    ],
    subscribers: [
      { id: 'sub_seed_1', email: 'ama@example.com', createdAt: ago(20) },
      { id: 'sub_seed_2', email: 'kwame@example.com', createdAt: ago(15) },
      { id: 'sub_seed_3', email: 'naa@example.com', createdAt: ago(9) },
      { id: 'sub_seed_4', email: 'efua@example.com', createdAt: ago(2) },
    ],
  };
}
