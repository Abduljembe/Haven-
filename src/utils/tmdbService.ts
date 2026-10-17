import { MediaItem } from '../types';
import { buildVidukiStreamUrl } from './vidukiService';

export async function fetchTmdbTrending(): Promise<MediaItem[]> {
  try {
    const res = await fetch('/api/tmdb/trending');
    if (res.ok) {
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      return results.map((m: any) => {
        const id = String(m.id);
        const title = m.title || m.name || 'Untitled Movie';
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
        const backdrop = m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : poster;
        const embedUrl = buildVidukiStreamUrl({ id, server: 1, mediaType: 'movie' });

        return {
          id: `tmdb-movie-${id}`,
          tmdbId: id,
          title,
          artist: m.overview ? `Overview: ${m.overview.slice(0, 100)}...` : 'TMDB Cinema',
          year: m.release_date ? m.release_date.split('-')[0] : '2026',
          genre: 'Trending • TMDB HD',
          category: 'trending',
          type: 'embed',
          url: embedUrl,
          embedUrl,
          thumbnailUrl: poster,
          backdropUrl: backdrop,
          duration: 7200,
          rating: `${Math.round((m.vote_average || 8.0) * 10) / 10}/10`,
          description: m.overview || 'Trending movie on TMDB.',
          source: 'viduki',
          badge: 'TMDB Trending 🔥',
          streamQuality: '1080p Ultra HD',
          availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
          server: 1,
          fallbackAvailable: true,
        };
      });
    }
  } catch (err) {
    console.warn('Failed to fetch TMDB trending:', err);
  }
  return [];
}

export async function searchTmdbMovies(query: string): Promise<MediaItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  try {
    const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(trimmed)}`);
    if (res.ok) {
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      return results.map((m: any) => {
        const id = String(m.id);
        const title = m.title || m.name || 'Untitled Movie';
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
        const backdrop = m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : poster;
        const embedUrl = buildVidukiStreamUrl({ id, server: 1, mediaType: 'movie' });

        return {
          id: `tmdb-movie-${id}`,
          tmdbId: id,
          title,
          artist: m.overview ? `Overview: ${m.overview.slice(0, 100)}...` : 'TMDB Cinema',
          year: m.release_date ? m.release_date.split('-')[0] : '2026',
          genre: 'Search Result • TMDB HD',
          category: 'search',
          type: 'embed',
          url: embedUrl,
          embedUrl,
          thumbnailUrl: poster,
          backdropUrl: backdrop,
          duration: 7200,
          rating: `${Math.round((m.vote_average || 8.0) * 10) / 10}/10`,
          description: m.overview || 'TMDB Search Result.',
          source: 'viduki',
          badge: 'TMDB Result 🎬',
          streamQuality: '1080p Ultra HD',
          availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
          server: 1,
          fallbackAvailable: true,
        };
      });
    }
  } catch (err) {
    console.warn('Failed to search TMDB:', err);
  }
  return [];
}

export async function fetchTmdbRecommendations(movieId: string): Promise<MediaItem[]> {
  if (!movieId) return [];
  try {
    const res = await fetch(`/api/tmdb/recommendations/${encodeURIComponent(movieId)}`);
    if (res.ok) {
      const data = await res.json();
      const results = Array.isArray(data.results) ? data.results : [];
      return results.map((m: any) => {
        const id = String(m.id);
        const title = m.title || m.name || 'Untitled Movie';
        const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
        const backdrop = m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : poster;
        const embedUrl = buildVidukiStreamUrl({ id, server: 1, mediaType: 'movie' });

        return {
          id: `tmdb-rec-${id}`,
          tmdbId: id,
          title,
          artist: m.overview ? `Overview: ${m.overview.slice(0, 100)}...` : 'TMDB Recommended',
          year: m.release_date ? m.release_date.split('-')[0] : '2026',
          genre: 'Recommended For You ✨',
          category: 'recommendations',
          type: 'embed',
          url: embedUrl,
          embedUrl,
          thumbnailUrl: poster,
          backdropUrl: backdrop,
          duration: 7200,
          rating: `${Math.round((m.vote_average || 8.0) * 10) / 10}/10`,
          description: m.overview || 'Recommended movie based on your watch history.',
          source: 'viduki',
          badge: 'Recommended 💖',
          streamQuality: '1080p Ultra HD',
          availableOn: ['Viduki Server 1', 'Server 2', 'Server 3', 'Server 4'],
          server: 1,
          fallbackAvailable: true,
        };
      });
    }
  } catch (err) {
    console.warn('Failed to fetch TMDB recommendations:', err);
  }
  return [];
}
