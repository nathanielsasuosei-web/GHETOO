// Only link to known streaming services. These URLs are supplied by the artist,
// not fetched by this app; royalties and reporting remain with each service.
export const MUSIC_PLATFORMS = [
  {
    key: 'spotifyUrl',
    label: 'Spotify',
    placeholder: 'https://open.spotify.com/track/…',
    hosts: ['open.spotify.com'],
  },
  {
    key: 'appleMusicUrl',
    label: 'Apple Music',
    placeholder: 'https://music.apple.com/…',
    hosts: ['music.apple.com'],
  },
  {
    key: 'youtubeUrl',
    label: 'YouTube',
    placeholder: 'https://www.youtube.com/watch?v=…',
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
  },
];

const youtubeId = /^[A-Za-z0-9_-]{11}$/;

/** Validate artist-entered links before storage or rendering. Blank removes a link. */
export function normalizeStreamingUrl(key, value) {
  const platform = MUSIC_PLATFORMS.find((item) => item.key === key);
  if (!platform) throw new Error('Unknown streaming platform.');
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new Error(`Enter a valid ${platform.label} URL.`);
  const text = value.trim();
  if (!text) return '';
  if (text.length > 2048) throw new Error(`${platform.label} URL is too long.`);

  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`Enter a valid ${platform.label} URL.`);
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !platform.hosts.includes(url.hostname.toLowerCase())
  ) {
    throw new Error(`Enter a valid https ${platform.label} URL from the official service.`);
  }

  if (key === 'youtubeUrl') {
    const segments = url.pathname.split('/').filter(Boolean);
    let id = '';
    if (url.hostname.toLowerCase() === 'youtu.be' && segments.length === 1) id = segments[0];
    else if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
    else if (segments.length === 2 && ['embed', 'shorts', 'live'].includes(segments[0])) id = segments[1];
    if (!youtubeId.test(id)) throw new Error('Enter a YouTube link to a specific video.');
    return `https://www.youtube.com/watch?v=${id}`;
  }

  if (key === 'spotifyUrl') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0]?.startsWith('intl-')) segments.shift();
    if (segments.length !== 2 || !['track', 'album'].includes(segments[0]) || !/^[A-Za-z0-9]{22}$/.test(segments[1])) {
      throw new Error('Enter a Spotify track or album link.');
    }
  }
  if (key === 'appleMusicUrl') {
    const segments = url.pathname.split('/').filter(Boolean);
    if (!segments.some((part) => part === 'album' || part === 'song')) {
      throw new Error('Enter an Apple Music song or album link.');
    }
  }

  return url.href;
}

export function safeStreamingUrl(key, value) {
  try {
    return normalizeStreamingUrl(key, value);
  } catch {
    return '';
  }
}

export function trackPlatformLinks(track) {
  if (!track) return [];
  return MUSIC_PLATFORMS.map(({ key, label }) => ({ key, label, url: safeStreamingUrl(key, track[key]) })).filter(
    (item) => item.url
  );
}

/** Local playback is a fallback only for releases without platform links. */
export function canPlayOnSite(track) {
  return Boolean(track) && track.allowStream !== false && trackPlatformLinks(track).length === 0;
}

/** Existing YouTube embeds also route to the official watch page. */
export function videoYouTubeUrl(video) {
  if (!video) return '';
  return (
    safeStreamingUrl('youtubeUrl', video.youtubeUrl) ||
    (video.source === 'url' ? safeStreamingUrl('youtubeUrl', video.src) : '')
  );
}
