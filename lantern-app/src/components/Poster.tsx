import { View, Text, Image, StyleSheet } from 'react-native';

interface PosterItem {
  poster_url?: string | null;
  title: string;
  type?: string | null;
}

export function Poster({ item, size = 'sm' }: { item: PosterItem; size?: 'sm' | 'lg' }) {
  const url = item.poster_url || '';
  const isGradient = url.startsWith('gradient:');
  const dims = size === 'lg' ? { w: 220, h: 330 } : { w: '100%' as const, h: undefined };

  if (isGradient) {
    const colors = url.replace('gradient:', '').split('/');
    const c1 = `#${colors[0]}`;
    const c2 = colors[1] ? `#${colors[1]}` : c1;
    return (
      <View
        style={[
          styles.poster,
          size === 'sm' ? styles.posterSm : styles.posterLg,
          { backgroundColor: c1 },
        ]}
      >
        <View style={[styles.gradientOverlay, { backgroundColor: c2, opacity: 0.6 }]} />
        <Text style={styles.posterText} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    );
  }

  if (url) {
    return (
      <Image
        source={{ uri: url, headers: { Referer: 'https://movie.douban.com' } }}
        style={size === 'sm' ? styles.posterSm : styles.posterLg}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.poster, size === 'sm' ? styles.posterSm : styles.posterLg, styles.fallback]}>
      <Text style={styles.posterText} numberOfLines={2}>
        {item.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  posterSm: { width: '100%', aspectRatio: 2 / 3, borderRadius: 6 },
  posterLg: { width: 220, height: 330, borderRadius: 10 },
  gradientOverlay: { ...StyleSheet.absoluteFill, opacity: 0.6 },
  fallback: { backgroundColor: '#2E1F1A' },
  posterText: {
    color: '#F5F0E8',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    padding: 8,
  },
});
