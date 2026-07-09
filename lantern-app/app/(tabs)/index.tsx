import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getFavorites,
  upsertFavorite,
  removeFavorite,
  LocalFavorite,
  FAV_GENRES,
  STATUS_LABELS,
  STATUSES,
  STATUS_COLORS,
  WatchStatus,
} from '@/src/lib/storage';
import { searchDouban, MediaItem } from '@/src/lib/douban';
import { Poster } from '@/src/components/Poster';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 36) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function CollectionScreen() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [statusFilter, setStatusFilter] = useState<WatchStatus>('wish');
  const [activeGenre, setActiveGenre] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [showGenreBar, setShowGenreBar] = useState(false);
  const [favItems, setFavItems] = useState<LocalFavorite[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const loadFavs = useCallback(() => {
    const all = getFavorites();
    setFavItems(all);
    const counts: Record<string, number> = {};
    STATUSES.forEach((s) => {
      counts[s] = all.filter((f) => f.status === s).length;
    });
    setStatusCounts(counts);
  }, []);

  useEffect(() => {
    loadFavs();
  }, [loadFavs, refresh]);

  const doSearch = useCallback(async () => {
    if (!q.trim()) {
      setResults([]);
      setSearchError('');
      return;
    }
    setLoading(true);
    setSearchError('');
    try {
      const data = await searchDouban(q.trim());
      setResults(data);
    } catch (e) {
      setSearchError('搜索失败，请检查网络连接');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setSearchError('');
      return;
    }
    const timer = setTimeout(doSearch, 500);
    return () => clearTimeout(timer);
  }, [q, doSearch]);

  const genreOptions = useMemo(() => {
    const all = getFavorites();
    const set = new Set<string>();
    all.forEach((f) => f.genre?.forEach((g) => set.add(g)));
    return Array.from(set).sort();
  }, [refresh]);

  const filteredFavs = useMemo(() => {
    let list = favItems.filter((f) => f.status === statusFilter);
    if (activeGenre && list.length > 0) {
      list = list.filter((f) => f.genre?.includes(activeGenre));
    }
    return list;
  }, [favItems, statusFilter, activeGenre]);

  const toggleFav = useCallback(
    (item: MediaItem) => {
      const existing = getFavorites().find((f) => f.douban_id === item.douban_id);
      if (existing) {
        Alert.alert('取消收藏', `确定取消收藏《${item.title}》？`, [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            style: 'destructive',
            onPress: () => {
              removeFavorite(item.douban_id!);
              setRefresh((r) => r + 1);
            },
          },
        ]);
      } else {
        upsertFavorite({
          douban_id: item.douban_id!,
          media_id: item.id,
          title: item.title,
          original_title: item.original_title,
          poster_url: item.poster_url,
          backdrop_url: item.backdrop_url,
          type: item.type,
          year: item.year,
          rating: item.rating,
          director: item.director,
          actors: item.actors,
          genre: item.genre,
          region: item.region,
          description: item.description,
          status: 'wish',
          personal_rating: null,
          note: null,
          progress: null,
        });
        setRefresh((r) => r + 1);
      }
    },
    []
  );

  const isFav = useCallback((doubanId: string | null) => {
    if (!doubanId) return false;
    return getFavorites().some((f) => f.douban_id === doubanId);
  }, [refresh]);

  const openDetail = (item: MediaItem) => {
    router.push({
      pathname: '/detail',
      params: {
        id: item.id,
        title: item.title,
        poster_url: item.poster_url || '',
        type: item.type,
        year: item.year || 0,
        rating: item.rating || 0,
        director: item.director || '',
        douban_id: item.douban_id || '',
        original_title: item.original_title || '',
      },
    });
  };

  const renderMediaCard = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openDetail(item)}
      activeOpacity={0.8}
    >
      <Poster item={item} size="sm" />
      <TouchableOpacity
        style={styles.favBtn}
        onPress={() => toggleFav(item)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isFav(item.douban_id) ? 'star' : 'star-outline'}
          size={20}
          color={isFav(item.douban_id) ? '#E8A33D' : '#9A9088'}
        />
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardYear}>{item.year || ''}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFavCard = ({ item }: { item: LocalFavorite }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        openDetail({
          id: item.media_id,
          title: item.title,
          poster_url: item.poster_url,
          type: item.type,
          year: item.year,
          rating: item.rating,
          director: item.director,
          douban_id: item.douban_id,
          original_title: item.original_title,
        } as MediaItem)
      }
      activeOpacity={0.8}
    >
      <Poster item={item} size="sm" />
      <TouchableOpacity
        style={styles.favBtn}
        onPress={() => {
          Alert.alert('取消收藏', `确定取消收藏《${item.title}》？`, [
            { text: '取消', style: 'cancel' },
            {
              text: '确定',
              style: 'destructive',
              onPress: () => {
                removeFavorite(item.douban_id);
                setRefresh((r) => r + 1);
              },
            },
          ]);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="star" size={20} color="#E8A33D" />
      </TouchableOpacity>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.cardYear}>{item.year || ''}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color="#9A9088" />
          <TextInput
            style={styles.searchInput}
            placeholder="搜索电影/电视剧..."
            placeholderTextColor="#6E6560"
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ('')}>
              <Ionicons name="close-circle" size={18} color="#9A9088" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterOpen(!filterOpen)}
        >
          <Ionicons name="options-outline" size={20} color="#E8A33D" />
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {filterOpen && (
        <View style={styles.filterPanel}>
          <TouchableOpacity
            style={styles.filterRow}
            onPress={() => setShowStatusBar(!showStatusBar)}
          >
            <Ionicons
              name={showStatusBar ? 'checkbox' : 'square-outline'}
              size={20}
              color="#E8A33D"
            />
            <Text style={styles.filterLabel}>状态筛选</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterRow}
            onPress={() => setShowGenreBar(!showGenreBar)}
          >
            <Ionicons
              name={showGenreBar ? 'checkbox' : 'square-outline'}
              size={20}
              color="#E8A33D"
            />
            <Text style={styles.filterLabel}>风格筛选</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Bar */}
      {!filterOpen && showStatusBar && !q.trim() && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusBar}
          contentContainerStyle={styles.statusBarContent}
        >
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.statusBtn,
                statusFilter === s && styles.statusBtnActive,
              ]}
              onPress={() => setStatusFilter(s)}
            >
              <Text
                style={[
                  styles.statusBtnText,
                  statusFilter === s && styles.statusBtnTextActive,
                ]}
              >
                {STATUS_LABELS[s]}
              </Text>
              {statusCounts[s] > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{statusCounts[s]}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Genre Bar */}
      {!filterOpen && showGenreBar && genreOptions.length > 0 && !q.trim() && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.genreBar}
          contentContainerStyle={styles.genreBarContent}
        >
          <TouchableOpacity
            style={[styles.genreBtn, activeGenre === '' && styles.genreBtnActive]}
            onPress={() => setActiveGenre('')}
          >
            <Text style={activeGenre === '' ? styles.genreBtnTextActive : styles.genreBtnText}>
              全部
            </Text>
          </TouchableOpacity>
          {genreOptions.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genreBtn, activeGenre === g && styles.genreBtnActive]}
              onPress={() => setActiveGenre(activeGenre === g ? '' : g)}
            >
              <Text style={activeGenre === g ? styles.genreBtnTextActive : styles.genreBtnText}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content */}
      {q.trim() !== '' ? (
        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator color="#E8A33D" size="large" style={{ marginTop: 60 }} />
          ) : searchError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color="#6E6560" />
              <Text style={styles.emptyText}>{searchError}</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color="#6E6560" />
              <Text style={styles.emptyText}>未找到相关影视</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderMediaCard}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {filteredFavs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="film-outline" size={48} color="#6E6560" />
              <Text style={styles.emptyText}>
                {favItems.length === 0
                  ? '去搜索添加你的第一部影视'
                  : '该分组暂无内容'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredFavs}
              keyExtractor={(item) => item.douban_id}
              renderItem={renderFavCard}
              numColumns={2}
              columnWrapperStyle={styles.row}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E0C' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 52,
    paddingBottom: 8,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1814',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  searchInput: { flex: 1, color: '#F5F0E8', fontSize: 15 },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1C1814',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  filterPanel: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterLabel: { color: '#F5F0E8', fontSize: 15 },
  statusBar: { maxHeight: 44, marginBottom: 4 },
  statusBarContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2E2823',
    backgroundColor: 'transparent',
  },
  statusBtnActive: { borderColor: '#E8A33D60', backgroundColor: '#E8A33D15' },
  statusBtnText: { color: '#9A9088', fontSize: 13 },
  statusBtnTextActive: { color: '#E8A33D' },
  countBadge: {
    backgroundColor: '#E8A33D',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeText: { color: '#0F0E0C', fontSize: 10, fontWeight: '700' },
  genreBar: { maxHeight: 36, marginBottom: 4 },
  genreBarContent: { paddingHorizontal: 12, gap: 6, alignItems: 'center' },
  genreBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#1C1814',
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  genreBtnActive: { backgroundColor: '#E8A33D20', borderColor: '#E8A33D60' },
  genreBtnText: { color: '#9A9088', fontSize: 13 },
  genreBtnTextActive: { color: '#E8A33D', fontSize: 13 },
  content: { flex: 1 },
  row: { gap: 12, marginBottom: 12 },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT + 36,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1C1814',
  },
  favBtn: { position: 'absolute', top: 6, right: 6, zIndex: 10 },
  cardInfo: {
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 4,
  },
  cardTitle: { color: '#F5F0E8', fontSize: 13, fontWeight: '600' },
  cardYear: { color: '#9A9088', fontSize: 11, marginTop: 2 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: '#9A9088', fontSize: 15 },
});
