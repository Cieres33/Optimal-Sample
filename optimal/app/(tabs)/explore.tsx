import { useState, useEffect } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { 
  Text, 
  Card, 
  TouchableRipple, 
  Dialog, 
  Button, 
  ActivityIndicator,
  List
} from 'react-native-paper';
import Record from '../db/models/Record';
import Result from '../db/models/Result';
import { getAllRecords, getRecordDetail } from '../services/dbService';

interface DetailData {
  samplePool: (string | number)[];
  groups: (string | number)[][];
}

export default function ExploreScreen() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [recordDetail, setRecordDetail] = useState<DetailData | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const allRecords = await getAllRecords();
      setRecords(allRecords);
    } catch (e) {
      console.error("加载记录失败:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = async (recordId: string) => {
    try {
      setDialogVisible(true);
      const detail = await getRecordDetail(recordId) as any;
      setSelectedRecord(detail.record);
      setRecordDetail({
        samplePool: detail.result.parsedSamplePool,
        groups: detail.result.parsedGroups
      });
    } catch (e) {
      console.error("获取详情失败:", e);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineMedium" style={styles.title}>
          最优样本选择系统
        </Text>
        <Text variant="titleMedium" style={styles.subtitle}>
          数据库记录
        </Text>

        {loading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : records.length === 0 ? (
          <Text variant="bodyMedium" style={styles.emptyText}>
            暂无历史记录
          </Text>
        ) : (
          records.map((record) => (
            <TouchableRipple 
              key={record.id}
              onPress={() => handleCardPress(record.id)}
              rippleColor="rgba(0, 0, 0, .12)"
            >
              <Card style={styles.card}>
                <Card.Content>
                  <List.Item
                    title={`参数: ${record.displayString}`}
                    description={`运行时间: ${record.executionTime}ms`}
                    left={props => <List.Icon {...props} icon="clock" />}
                    right={props => <List.Icon {...props} icon="chevron-right" />}
                  />
                </Card.Content>
              </Card>
            </TouchableRipple>
          ))
        )}
      </ScrollView>

      <Dialog
        visible={dialogVisible}
        onDismiss={() => setDialogVisible(false)}
        style={styles.dialog}
      >
        <Dialog.Title>记录详情</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            {recordDetail ? (
              <>
                <Text variant="bodyMedium" style={styles.sectionTitle}>
                  样本池 ({recordDetail.samplePool.length}):
                </Text>
                <Text variant="bodyMedium" style={styles.content}>
                  {recordDetail.samplePool.join(', ')}
                </Text>

                <Text variant="bodyMedium" style={styles.sectionTitle}>
                  组合 ({recordDetail.groups.length} 组):
                </Text>

                {recordDetail.groups.map((group, index) => (
                  <List.Item
                    key={index}
                    title={`组 ${index + 1}: ${group.join(', ')}`}
                    left={props => <List.Icon {...props} icon="format-list-numbered" />}
                  />
                ))}
              </>
            ) : (
              <ActivityIndicator size="large" style={styles.loader} />
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={() => setDialogVisible(false)}>关闭</Button>
        </Dialog.Actions>
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
  },
  title: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    color: '#404040',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  dialog: {
    maxHeight: '80%',
    borderRadius: 12,
  },
  scrollArea: {
    maxHeight: 300,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginVertical: 8,
    color: '#2d2d2d',
  },
  content: {
    color: '#444',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 24,
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
    marginTop: 24,
  }
});