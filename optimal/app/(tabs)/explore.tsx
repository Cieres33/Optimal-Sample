import React, { useState, useEffect } from 'react';
import { StyleSheet,  View, ScrollView, SafeAreaView, Alert } from 'react-native';
import { Card, List, Divider, Button, ActivityIndicator, Text, Modal, Portal, Provider as PaperProvider } from 'react-native-paper';
import { database } from '../db';

// 导入具体的模型类而不是通用Model
import Record from '../db/models/Record';
import Result from '../db/models/Result';
import {  getRecordDetail, deleteRecord } from '../services/dbService';

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
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [recordDetail, setRecordDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  // 首次加载获取所有记录
  useEffect(() => {
    setLoading(true);
    const sub = database.collections.get<Record>('records').query().observe().subscribe(setRecords)
    setLoading(false);
    return () => sub.unsubscribe();
  }, []);

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
      setModalVisible(true);
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
    setModalVisible(false);
    setSelectedRecord(null);
    setRecordDetail(null);
  };

  // 渲染记录详情界面
  const renderRecordDetail = () => {
    if (!selectedRecord || !recordDetail) return null;
    
    return (
      <Portal>
        <Modal 
          visible={modalVisible}
          onDismiss={handleBack}
          contentContainerStyle={styles.modalContainer}
          dismissable={true}
        >
          <ScrollView
            contentContainerStyle={styles.detailContainer}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.titleContainer}>
              <Button
                mode="outlined"
                icon="arrow-left"
                onPress={handleBack}
                style={styles.backButton}
              >
                Back
              </Button>
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
            </View>
            
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
        </Modal>
      </Portal>
    );
  };

  return (
    <PaperProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* 按钮容器 */}
          <View style={styles.buttonContainer}>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : records.length === 0 ? (
            <Text style={styles.emptyText}>暂无历史记录</Text>
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
          
          {/* 渲染模态框 */}
          {renderRecordDetail()}
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  // 保留原有样式...
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    padding: 20,
    maxHeight: '90%',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: 60,
    marginBottom: 15,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 22,
    lineHeight: 28,
    flexShrink: 1,
  },
  buttonContainer: {
    flexShrink: 0,
  },
  refreshButton: {
    minWidth: 80,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  backButton: {
    marginRight: 10,
  },
  detailContainer: {
    paddingBottom: 40,
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
