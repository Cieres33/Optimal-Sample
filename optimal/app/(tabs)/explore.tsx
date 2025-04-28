// optimal/app/(tabs)/explore.tsx (部分修改)
import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View } from 'react-native';
import { Card, List, Divider, Button, ActivityIndicator, Text } from 'react-native-paper';
// 删除通用Model导入
// import { Model } from '@nozbe/watermelondb';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

// 导入具体的模型类而不是通用Model
import Record from '../db/models/Record';
import Result from '../db/models/Result';
import { getAllRecords, getRecordDetail } from '../services/dbService';

// 定义接口类型
interface DetailData {
  samplePool: (string | number)[];
  groups: (string | number)[][];
}

// 定义返回类型接口
interface RecordDetail {
  record: Record;
  result: Result;
}

export default function ExploreScreen() {
  // 使用具体模型类型
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [recordDetail, setRecordDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

   // 首次加载获取所有记录
   useEffect(() => {
    loadRecords();
  }, []);

  // 加载所有记录
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

  // 查看记录详情
  const handleViewRecord = async (recordId: string) => {
    try {
      setDetailLoading(true);
      const detail = await getRecordDetail(recordId) as RecordDetail;
      setSelectedRecord(detail.record);
      setRecordDetail({
        samplePool: detail.result.parsedSamplePool,
        groups: detail.result.parsedGroups
      });
    } catch (e) {
      console.error("获取记录详情失败:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  // 返回记录列表
  const handleBack = () => {
    setSelectedRecord(null);
    setRecordDetail(null);
  };

  // 刷新记录列表
  const handleRefresh = () => {
    loadRecords();
  };

  // 渲染历史记录界面
  const renderHistoryList = () => (
    <>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">历史记录</ThemedText>
        <Button
          mode="outlined"
          icon="refresh"
          onPress={handleRefresh}
          style={styles.refreshButton}
        >
          刷新
        </Button>
      </ThemedView>
      
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : records.length === 0 ? (
        <ThemedText style={styles.emptyText}>暂无历史记录</ThemedText>
      ) : (
          <Card style={styles.listCard}>
            {records.map((item, index) => (
              <React.Fragment key={item.id}>
                <List.Item
                  title={`#${index + 1}: ${item.displayString}`}
                  description={`运行时间: ${item.executionTime}ms`}
                  onPress={() => handleViewRecord(item.id)}
                  left={p => <List.Icon {...p} icon="history" />}
                  right={p => <List.Icon {...p} icon="chevron-right" />}
                />
                {index < records.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </Card>
      )}
    </>
  );

  // 渲染记录详情界面
  const renderRecordDetail = () => {
    if (!selectedRecord || !recordDetail) return null;
    
    return (
      <>
        <ThemedView style={styles.titleContainer}>
          <Button
            mode="outlined"
            icon="arrow-left"
            onPress={handleBack}
            style={styles.backButton}
          >
            返回
          </Button>
          <ThemedText type="title">记录详情</ThemedText>
        </ThemedView>
        
        {detailLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <Card style={styles.detailCard}>
            <Card.Title 
              title={`参数: ${selectedRecord.displayString}`}
              subtitle={`运行时间: ${selectedRecord.executionTime}ms`}
            />
            <Card.Content>
              <Text style={styles.sectionTitle}>
                样本池 ({recordDetail.samplePool.length}):
              </Text>
              <Text style={styles.content}>
                {recordDetail.samplePool.join(', ')}
              </Text>
              
              <Text style={styles.sectionTitle}>
                组合 ({recordDetail.groups.length} 组):
              </Text>
              
              <List.Section>
                {recordDetail.groups.map((group, index) => (
                  <List.Item
                    key={index}
                    title={`组 ${index + 1}: ${group.join(', ')}`}
                    left={props => <List.Icon {...props} icon="format-list-bulleted" />}
                  />
                ))}
              </List.Section>
            </Card.Content>
          </Card>
        )}
      </>
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="archivebox.fill"
          style={styles.headerImage}
        />
      }>
      {selectedRecord ? renderRecordDetail() : renderHistoryList()}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  backButton: {
    marginRight: 10,
  },
  refreshButton: {
    marginLeft: 10,
  },
  listCard: {
    width: '100%',
    marginBottom: 20,
  },
  detailCard: {
    width: '100%',
    marginBottom: 20,
  },
  loader: {
    marginVertical: 30,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#757575',
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
  },
  content: {
    marginBottom: 10,
  }
});