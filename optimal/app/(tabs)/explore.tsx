import React, { useState, useEffect } from 'react';
import { StyleSheet,  View, ScrollView, SafeAreaView ,FlatList } from 'react-native';
import { Card, List, Divider, Button, ActivityIndicator, Text, Modal, Portal, Dialog, Provider as PaperProvider, useTheme } from 'react-native-paper';

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
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();
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

// 显示删除确认对话框
const handleDelete = () => {
  if (!selectedRecord) return;
  setDeleteDialogVisible(true);
};
// 确认删除操作
const confirmDelete = async () => {
  try {
    if (selectedRecord) {
      console.log("Deleting record:", selectedRecord.id);
    } else {
      console.error("No record selected for deletion.");
    }
    if (selectedRecord) {
      await deleteRecord(selectedRecord.id);
    }
    setDeleteDialogVisible(false);
    handleBack(); // 返回列表
  } catch (e) {
    console.error("删除记录失败:", e);
    setDeleteDialogVisible(false);
    // 可以使用其他方式显示错误信息
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
          dismissable={true}
          contentContainerStyle={styles.modalContainer}
        >
          <Card style={styles.detailCard}>
            <Card.Title
              title={`Parameters: ${selectedRecord.displayString}`}
              subtitle={`Runtime: ${selectedRecord.executionTime}ms`}
            />
            <Card.Content style={{maxHeight: "80%"}}>
              <Text style={styles.sectionTitle}>
                Sample Pool ({recordDetail.samplePool.length}):
              </Text>
              <Text style={styles.content}>
                {recordDetail.samplePool.join(', ')}
              </Text>
              
              <Text style={styles.sectionTitle}>
                Groups ({recordDetail.groups.length}):
              </Text>
              
              <FlatList
                style={{margin: 10, maxHeight: 200}}
                data={recordDetail.groups}
                keyExtractor={(_, index) => index.toString()}
                renderItem={({ item }) => (
                  <List.Item
                    title={`Group ${item.join(', ')}`}
                    left={props => <List.Icon {...props} icon="format-list-bulleted" />}
                  />
                )}
              />
            </Card.Content>
            <Card.Actions style={styles.buttonGroup}>
              <Button
                mode="contained"
                onPress={handleDelete} 
                style={{margin: 10, flex: 1, backgroundColor: theme.colors.error}}
              >
                Delete
              </Button>
              <Button 
                mode="contained" 
                onPress={handleBack} 
                style={{margin: 10, flex: 1, backgroundColor: theme.colors.secondary}}
              >
                Close
              </Button>
            </Card.Actions>
          </Card>
          <Portal>
            <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)} dismissable={true}>
              <Dialog.Title>Delete Confirmation</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodyMedium">Are you sure you want to delete this record?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={confirmDelete} textColor={theme.colors.error}>Delete</Button>
                <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>
        </Modal>
      </Portal>
    );
  };

  return (
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* 按钮容器 */}
          <View style={styles.buttonContainer}>
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : records.length === 0 ? (
            <Text style={styles.emptyText}>No history record</Text>
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
  );
}

const styles = StyleSheet.create({
  // 保留原有样式...
  modalContainer: {
    margin: 20,
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
  },buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
});
