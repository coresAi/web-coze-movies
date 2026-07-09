import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getFavorites,
  upsertFavorite,
  removeFavorite,
  STATUS_LABELS,
  STATUSES,
  STATUS_COLORS,
  WatchStatus,
  LocalFavorite,
} from '@/src/lib/storage';
import { getDoubanDetail, getDoubanVendors, MediaItem } from '@/src/lib/douban';
import { Poster } from '@/src/components/Poster';

export default function DetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    poster_url: string;
    type: string;
    year: string;
    rating: string;
    director: string;
    douban_id: string;
    original_title: string;
  }>();

  const [fav, setFav] = useState<LocalFavorite | null>(null);
  const [enriched, setEnriched] = useState<MediaItem | null>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [note, setNote] = useState('');
  const [personalRating, setPersonalRating] = useState<number | null>(null);
  const [currentStatus, setCurrentStatus] = useState<WatchStatus>('wish');
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);

  const doubanId = params.douban_id;

  useEffect(() => {
    const favs = getFavorites();
    const existing = favs.find((f) => f.douban_id === doubanId);
    if (existing) {
      setFav(existing);
      setCurrentStatus(existing.status);
      setPersonalRating(existing.personal_rating);
      setNote(existing.note || '');
    }
  }, [doubanId]);

  useEffect(() => {
    if (!doubanId) return;
    setLoadingDetail(true);
    Promise.all([getDoubanDetail(doubanId), getDoubanVendors(doubanId)])
      .then(([detail, v]) => {
        setEnriched(detail);
        setVendors(v || []);
        if (detail && doubanId) {
          upsertFavorite({
            douban_id: doubanId,
            media_id: params.id,
            title: detail.title || params.title,
            original_title: detail.original_title || params.original_title,
            poster_url: detail.poster_url || params.poster_url,
            backdrop_url: detail.backdrop_url,
            type: detail.type || (params.type as any),
            year: detail.year || parseInt(params.year),
            rating: detail.rating || parseFloat(params.rating),
            director: detail.director || params.director,
            actors: detail.actors,
            genre: detail.genre,
            region: detail.region,
            description: detail.description,
            status: currentStatus,
            personal_rating: personalRating,
            note: note || null,
            progress: null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDetail(false));
  }, [doubanId]);

  const save = useCallback(
    (status: WatchStatus, rating: number | null, n: string | null) => {
      upsertFavorite({
        douban_id: doubanId,
        media_id: params.id,
        title: enriched?.title || params.title,
        original_title: enriched?.original_title || params.original_title || '',
        poster_url: enriched?.poster_url || params.poster_url || '',
        backdrop_url: enriched?.backdrop_url ?? null,
        type: (enriched?.type || params.type) as any,
        year: enriched?.year || parseInt(params.year || '0'),
        rating: enriched?.rating || parseFloat(params.rating || '0'),
        director: enriched?.director || params.director || '',
        actors: enriched?.actors ?? null,
        genre: enriched?.genre ?? null,
        region: enriched?.region ?? null,
        description: enriched?.description ?? null,
        status,
        personal_rating: rating,
        note: n,
        progress: null,
      });
    },
    [doubanId, params, enriched]
  );

  const handleStatusChange = (s: WatchStatus) => {
    setCurrentStatus(s);
    save(s, personalRating, note || null);
    setStatusPickerOpen(false);
  };

  const handleRating = (r: number) => {
    const newRating = personalRating === r ? null : r;
    setPersonalRating(newRating);
    save(currentStatus, newRating, note || null);
  };

  const handleNoteSave = () => {
    save(currentStatus, personalRating, note || null);
    Alert.alert('已保存', '备注已更新');
  };

  const handleRemove = () => {
    Alert.alert('取消收藏', `确定取消收藏《${params.title}》？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        style: 'destructive',
        onPress: () => {
          removeFavorite(doubanId);
          router.back();
        },
      },
    ]);
  };

  const item: PosterItem = {
    poster_url: enriched?.poster_url || params.poster_url,
    title: enriched?.title || params.title,
    type: enriched?.type || params.type,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-down" size={26} color="#F5F0E8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {enriched?.title || params.title}
        </Text>
        <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="trash-outline" size={22} color="#C03B2D" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Poster + Info */}
        <View style={styles.topSection}>
          <View style={styles.posterWrap}>
            <Poster item={item} size="lg" />
          </View>
          <View style={styles.topInfo}>
            <Text style={styles.title}>{enriched?.title || params.title}</Text>
            {enriched?.original_title ? (
              <Text style={styles.originalTitle}>{enriched.original_title}</Text>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {enriched?.type === 'movie' ? '电影' : '电视剧'}
              </Text>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaText}>{enriched?.year || params.year}</Text>
            </View>
            {enriched?.rating ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={18} color="#E8A33D" />
                <Text style={styles.ratingText}>{enriched.rating}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Director / Actors / Genre / Region */}
        <View style={styles.infoCard}>
          {enriched?.director ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>导演</Text>
              <Text style={styles.infoValue}>{enriched.director}</Text>
            </View>
          ) : null}
          {enriched?.actors?.length ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>主演</Text>
              <Text style={styles.infoValue}>{enriched.actors.join(' / ')}</Text>
            </View>
          ) : null}
          {enriched?.genre?.length ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>类型</Text>
              <Text style={styles.infoValue}>{enriched.genre.join(' / ')}</Text>
            </View>
          ) : null}
          {enriched?.region ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>地区</Text>
              <Text style={styles.infoValue}>{enriched.region}</Text>
            </View>
          ) : null}
        </View>

        {/* Description */}
        {enriched?.description ? (
          <View style={styles.descCard}>
            <Text style={styles.descTitle}>简介</Text>
            <Text style={styles.descText}>{enriched.description}</Text>
          </View>
        ) : null}

        {/* Loading detail */}
        {loadingDetail && !enriched && (
          <ActivityIndicator color="#E8A33D" style={{ marginTop: 20 }} />
        )}

        {/* Vendors */}
        {vendors.length > 0 && (
          <View style={styles.vendorCard}>
            <Text style={styles.sectionTitle}>可播放平台</Text>
            <View style={styles.vendorList}>
              {vendors.map((v, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.vendorBtn}
                  onPress={() => {
                    if (v.url) Linking.openURL(v.url);
                  }}
                >
                  <Text style={styles.vendorText}>{v.name || v.title || `平台 ${i + 1}`}</Text>
                  <Ionicons name="open-outline" size={14} color="#9A9088" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Status */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>观看状态</Text>
          <TouchableOpacity
            style={styles.statusSelector}
            onPress={() => setStatusPickerOpen(!statusPickerOpen)}
          >
            <Text style={styles.statusSelectorText}>{STATUS_LABELS[currentStatus]}</Text>
            <Ionicons
              name={statusPickerOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#9A9088"
            />
          </TouchableOpacity>
          {statusPickerOpen && (
            <View style={styles.statusPicker}>
              {STATUSES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusOption,
                    currentStatus === s && styles.statusOptionActive,
                  ]}
                  onPress={() => handleStatusChange(s)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      currentStatus === s && styles.statusOptionTextActive,
                    ]}
                  >
                    {STATUS_LABELS[s]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Personal Rating */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>我的评分</Text>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((r) => (
              <TouchableOpacity key={r} onPress={() => handleRating(r)}>
                <Ionicons
                  name={personalRating && personalRating >= r ? 'star' : 'star-outline'}
                  size={32}
                  color={personalRating && personalRating >= r ? '#E8A33D' : '#4A433D'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>备注</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="写下你的想法..."
            placeholderTextColor="#6E6560"
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.saveNoteBtn} onPress={handleNoteSave}>
            <Text style={styles.saveNoteBtnText}>保存备注</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

interface PosterItem {
  poster_url?: string | null;
  title: string;
  type?: string | null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E0C' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: { color: '#F5F0E8', fontSize: 17, fontWeight: '600', flex: 1, textAlign: 'center' },
  scrollContent: { paddingBottom: 60 },
  topSection: { flexDirection: 'row', paddingHorizontal: 16, gap: 16, marginBottom: 20 },
  posterWrap: { width: 160, height: 240, borderRadius: 10, overflow: 'hidden' },
  topInfo: { flex: 1, justifyContent: 'center', gap: 6 },
  title: { color: '#F5F0E8', fontSize: 20, fontWeight: '700', fontFamily: 'serif' },
  originalTitle: { color: '#9A9088', fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#9A9088', fontSize: 13 },
  metaDot: { color: '#6E6560' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: '#E8A33D', fontSize: 18, fontWeight: '700' },
  infoCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  infoRow: { flexDirection: 'row', marginBottom: 10 },
  infoLabel: { color: '#9A9088', fontSize: 14, width: 50 },
  infoValue: { color: '#F5F0E8', fontSize: 14, flex: 1 },
  descCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  descTitle: { color: '#9A9088', fontSize: 13, marginBottom: 8 },
  descText: { color: '#D1CCC5', fontSize: 14, lineHeight: 22 },
  vendorCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  vendorList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  vendorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2E2823',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  vendorText: { color: '#E8A33D', fontSize: 13 },
  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  sectionTitle: { color: '#9A9088', fontSize: 13, marginBottom: 10 },
  statusSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2E2823',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusSelectorText: { color: '#F5F0E8', fontSize: 15 },
  statusPicker: { marginTop: 8, gap: 6 },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2E2823',
  },
  statusOptionActive: { backgroundColor: '#E8A33D20', borderWidth: 1, borderColor: '#E8A33D60' },
  statusOptionText: { color: '#9A9088', fontSize: 14 },
  statusOptionTextActive: { color: '#E8A33D', fontSize: 14 },
  ratingStars: { flexDirection: 'row', gap: 6 },
  noteInput: {
    backgroundColor: '#2E2823',
    borderRadius: 8,
    padding: 12,
    color: '#F5F0E8',
    fontSize: 14,
    minHeight: 80,
  },
  saveNoteBtn: {
    marginTop: 10,
    alignSelf: 'flex-end',
    backgroundColor: '#E8A33D',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveNoteBtnText: { color: '#0F0E0C', fontSize: 14, fontWeight: '600' },
});
