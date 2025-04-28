// optimal/app/(tabs)/explore.tsx (部分修改)
import React, { useState, useEffect } from 'react';
import { StyleSheet, FlatList, View, ScrollView, SafeAreaView, Alert } from 'react-native';
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
import { getAllRecords, getRecordDetail, deleteRecord } from '../services/dbService';

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
  const handleDelete = async () => {
    if (!selectedRecord) return;
  
    try {
      // 确认对话框
      Alert.alert(
        "确认删除",
        "确定要删除这条记录吗？",
        [
          { text: "取消", style: "cancel" },
          { 
            text: "确定", 
            onPress: async () => {
              await deleteRecord(selectedRecord.id);
              handleBack(); // 返回列表
              loadRecords(); // 刷新列表
            }
          }
        ]
      );
    } catch (e) {
      console.error("删除记录失败:", e);
      Alert.alert("错误", "删除记录失败");
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
  {/* 文字部分使用独立容器 */}
  <View style={styles.textContainer}>
    <ThemedText 
      type="title" 
      numberOfLines={2}
      style={styles.titleText}
    >
      History Record
    </ThemedText>
  </View>
  
  {/* 按钮容器 */}
  <View style={styles.buttonContainer}>
    <Button
      mode="outlined"
      icon="refresh"
      onPress={handleRefresh}
      style={styles.refreshButton}
      contentStyle={{ height: 40 }}
    >
      Refresh
    </Button>
  </View>
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
                  description={`RunTime: ${item.executionTime}ms`}
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
      <ScrollView 
        contentContainerStyle={styles.detailContainer}
        showsVerticalScrollIndicator={false}
      >
        <ThemedView style={styles.titleContainer}>
          <Button
            mode="outlined"
            icon="arrow-left"
            onPress={handleBack}
            style={styles.backButton}
          >
            Back
          </Button>
          <ThemedText 
            type="title" 
            numberOfLines={2}
            style={styles.titleText}
          >
            Record Detail
          </ThemedText>
                  {/* 删除按钮 */}
        <Button
          mode="contained"
          icon="delete"
          onPress={handleDelete}
          style={styles.headerButton}
          buttonColor="#ff4444"
          textColor="#fff"
        >
          Delete
        </Button>
        </ThemedView>
        
        {detailLoading ? (
          <ActivityIndicator size="large" style={styles.loader} />
        ) : (
          <Card style={styles.detailCard}>
            <Card.Title 
              title={`Parameters: ${selectedRecord.displayString}`}
              subtitle={`Runtime: ${selectedRecord.executionTime}ms`}
            />
            <Card.Content>
              <Text style={styles.sectionTitle}>
                Sample Pool ({recordDetail.samplePool.length}):
              </Text>
              <Text style={styles.content}>
                {recordDetail.samplePool.join(', ')}
              </Text>
              
              <Text style={styles.sectionTitle}>
                Groups ({recordDetail.groups.length}):
              </Text>
              
              <List.Section>
                {recordDetail.groups.map((group, index) => (
                  <List.Item
                    key={index}
                    title={`Group ${index + 1}: ${group.join(', ')}`}
                    left={props => <List.Icon {...props} icon="format-list-bulleted" />}
                  />
                ))}
              </List.Section>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.container}>
      {selectedRecord ? renderRecordDetail() : renderHistoryList()}
    </ScrollView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: 60,
    marginTop:30,
    marginBottom: 15,
    paddingHorizontal: 16, // 增加左右内边距
  },
  textContainer: {
    flex: 1, // 占据剩余空间
    marginRight: 12, // 与按钮间距
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 22,
    lineHeight: 28, // 明确行高
    flexShrink: 1,  // 允许缩小
  },
  buttonContainer: {
    flexShrink: 0,  // 禁止缩小
  },
  refreshButton: {
    minWidth: 80,   // 保证按钮最小宽度
  },
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    marginRight: 10,
  },
  detailContainer: {
    paddingBottom: 40, // 确保底部留白
  },
  listCard: {
    width: '100%',
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  headerButton: {
    minWidth: 90,
    marginHorizontal: 5,
  },
  detailTitle: {
    fontSize: 20,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  detailCard: {
    width: '100%',
    marginBottom: 20,
    marginHorizontal: 0,
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