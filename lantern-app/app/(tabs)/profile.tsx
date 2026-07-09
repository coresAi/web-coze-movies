import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import {
  getFavorites,
  getStats,
  importFavorites,
  STATUS_LABELS,
  STATUSES,
} from '@/src/lib/storage';

export default function ProfileScreen() {
  const [stats, setStats] = useState(getStats());
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setStats(getStats());
  }, [refresh]);

  const handleExport = useCallback(async () => {
    const favs = getFavorites();
    if (favs.length === 0) {
      Alert.alert('暂无数据', '请先添加影视到收藏列表');
      return;
    }
    try {
      const json = JSON.stringify(favs, null, 2);
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const filename = `灯箱收藏_${dateStr}.json`;
      const file = new File(Paths.cache, filename);
      const writer = file.writableStream().getWriter();
      await writer.write(new TextEncoder().encode(json));
      await writer.close();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: '导出收藏数据',
        });
      } else {
        Alert.alert('提示', '当前设备不支持分享功能');
      }
    } catch (e: any) {
      Alert.alert('导出失败', e.message || '未知错误');
    }
  }, []);

  const handleImport = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const fileAsset = result.assets?.[0];
      if (!fileAsset?.uri) return;
      const file = new File(fileAsset.uri);
      const content = await file.text();
      const data = JSON.parse(content);
      if (!Array.isArray(data)) {
        Alert.alert('格式错误', '文件格式不正确，需要 JSON 数组');
        return;
      }
      const count = importFavorites(data);
      Alert.alert('导入成功', `共导入 ${count} 条收藏记录`);
      setRefresh((r) => r + 1);
    } catch (e: any) {
      Alert.alert('导入失败', e.message || '未知错误');
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            {STATUSES.map((s) => (
              <View key={s} style={styles.statItem}>
                <Text style={styles.statNum}>{stats.statusBreakdown[s] ?? 0}</Text>
                <Text style={styles.statLabel}>{STATUS_LABELS[s]}</Text>
              </View>
            ))}
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statRowExtra}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLabel}>总计</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats.withRating}</Text>
              <Text style={styles.statLabel}>已评分</Text>
            </View>
            {stats.avgRating > 0 && (
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{stats.avgRating.toFixed(1)}</Text>
                <Text style={styles.statLabel}>均分</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={22} color="#E8A33D" />
            <Text style={styles.actionBtnText}>导出数据</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={handleImport}>
            <Ionicons name="cloud-upload-outline" size={22} color="#E8A33D" />
            <Text style={styles.actionBtnText}>导入数据</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>灯箱收藏</Text>
          <Text style={styles.aboutSub}>
            复古私人影院 · 你的观影记录本
          </Text>
          <Text style={styles.aboutNote}>
            数据安全存储在你的设备中，不会上传至云端。
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0E0C' },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#F5F0E8',
    fontSize: 26,
    fontFamily: 'serif',
    fontWeight: '600',
  },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 16 },
  statsCard: {
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 4 },
  statNum: { color: '#E8A33D', fontSize: 28, fontWeight: '700' },
  statLabel: { color: '#9A9088', fontSize: 13 },
  statDivider: {
    height: 1,
    backgroundColor: '#2E2823',
    marginVertical: 16,
  },
  statRowExtra: { flexDirection: 'row', justifyContent: 'space-around' },
  actionsCard: {
    backgroundColor: '#1C1814',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  actionBtnText: { color: '#F5F0E8', fontSize: 16 },
  actionDivider: {
    height: 1,
    backgroundColor: '#2E2823',
    marginLeft: 50,
  },
  aboutCard: {
    backgroundColor: '#1C1814',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#2E2823',
  },
  aboutTitle: {
    color: '#F5F0E8',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  aboutSub: { color: '#9A9088', fontSize: 14 },
  aboutNote: { color: '#6E6560', fontSize: 12, textAlign: 'center' },
});
